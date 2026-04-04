import bcrypt, jwt
from datetime import datetime, timezone, timedelta
import os

JWT_SECRET = os.getenv("JWT_SECRET", "stagepass-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

class UserService:
    _users = {}
    _next_id = 1

    @staticmethod
    def register_user(data):
        for user in UserService._users.values():
            if user["email"] == data["email"]:
                raise Exception("User already exists")
        hashed = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())
        user = {
            "id": UserService._next_id,
            "username": data["username"],
            "email": data["email"],
            "password": hashed.decode("utf-8")
        }
        UserService._users[UserService._next_id] = user
        UserService._next_id += 1
        return user

    @staticmethod
    def login_user(email, password):
        for user in UserService._users.values():
            if user["email"] == email and bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
                payload = {
                    "sub": str(user["id"]),
                    "email": user["email"],
                    "username": user["username"],
                    "iat": datetime.now(timezone.utc),
                    "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
                }
                token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                return token, user
        raise Exception("Invalid credentials")

    @classmethod
    def get_user(user_id):
        user = UserService._users.get(int(user_id))
        if not user:
            raise Exception("User not found")
        return user

    @classmethod
    def list_users():
        return list(UserService._users.values())

    @classmethod
    def delete_user(user_id):
        return UserService._users.pop(int(user_id), None)