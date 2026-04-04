import copy
import uuid

from flask import Blueprint, jsonify, request

from app.messaging.seatmap_publisher import publish_seatmap_changed
from temp_data import compute_seats_after_seatmap_changes, event_by_id, events, seats

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
        "seatmapVersion": int(data.get("seatmapVersion", 1)),
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


def _ordered_unique_seat_ids(changes: list) -> list:
    seen = set()
    out = []
    for ch in changes:
        sid = ch.get("seatId")
        if not isinstance(sid, str) or sid in seen:
            continue
        seen.add(sid)
        out.append(sid)
    return out


@event_bp.route("/events/<event_id>/seatmap", methods=["PUT"])
def update_event_seatmap(event_id):
    event = event_by_id(event_id)
    if event is None:
        return jsonify({"error": "Event not found"}), 404

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    if "seatmapVersion" not in data:
        return jsonify({"error": "seatmapVersion is required"}), 400
    new_version = data["seatmapVersion"]
    if type(new_version) is not int:
        return jsonify({"error": "seatmapVersion must be an integer"}), 400
    if new_version < 1:
        return jsonify({"error": "seatmapVersion must be at least 1"}), 400

    current_version = int(event.get("seatmapVersion", 1))
    if new_version <= current_version:
        return (
            jsonify(
                {
                    "error": "seatmapVersion must be greater than the current version",
                    "currentSeatmapVersion": current_version,
                }
            ),
            409,
        )

    if "changes" not in data:
        return jsonify({"error": "changes is required"}), 400
    changes = data["changes"]
    if not isinstance(changes, list):
        return jsonify({"error": "changes must be an array"}), 400

    affected_seat_ids = _ordered_unique_seat_ids(changes)

    try:
        new_seat_list = compute_seats_after_seatmap_changes(event_id, changes)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    payload = {
        "eventId": event_id,
        "seatmapVersion": new_version,
        "affectedSeatIds": affected_seat_ids,
    }

    seats_backup = copy.deepcopy(seats)
    version_backup = int(event.get("seatmapVersion", 1))
    try:
        seats[:] = new_seat_list
        event["seatmapVersion"] = new_version
        publish_seatmap_changed(payload)
    except Exception:
        seats[:] = seats_backup
        event["seatmapVersion"] = version_backup
        return jsonify({"error": "Failed to publish seatmap.changed event"}), 503

    return (
        jsonify(
            {
                "eventId": event_id,
                "seatmapVersion": new_version,
                "affectedSeatIds": affected_seat_ids,
                "status": "updated",
            }
        ),
        200,
    )
