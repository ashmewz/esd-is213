from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)

    from app.models import payment_models  # noqa: F401
    from app.routes.payment_routes import payment_bp

    app.register_blueprint(payment_bp)

    with app.app_context():
        db.create_all()

    # Start RabbitMQ consumer for Scenario B (RefundRequired events)
    from app.messaging.consumer import start_consumer
    start_consumer(app)

    return app
