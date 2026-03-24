from flask import Flask
from app.routes.swap_routes import swap_bp

app = Flask(__name__)

app.register_blueprint(swap_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)