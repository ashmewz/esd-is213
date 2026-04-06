import bcrypt, jwt
from datetime import datetime, timezone, timedelta
import os
from app.core.database import SessionLocal
from app.models.user_model import User

JWT_SECRET = os.getenv("JWT_SECRET", "stagepass-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

class UserService:

    @staticmethod
    def register_user(data):
        db = SessionLocal()

        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            raise Exception("User already exists")

        hashed = bcrypt.hashpw(
            data["password"].encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        user = User(
            username=data["username"],
            email=data["email"],
            password=hashed
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return user.to_dict()

    @staticmethod
    def login_user(email, password):
        db = SessionLocal()
        user = db.query(User).filter(User.email == email).first()

        if not user:
            raise Exception("Invalid credentials")

        if not bcrypt.checkpw(
            password.encode("utf-8"),
            user.password.encode("utf-8")
        ):
            raise Exception("Invalid credentials")

        payload = {
            "sub": str(user.user_id),
            "email": user.email,
            "username": user.username
        }

        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return token, user.to_dict()

    @staticmethod
    def get_user(user_id):
        db = SessionLocal()
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise Exception("User not found")
        return user.to_dict()

    @staticmethod
    def list_users():
        db = SessionLocal()
        users = db.query(User).all()
        return [u.to_dict() for u in users]

    @staticmethod
    def delete_user(user_id):
        db = SessionLocal()
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise Exception("User not found")
        db.delete(user)
        db.commit()
        return {"message": "User deleted"}