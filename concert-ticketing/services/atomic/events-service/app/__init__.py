import uuid
from flask import Flask, jsonify
from app.routes.event_routes import event_bp
from app.core.database import SessionLocal
from app.models.events_models import Event, Seat


def _seed_db():
    """Insert temp_data into DB on startup if tables are empty."""
    from temp_data import events as temp_events, generate_seats

    db = SessionLocal()
    try:
        if db.query(Event).count() > 0:
            return  # already seeded

        for e in temp_events:
            db.add(Event(
                event_id=uuid.UUID(e["eventId"]),
                venue_id=uuid.UUID(e["venueId"]),
                venue_name=e.get("venueName"),
                name=e["name"],
                event_date=__import__("datetime").datetime.strptime(e["date"], "%Y-%m-%d"),
                event_timing=e.get("eventTiming", ""),
                event_date_display=e["date"],
                status=e.get("status", "active"),
                seatmap=e.get("seatmap"),
                image_url=e.get("imageUrl"),
            ))

        db.flush()

        for s in generate_seats(temp_events):
            db.add(Seat(
                seat_id=uuid.UUID(s["seatId"]),
                event_id=uuid.UUID(s["eventId"]),
                tier=s["tier"],
                section_no=s["sectionNo"],
                row_no=s["rowNo"],
                seat_no=s["seatNo"],
                base_price=s["basePrice"],
                status="available",
            ))

        db.commit()
        print("[seed] Events and seats inserted into DB.")
    except Exception as e:
        db.rollback()
        print(f"[seed] Seeding failed: {e}")
    finally:
        db.close()


def create_app():
    app = Flask(__name__)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    app.register_blueprint(event_bp)

    _seed_db()

    return app
