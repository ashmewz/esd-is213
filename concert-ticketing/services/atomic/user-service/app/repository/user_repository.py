from app.models.user_model import User
from sqlalchemy.orm import Session

class UserRepository:

    @staticmethod
    def create_user(db: Session, username, email, password, role="customer"):
        user = User(username=username, email=email, password=password, role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_user_by_id(db: Session, user_id):
        return db.query(User).filter(User.user_id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_username(db: Session, username):
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_all_users(db: Session):
        return db.query(User).all()

    @staticmethod
    def delete_user(db: Session, user_id):
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            db.delete(user)
            db.commit()
        return user
