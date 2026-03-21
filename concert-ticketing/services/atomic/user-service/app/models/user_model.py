from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "user_service"}

    user_id = Column(String, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    testpw = Column(String(255), nullable=False)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }