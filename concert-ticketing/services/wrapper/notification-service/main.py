from flask import Flask

flask_app = Flask(__name__)

start_consumer_thread()

@flask_app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    flask_app.run(host="0.0.0.0", port=5000)
