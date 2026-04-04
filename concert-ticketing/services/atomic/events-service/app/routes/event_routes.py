from datetime import datetime

from flask import Blueprint, jsonify, request
from app.core.database import SessionLocal
from app.models.events_models import Event, EventShowtime, EventVisualSection, Seat

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


def _showtime_response(showtime: EventShowtime) -> dict:
    return {
        "showtimeId": str(showtime.showtime_id),
        "eventId": str(showtime.event_id),
        "dateId": showtime.date_id.isoformat() if showtime.date_id else None,
        "label": showtime.label,
        "times": showtime.times or [],
    }


def _event_response(db, event: Event) -> dict:
    payload = event.to_dict()
    showtimes = (
        db.query(EventShowtime)
        .filter_by(event_id=event.event_id)
        .order_by(EventShowtime.date_id.asc())
        .all()
    )
    payload["dates"] = [_showtime_response(showtime) for showtime in showtimes]
    return payload


def _normalize_times(times) -> list[str]:
    if not isinstance(times, list):
        return []
    return [str(time).strip() for time in times if str(time).strip()]


def _extract_showtime_payloads(payload: dict) -> list[dict]:
    raw_dates = payload.get("dates")
    if not isinstance(raw_dates, list):
        return []

    showtimes = []
    for item in raw_dates:
        if not isinstance(item, dict):
            continue
        date_id = str(item.get("dateId") or "").strip()
        label = str(item.get("label") or "").strip()
        times = _normalize_times(item.get("times"))
        if not date_id or not label:
            continue
        try:
            parsed_date = datetime.strptime(date_id, "%Y-%m-%d").date()
        except ValueError:
            continue
        showtimes.append(
            {
                "date_id": parsed_date,
                "label": label,
                "times": times,
            }
        )
    return showtimes


def _derive_event_datetime(payload: dict, showtimes: list[dict]) -> tuple[datetime | None, str]:
    event_timing = ""

    if showtimes:
        first = showtimes[0]
        if first["times"]:
            event_timing = first["times"][0]
        return datetime.combine(first["date_id"], datetime.min.time()), event_timing

    raw_event_date = str(payload.get("eventDate") or "").strip()
    if raw_event_date:
        try:
            parsed = datetime.fromisoformat(raw_event_date.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=None), str(payload.get("eventTiming") or "").strip()
        except ValueError:
            pass

    return None, str(payload.get("eventTiming") or "").strip()


def _apply_event_payload(event: Event, payload: dict) -> list[dict]:
    showtimes = _extract_showtime_payloads(payload)
    event_datetime, event_timing = _derive_event_datetime(payload, showtimes)
    if event_datetime is None:
        raise ValueError("At least one valid date is required.")

    event.name = str(payload.get("name") or "").strip()
    event.venue_name = str(payload.get("venueName") or "").strip() or None
    event.event_date = event_datetime
    event.event_timing = event_timing
    event.event_date_display = str(payload.get("date") or "").strip() or event_datetime.strftime("%Y-%m-%d")
    event.status = str(payload.get("status") or "active").strip().lower() or "active"
    event.image_url = str(payload.get("imageUrl") or "").strip() or None
    event.seatmap = payload.get("seatmap")
    event.min_price = payload.get("minPrice")
    return showtimes


@event_bp.route("/")
def hello():
    return "Hello from events service"


@event_bp.route("/events")
def list_events():
    db = SessionLocal()
    try:
        include_deleted = str(request.args.get("includeDeleted", "")).lower() in {"1", "true", "yes"}
        query = db.query(Event)
        if not include_deleted:
            query = query.filter(Event.status != "deleted")
        events = query.all()
        return jsonify([_event_response(db, event) for event in events]), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>")
def get_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        return jsonify(_event_response(db, event)), 200
    finally:
        db.close()


@event_bp.route("/events", methods=["POST"])
def create_event():
    db = SessionLocal()
    try:
        payload = request.get_json(silent=True) or {}
        event = Event()
        showtimes = _apply_event_payload(event, payload)

        if not event.name:
            return jsonify({"error": "name is required"}), 400

        db.add(event)
        db.flush()

        for showtime in showtimes:
            db.add(
                EventShowtime(
                    event_id=event.event_id,
                    date_id=showtime["date_id"],
                    label=showtime["label"],
                    times=showtime["times"],
                )
            )

        db.commit()
        db.refresh(event)
        return jsonify(_event_response(db, event)), 201
    except ValueError as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 400
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        payload = request.get_json(silent=True) or {}
        showtimes = _apply_event_payload(event, payload)
        if not event.name:
            return jsonify({"error": "name is required"}), 400

        db.query(EventShowtime).filter_by(event_id=event.event_id).delete()
        for showtime in showtimes:
            db.add(
                EventShowtime(
                    event_id=event.event_id,
                    date_id=showtime["date_id"],
                    label=showtime["label"],
                    times=showtime["times"],
                )
            )

        db.commit()
        db.refresh(event)
        return jsonify(_event_response(db, event)), 200
    except ValueError as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 400
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        event.status = "deleted"
        db.commit()
        return jsonify({"message": "Event deleted", "data": _event_response(db, event)}), 200
    except Exception:
        db.rollback()
        raise
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
        if seat.status.lower() != "available":
            return jsonify({"error": "Seat is not available"}), 409
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
