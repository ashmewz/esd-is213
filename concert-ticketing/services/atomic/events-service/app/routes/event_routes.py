import uuid

from flask import Blueprint, jsonify, request

from temp_data import event_by_id, events, seats

event_bp = Blueprint("events", __name__)


def _seat_response(seat: dict) -> dict:
    return {
        "seatId": seat["seatId"],
        "eventId": seat["eventId"],
        "seatLabel": seat["seatLabel"],
        "sectionNo": seat["sectionNo"],
        "rowNo": seat["rowNo"],
        "seatNo": seat["seatNo"],
        "tier": seat["tier"],
        "price": float(seat["basePrice"]),
        "status": seat["status"],
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
