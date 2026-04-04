"""
New route: PUT /events/{eventId}/seatmap
Scenario B Step B2: Admin updates the seat map.
Persists the new version, marks affected seats, and publishes SeatMapChanged.

Add this blueprint to your event-service app factory:
    from app.routes.seatmap_routes import seatmap_bp
    app.register_blueprint(seatmap_bp)
"""
from flask import Blueprint, jsonify, request
from app.core.database import SessionLocal
from app.models.events_models import Event, Seat
from app.messaging.producer import publish_event

seatmap_bp = Blueprint("seatmap", __name__)

EXCHANGE = "concert_ticketing"
ALLOWED_ACTIONS = frozenset({"REMOVE", "REMAP", "BLOCK"})


@seatmap_bp.route("/events/<event_id>/seatmap", methods=["PUT"])
def update_seatmap(event_id):
    """
    Scenario B Step B2.

    Request body:
    {
        "seatmapVersion": 2,
        "changes": [
            { "seatId": "...", "action": "REMOVE" },
            { "seatId": "...", "action": "REMAP", "newSeatId": "..." }
        ]
    }

    - Increments event.seatmap_version.
    - Marks affected seats as 'removed' or 'blocked' as appropriate.
    - Publishes SeatMapChanged to RabbitMQ (Step B4).
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Request body is required."}), 400

    changes = payload.get("changes")
    if not isinstance(changes, list) or len(changes) == 0:
        return jsonify({"error": "changes must be a non-empty list."}), 400

    db = SessionLocal()
    try:
        event = db.get(Event, event_id)
        if not event:
            return jsonify({"error": "Event not found."}), 404

        affected_seat_ids = []
        errors = []

        for change in changes:
            seat_id = change.get("seatId")
            action = (change.get("action") or "").upper()

            if not seat_id:
                errors.append("A change entry is missing seatId.")
                continue
            if action not in ALLOWED_ACTIONS:
                errors.append(f"Invalid action '{action}' for seat {seat_id}.")
                continue

            seat = (
                db.query(Seat)
                .filter_by(event_id=event_id, seat_id=seat_id)
                .first()
            )
            if not seat:
                errors.append(f"Seat {seat_id} not found for this event.")
                continue

            if action == "REMOVE":
                seat.status = "removed"
                affected_seat_ids.append(seat_id)

            elif action == "BLOCK":
                seat.status = "blocked"
                affected_seat_ids.append(seat_id)

            elif action == "REMAP":
                new_seat_id = change.get("newSeatId")
                if not new_seat_id:
                    errors.append(f"REMAP action for seat {seat_id} is missing newSeatId.")
                    continue
                # Mark old seat as removed; new seat should already exist in DB
                seat.status = "removed"
                affected_seat_ids.append(seat_id)

        if errors:
            db.rollback()
            return jsonify({"error": "One or more changes failed.", "details": errors}), 400

        # P2 FIX: Increment seatmap_version on every successful update
        new_version = (event.seatmap_version or 1) + 1
        event.seatmap_version = new_version

        db.commit()

        # Step B4: Publish SeatMapChanged so downstream services react
        if affected_seat_ids:
            publish_event(EXCHANGE, "seatmap.changed", {
                "eventId": event_id,
                "seatmapVersion": new_version,
                "affectedSeatIds": affected_seat_ids,
            })

        return jsonify({
            "message": "Seat map updated successfully.",
            "data": {
                "eventId": event_id,
                "seatmapVersion": new_version,
                "affectedSeatIds": affected_seat_ids,
            },
        }), 200

    except Exception as exc:
        db.rollback()
        return jsonify({"error": "Internal server error.", "detail": str(exc)}), 500
    finally:
        db.close()