from flask import Flask
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)

    # Import models so SQLAlchemy metadata is registered.
    from app.models import order_models  # noqa: F401
    from app.routes.order_routes import order_bp

    app.register_blueprint(order_bp)

    # db.create_all() is for local/dev convenience; production typically uses migrations.
    with app.app_context():
        db.create_all()

    # Scenario B choreography: listen for seat reassignment and refund events
    from app.messaging.consumer import start_consumer_thread
    start_consumer_thread()

    return app
