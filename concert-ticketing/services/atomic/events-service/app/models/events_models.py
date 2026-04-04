import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"
    __table_args__ = {"schema": "events_service"}

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True))
    venue_name = Column(String)
    name = Column(String, nullable=False)
    event_date = Column(DateTime, nullable=False)
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
    row_no = Column(String)
    seat_no = Column(Integer)
    base_price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="available")

    def to_dict(self):
        return {
            "seatId": str(self.seat_id),
            "eventId": str(self.event_id),
            "tier": self.tier,
            "sectionNo": self.section_no,
            "rowNo": self.row_no,
            "seatNo": self.seat_no,
            "basePrice": float(self.base_price),
            "status": self.status.lower() if self.status else "available",
        }


class EventShowtime(Base):
    __tablename__ = "event_showtimes"
    __table_args__ = {"schema": "events_service"}

    showtime_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    date_id = Column(Date, nullable=False)
    label = Column(String, nullable=False)
    times = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "showtimeId": str(self.showtime_id),
            "eventId": str(self.event_id),
            "dateId": self.date_id.isoformat() if self.date_id else None,
            "label": self.label,
            "times": self.times or [],
        }


class EventVisualSection(Base):
    __tablename__ = "event_visual_sections"
    __table_args__ = {"schema": "events_service"}

    visual_section_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    section_code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    data_section = Column(Integer, nullable=False)
    x = Column(Numeric(10, 2), nullable=False)
    y = Column(Numeric(10, 2), nullable=False)
    w = Column(Numeric(10, 2), nullable=False)
    h = Column(Numeric(10, 2), nullable=False)
    multiline = Column(Boolean, nullable=False, default=False)
    hidden = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "visualSectionId": str(self.visual_section_id),
            "eventId": str(self.event_id),
            "sectionCode": self.section_code,
            "label": self.label,
            "dataSection": self.data_section,
            "x": float(self.x),
            "y": float(self.y),
            "w": float(self.w),
            "h": float(self.h),
            "multiline": self.multiline,
            "hidden": self.hidden,
        }