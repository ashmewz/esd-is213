from flask import Blueprint, jsonify

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
    seat = next(
        (
            s
            for s in seats
            if s["seatId"] == seat_id and s["eventId"] == event_id
        ),
        None,
    )
    if not seat:
        return jsonify({"error": "Seat not found"}), 404
    return jsonify(_seat_response(seat)), 200
