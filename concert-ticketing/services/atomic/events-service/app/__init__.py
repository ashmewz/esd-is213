from flask import Flask

from app.routes.event_routes import event_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    app.register_blueprint(event_bp)

    return app
