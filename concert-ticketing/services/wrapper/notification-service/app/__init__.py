from flask import Flask, jsonify


def create_app():
    app = Flask(__name__)
    app.config.from_object("config")

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    return app
