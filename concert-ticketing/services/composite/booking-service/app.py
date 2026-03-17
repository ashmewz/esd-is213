from flask import Flask
from app.controllers.booking_controller import booking_bp

app = Flask(__name__)
app.register_blueprint(booking_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)