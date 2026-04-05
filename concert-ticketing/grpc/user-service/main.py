from flask import Flask, jsonify
import threading
from app.grpc_server.user_grpc_server import serve_grpc  # assuming your gRPC server is implemented here
from app.routes.user_routes import user_bp  # your user routes blueprint

# Start the gRPC server in a separate thread
def start_grpc_server():
    serve_grpc()

grpc_thread = threading.Thread(target=start_grpc_server, daemon=True)
grpc_thread.start()

# Initialize the Flask app
app = Flask(__name__)

# Health check route
@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

# Register the Blueprint for user routes
app.register_blueprint(user_bp)

# Gunicorn expects this entry point for the Flask app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)