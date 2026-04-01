from flask import Flask, jsonify
from app.routes.swap_routes import swap_bp

app = Flask(__name__)

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

app.register_blueprint(swap_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)