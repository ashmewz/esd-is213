from sqlalchemy import Column, String, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "notification_service"}

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(100), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    route = Column(String(100), default="/")
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "notificationId": str(self.notification_id),
            "userId": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "route": self.route,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
