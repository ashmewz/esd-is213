from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class Event(db.Model):
    __tablename__ = "events"
    __table_args__ = {"schema": "event_service"}

    event_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = db.Column(UUID(as_uuid=True))
    name = db.Column(db.Text, nullable=False)
    event_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default="ACTIVE")
    seatmap_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "eventId": str(self.event_id),
            "venueId": str(self.venue_id) if self.venue_id else None,
            "name": self.name,
            "eventDate": self.event_date,
            "status": self.status,
            "seatmapVersion": self.seatmap_version
        }


class Seat(db.Model):
    __tablename__ = "seats"
    __table_args__ = {"schema": "event_service"}

    seat_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(UUID(as_uuid=True), nullable=False)
    tier = db.Column(db.String(20), nullable=False)
    section_no = db.Column(db.Integer)
    row_no = db.Column(db.Integer)
    seat_no = db.Column(db.Integer)
    base_price = db.Column(db.Numeric(10, 2), nullable=False)

    def to_dict(self):
        return {
            "seatId": str(self.seat_id),
            "eventId": str(self.event_id),
            "tier": self.tier,
            "sectionNo": self.section_no,
            "rowNo": self.row_no,
            "seatNo": self.seat_no,
            "basePrice": float(self.base_price)
        }