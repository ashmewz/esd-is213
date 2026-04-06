import uuid
from flask import Flask, jsonify
from app.routes.event_routes import event_bp
from app.core.database import SessionLocal
from app.models.events_models import Event, Seat

def create_app():
    app = Flask(__name__)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    app.register_blueprint(event_bp)

    return app
