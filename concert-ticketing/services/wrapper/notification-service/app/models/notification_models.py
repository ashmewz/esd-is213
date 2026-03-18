from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class NotificationLog(db.Model):
    __tablename__ = "notification_logs"
    __table_args__ = {"schema": "notification_service"}

    notification_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True))
    type = db.Column(db.String(20))
    channel = db.Column(db.String(20))
    status = db.Column(db.String(20), default="SENT")
    payload = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "notificationId": str(self.notification_id),
            "userId": str(self.user_id),
            "type": self.type,
            "channel": self.channel,
            "status": self.status,
            "payload": self.payload
        }