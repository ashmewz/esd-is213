from app.repository.user_repository import UserRepository
from app.messaging.producer import publish_event

class UserService:

    @staticmethod
    def register_user(data):
        existing = UserRepository.get_user_by_email(data["email"])
        if existing:
            raise Exception("User already exists")

        user = UserRepository.create_user(
            username=data["username"],
            email=data["email"],
            password=data["password"]  
        )

        publish_event("user.created", user.to_dict())

        return user

    @staticmethod
    def get_user(user_id):
        user = UserRepository.get_user_by_id(user_id)
        if not user:
            raise Exception("User not found")
        return user

    @staticmethod
    def list_users():
        return UserRepository.get_all_users()

    @staticmethod
    def delete_user(user_id):
        user = UserRepository.delete_user(user_id)
        if not user:
            raise Exception("User not found")

        publish_event("user.deleted", {"userId": user_id})
        return user