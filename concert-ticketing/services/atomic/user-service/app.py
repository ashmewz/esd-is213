from flask import Flask
from app.controllers.user_controller import user_bp

def create_app():
    app = Flask(__name__)

    app.register_blueprint(user_bp)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)