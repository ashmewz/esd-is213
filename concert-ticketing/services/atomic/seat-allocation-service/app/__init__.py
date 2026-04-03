from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)

    from app.models.seat_allocation_models import Hold, SeatAssignment, ReallocationLog  # noqa: F401
    from app.routes.hold_routes import hold_bp

    app.register_blueprint(hold_bp)

    return app
