from flask import Flask, jsonify
from flask_cors import CORS
from app.routes.event_routes import event_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    app.register_blueprint(event_bp)

    return app
