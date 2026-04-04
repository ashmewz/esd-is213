import uuid

from flask import Blueprint, jsonify, request

from temp_data import event_by_id, events, seats

event_bp = Blueprint("events", __name__)

ALLOWED_SEAT_STATUSES = frozenset({"available", "held", "sold", "blocked", "removed"})


def _seat_response(seat: dict) -> dict:
    status = seat["status"]
    if isinstance(status, str):
        status = status.lower()

    return {
        "seatId": seat["seatId"],
        "eventId": seat["eventId"],
        "seatLabel": seat["seatLabel"],
        "sectionNo": seat["sectionNo"],
        "rowNo": seat["rowNo"],
        "seatNo": seat["seatNo"],
        "tier": seat["tier"],
        "basePrice": float(seat["basePrice"]),
        "status": status,
    }


def _seat_status_update_data(seat: dict) -> dict:
    """Payload shape for PUT .../status (composite / Scenario A)."""
    status = seat["status"]
    if isinstance(status, str):
        status = status.lower()

    return {
        "seatId": seat["seatId"],
        "eventId": seat["eventId"],
        "tier": seat["tier"],
        "sectionNo": seat["sectionNo"],
        "rowNo": seat["rowNo"],
        "seatNo": seat["seatNo"],
        "basePrice": float(seat["basePrice"]),
        "status": status,
    }


@event_bp.route("/")
def hello():
    return "Hello from events service"


@event_bp.route("/events")
def list_events():
    return jsonify(events), 200


@event_bp.route("/events", methods=["POST"])
def create_event():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    required_fields = ["venueId", "name", "date", "seatmap", "status"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    new_event = {
        "eventId": str(uuid.uuid4()),
        "venueId": data["venueId"],
        "name": data["name"],
        "date": data["date"],
        "seatmap": data["seatmap"],
        "status": data["status"],
    }
    events.append(new_event)
    return jsonify(new_event), 201


@event_bp.route("/events/<event_id>")
def get_event(event_id):
    event = event_by_id(event_id)
    if event is None:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(event), 200


@event_bp.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    event = event_by_id(event_id)
    if event is None:
        return jsonify({"error": "Event not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    updatable_fields = ["venueId", "name", "date", "seatmap", "status"]
    for field in updatable_fields:
        if field in data:
            event[field] = data[field]

    return jsonify(event), 200


@event_bp.route("/events/<event_id>/seats")
def list_seats_for_event(event_id):
    if event_by_id(event_id) is None:
        return jsonify({"error": "Event not found"}), 404

    event_seats = [s for s in seats if s["eventId"] == event_id]
    return jsonify([_seat_response(s) for s in event_seats]), 200


@event_bp.route("/events/<event_id>/seats/<seat_id>")
def get_seat(event_id, seat_id):
    if event_by_id(event_id) is None:
        return jsonify({"error": "Event not found"}), 404

    for s in seats:
        if s["seatId"] == seat_id and s["eventId"] == event_id:
            return jsonify(_seat_response(s)), 200

    return jsonify({"error": "Seat not found"}), 404


@event_bp.route("/events/<event_id>/seats/<seat_id>/status", methods=["PUT"])
def update_seat_status(event_id, seat_id):
    if event_by_id(event_id) is None:
        return jsonify({"error": "Event not found"}), 404

    seat = None
    for s in seats:
        if s["seatId"] == seat_id and s["eventId"] == event_id:
            seat = s
            break

    if seat is None:
        return jsonify({"error": "Seat not found"}), 404

    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    if "status" not in payload:
        return jsonify({"error": "status is required"}), 400

    raw = payload["status"]
    if raw is None or not isinstance(raw, str) or not raw.strip():
        return jsonify({"error": "status must be a non-empty string"}), 400

    normalized = raw.strip().lower()
    if normalized not in ALLOWED_SEAT_STATUSES:
        return (
            jsonify(
                {
                    "error": "Invalid status.",
                    "allowed": sorted(ALLOWED_SEAT_STATUSES),
                }
            ),
            400,
        )

    seat["status"] = normalized
    return (
        jsonify(
            {
                "message": "Seat status updated successfully.",
                "data": _seat_status_update_data(seat),
            }
        ),
        200,
    )