from flask import Flask
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)

    # Import models so SQLAlchemy metadata is registered.
    from app.models import seat_allocation_models  # noqa: F401
    from app.routes.hold_routes import hold_bp

    app.register_blueprint(hold_bp)

    # Local development convenience: create tables at startup.
    with app.app_context():
        db.create_all()

    return app
