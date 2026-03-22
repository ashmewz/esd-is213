from app.repository.user_repository import UserRepository
from app.messaging.producer import publish_event

class UserService:

    @staticmethod
    def register_user(db, data):
        existing = UserRepository.get_user_by_email(db, data["email"])
        if existing:
            raise Exception("User already exists")

        user = UserRepository.create_user(
            db,
            username=data["username"],
            email=data["email"],
            password=data["password"]
        )

        # publish_event("user.created", user.to_dict())
        return user

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