from flask import Flask, jsonify
from app.routes.swap_orchestration_routes import swap_orchestration_bp

app = Flask(__name__)

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

app.register_blueprint(swap_orchestration_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)