from app import create_app
from app.messaging.consumer import start_consumer_thread

app = create_app()
start_consumer_thread()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
