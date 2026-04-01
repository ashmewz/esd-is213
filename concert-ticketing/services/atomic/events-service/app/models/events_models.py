from sqlalchemy import Column, String, DateTime, Integer, Numeric, func
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Event(Base):
    __tablename__ = "events"
    __table_args__ = {"schema": "events_service"}

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True))
    name = Column(String, nullable=False)
    event_date = Column(DateTime, nullable=False)
    status = Column(String(20), default="ACTIVE")
    seatmap_version = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "eventId": str(self.event_id),
            "venueId": str(self.venue_id) if self.venue_id else None,
            "name": self.name,
            "eventDate": self.event_date,
            "status": self.status,
            "seatmapVersion": self.seatmap_version
        }

class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = {"schema": "events_service"}

    seat_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    tier = Column(String(20), nullable=False)
    section_no = Column(Integer)
    row_no = Column(Integer)
    seat_no = Column(Integer)
    base_price = Column(Numeric(10, 2), nullable=False)

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