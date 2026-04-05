from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "user_service"}

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, server_default="customer")
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "user_id": str(self.user_id),
            "username": self.username,
            "email": self.email,
            "role": self.role or "customer",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }