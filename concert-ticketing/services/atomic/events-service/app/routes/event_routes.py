from flask import Blueprint, jsonify, request
from app.core.database import SessionLocal
from app.models.events_models import Event, Seat

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
