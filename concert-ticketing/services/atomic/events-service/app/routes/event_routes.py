from flask import Blueprint, jsonify, request
from app.core.database import get_db
from app.models.events_models import Event, Seat

event_bp = Blueprint("events", __name__)


@event_bp.route("/events")
def list_events():
    db = next(get_db())
    try:
        events = db.query(Event).all()
        return jsonify([e.to_dict() for e in events]), 200
    finally:
        db.close()


@event_bp.route("/events", methods=["POST"])
def create_event():
    db = next(get_db())
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        required_fields = ["name", "eventDate", "status"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        event = Event(
            name=data["name"],
            event_date=data["eventDate"],
            status=data.get("status", "ACTIVE"),
            venue_id=data.get("venueId"),
            venue_name=data.get("venueName"),
            event_timing=data.get("eventTiming", ""),
            image_url=data.get("imageUrl"),
            dates=data.get("dates"),
            seatmap_version=data.get("seatmapVersion", 1),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return jsonify(event.to_dict()), 201
    finally:
        db.close()


@event_bp.route("/events/<event_id>")
def get_event(event_id):
    db = next(get_db())
    try:
        event = db.query(Event).filter(Event.event_id == event_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404
        return jsonify(event.to_dict()), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    db = next(get_db())
    try:
        event = db.query(Event).filter(Event.event_id == event_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        for field, col in [
            ("name", "name"), ("status", "status"), ("venueId", "venue_id"),
            ("venueName", "venue_name"), ("imageUrl", "image_url"), ("dates", "dates"),
            ("seatmapVersion", "seatmap_version"), ("eventDate", "event_date"),
        ]:
            if field in data:
                setattr(event, col, data[field])

        db.commit()
        db.refresh(event)
        return jsonify(event.to_dict()), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    db = next(get_db())
    try:
        event = db.query(Event).filter(Event.event_id == event_id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404
        db.delete(event)
        db.commit()
        return jsonify({"message": "Event deleted"}), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats")
def list_seats(event_id):
    db = next(get_db())
    try:
        seats = db.query(Seat).filter(Seat.event_id == event_id).all()
        return jsonify([s.to_dict() for s in seats]), 200
    finally:
        db.close()
