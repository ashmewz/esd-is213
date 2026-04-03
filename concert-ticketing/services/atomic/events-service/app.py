from flask import Flask, jsonify
from flask_cors import CORS
from app.routes.event_routes import event_bp

app = Flask(__name__)
CORS(app)
app.register_blueprint(event_bp)

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)