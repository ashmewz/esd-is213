from flask import Flask
from app.messaging.consumer import start_consumer_thread

app = Flask(__name__)

# Start RabbitMQ consumer in background when service starts
start_consumer_thread()


@app.route("/health")
def health():
    return {"status": "ok"}, 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
