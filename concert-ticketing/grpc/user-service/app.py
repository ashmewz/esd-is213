import threading
from app.grpc_server.user_grpc_server import serve_grpc

from flask import Flask, jsonify
from app.routes.user_routes import user_bp

app = Flask(__name__)

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

app.register_blueprint(user_bp)

threading.Thread(target=serve_grpc, daemon=True).start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)