import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

from app.repository.user_repository import UserRepository

JWT_SECRET = os.getenv("JWT_SECRET", "stagepass-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


class UserService:

    @staticmethod
    def register_user(db, data):
        existing = UserRepository.get_user_by_email(db, data["email"])
        if existing:
            raise Exception("User already exists")

        hashed = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())

        user = UserRepository.create_user(
            db,
            username=data["username"],
            email=data["email"],
            password=hashed.decode("utf-8"),
        )

        # publish_event("user.created", user.to_dict())
        return user

    @staticmethod
    def login_user(db, email, password):
        user = UserRepository.get_user_by_email(db, email)
        if not user:
            raise Exception("Invalid credentials")

        if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
            raise Exception("Invalid credentials")

        payload = {
            "sub": str(user.user_id),
            "email": user.email,
            "username": user.username,
            "role": "customer",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token, user

    @staticmethod
    def get_user(db, user_id):
        user = UserRepository.get_user_by_id(db, user_id)
        if not user:
            raise Exception("User not found")
        return user

    @staticmethod
    def list_users(db):
        return UserRepository.get_all_users(db)

    @staticmethod
    def delete_user(db, user_id):
        user = UserRepository.delete_user(db, user_id)
        if not user:
            raise Exception("User not found")

        # publish_event("user.deleted", {"userId": user_id})
        return user
