from flask import Blueprint, jsonify, request
from app.core.database import SessionLocal
from app.models.events_models import Event, Seat
from app.messaging.producer import publish_event

event_bp = Blueprint("events", __name__)

ALLOWED_SEAT_STATUSES = frozenset({"available", "held", "sold", "blocked", "removed"})


def _seat_response(seat: Seat) -> dict:
    return {
        "seatId": str(seat.seat_id),
        "eventId": str(seat.event_id),
        "sectionNo": int(seat.section_no) if seat.section_no is not None else None,
        "rowNo": int(seat.row_no) if seat.row_no is not None else None,
        "seatNo": int(seat.seat_no) if seat.seat_no is not None else None,
        "tier": seat.tier,
        "basePrice": float(seat.base_price),
        "status": seat.status.lower() if seat.status else "available",
    }


@event_bp.route("/")
def hello():
    return "Hello from events service"


@event_bp.route("/events")
def list_events():
    db = SessionLocal()
    try:
        events = db.query(Event).all()
        return jsonify([e.to_dict() for e in events]), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>")
def get_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        return jsonify(event.to_dict()), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats")
def list_seats_for_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        seats = db.query(Seat).filter_by(event_id=event_id).all()
        return jsonify([_seat_response(s) for s in seats]), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats/<seat_id>")
def get_seat(event_id, seat_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        seat = db.query(Seat).filter_by(seat_id=seat_id, event_id=event_id).first()
        if seat is None:
            return jsonify({"error": "Seat not found"}), 404
        return jsonify(_seat_response(seat)), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats/<seat_id>/status", methods=["PUT"])
def update_seat_status(event_id, seat_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        seat = db.query(Seat).filter_by(seat_id=seat_id, event_id=event_id).first()
        if seat is None:
            return jsonify({"error": "Seat not found"}), 404

        payload = request.get_json(silent=True)
        if not payload or "status" not in payload:
            return jsonify({"error": "status is required"}), 400

        normalized = payload["status"].strip().lower()
        if normalized not in ALLOWED_SEAT_STATUSES:
            return jsonify({"error": "Invalid status.", "allowed": sorted(ALLOWED_SEAT_STATUSES)}), 400

        seat.status = normalized
        db.commit()
        return jsonify({"message": "Seat status updated successfully.", "data": _seat_response(seat)}), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seatmap", methods=["PUT"])
def update_seatmap(event_id):
    """Scenario B: Admin marks specific seats as removed, triggering choreography."""
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        removed_seat_ids = data.get("removedSeatIds", [])
        if not isinstance(removed_seat_ids, list) or len(removed_seat_ids) == 0:
            return jsonify({"error": "removedSeatIds must be a non-empty array"}), 400

        # Mark removed seats as "removed" in DB
        removed = []
        for seat_id in removed_seat_ids:
            seat = db.query(Seat).filter_by(seat_id=seat_id, event_id=event_id).first()
            if seat:
                seat.status = "removed"
                removed.append(str(seat.seat_id))

        # Bump seatmap version
        event.seatmap_version = (event.seatmap_version or 1) + 1
        db.commit()

        # Find all remaining available seats to offer for reassignment
        available_seats = db.query(Seat).filter_by(
            event_id=event_id, status="available"
        ).all()
        available_seat_ids = [str(s.seat_id) for s in available_seats]

        # Publish choreography event for seat-allocation to consume
        try:
            publish_event("seat.map.changed", {
                "eventId": event_id,
                "seatmapVersion": event.seatmap_version,
                "removedSeatIds": removed,
                "availableSeatIds": available_seat_ids,
            })
        except Exception as e:
            print(f"[!] Failed to publish seat.map.changed: {e}")

        return jsonify({
            "message": "Seatmap updated.",
            "eventId": event_id,
            "seatmapVersion": event.seatmap_version,
            "removedSeats": removed,
            "availableSeats": len(available_seat_ids),
        }), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
