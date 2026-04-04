import os

import bcrypt
from flask import Flask, jsonify
from sqlalchemy.exc import ProgrammingError

from app.core.database import SessionLocal
from app.models.user_model import User
from app.routes.user_routes import user_bp

app = Flask(__name__)

DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD")


def ensure_admin_user():
    if not (DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD):
        return

    db = SessionLocal()
    try:
        admin_user = (
            db.query(User)
            .filter((User.username == DEFAULT_ADMIN_USERNAME) | (User.email == DEFAULT_ADMIN_EMAIL))
            .first()
        )
        password_hash = bcrypt.hashpw(DEFAULT_ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        if admin_user:
            admin_user.username = DEFAULT_ADMIN_USERNAME
            admin_user.email = DEFAULT_ADMIN_EMAIL
            admin_user.password = password_hash
            admin_user.role = "admin"
        else:
            db.add(
                User(
                    username=DEFAULT_ADMIN_USERNAME,
                    email=DEFAULT_ADMIN_EMAIL,
                    password=password_hash,
                    role="admin",
                )
            )
        db.commit()
    except ProgrammingError:
        db.rollback()
    finally:
        db.close()

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

app.register_blueprint(user_bp)
ensure_admin_user()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
