from flask import Flask
from app.database import init_db
from app.messaging.consumer import start_consumer_thread
from app.routes import notifications_bp

flask_app = Flask(__name__)
flask_app.register_blueprint(notifications_bp)

init_db()
start_consumer_thread()


@flask_app.route("/health")
def health():
    return {"status": "ok"}, 200


if __name__ == "__main__":
    flask_app.run(host="0.0.0.0", port=5000)
