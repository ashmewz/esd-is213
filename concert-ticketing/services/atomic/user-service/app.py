from flask import Flask, jsonify
from app.routes.user_routes import user_bp
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


app.register_blueprint(user_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)