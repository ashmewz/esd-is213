import uuid

from sqlalchemy import Column, DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"
    __table_args__ = {"schema": "events_service"}

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True))
    venue_name = Column(String)
    name = Column(String, nullable=False)
    event_date = Column(DateTime, nullable=False)
    event_timing = Column(String, nullable=False, default="")
    event_date_display = Column(String)
    status = Column(String(20), default="active")
    seatmap = Column(Integer)
    seatmap_version = Column(Integer, default=1)
    min_price = Column(Numeric(10, 2))
    image_url = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "eventId": str(self.event_id),
            "venueId": str(self.venue_id) if self.venue_id else None,
            "venueName": self.venue_name,
            "name": self.name,
            "eventDate": self.event_date.isoformat() if self.event_date else None,
            "eventTiming": self.event_timing or None,
            "date": self.event_date_display,
            "status": self.status.lower() if self.status else None,
            "seatmap": self.seatmap,
            "seatmapVersion": self.seatmap_version,
            "minPrice": float(self.min_price) if self.min_price is not None else None,
            "imageUrl": self.image_url,
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
    status = Column(String(20), default="available")

    def to_dict(self):
        return {
            "seatId": str(self.seat_id),
            "eventId": str(self.event_id),
            "tier": self.tier,
            "sectionNo": int(self.section_no) if self.section_no is not None else None,
            "rowNo": int(self.row_no) if self.row_no is not None else None,
            "seatNo": int(self.seat_no) if self.seat_no is not None else None,
            "basePrice": float(self.base_price),
            "status": self.status.lower() if self.status else "available",
        }


