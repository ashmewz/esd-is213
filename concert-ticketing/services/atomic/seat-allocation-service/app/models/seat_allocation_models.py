from sqlalchemy import Column, String, DateTime, func, UniqueConstraint, ForeignKey
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Hold(Base):
    __tablename__ = "holds"
    __table_args__ = {"schema": "seat_allocation_service"}

    hold_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    seat_id = Column(UUID(as_uuid=True), nullable=False)
    order_id = Column(UUID(as_uuid=True), nullable=False)
    expiry = Column(DateTime, nullable=False)
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime, server_default=func.now())
    UniqueConstraint("event_id", "seat_id", "order_id", name="uq_active_hold")

    def to_dict(self):
        return {
            "holdId": str(self.hold_id),
            "eventId": str(self.event_id),
            "seatId": str(self.seat_id),
            "orderId": str(self.order_id),
            "expiry": self.expiry,
            "status": self.status
        }


class SeatAssignment(Base):
    __tablename__ = "seat_assignments"
    __table_args__ = {"schema": "seat_allocation_service"}

    seat_assign_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("seat_allocation_service.holds.event_id"), nullable=False)
    seat_id = Column(UUID(as_uuid=True), ForeignKey("seat_allocation_service.holds.seat_id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("seat_allocation_service.holds.order_id"), nullable=False)
    hold_id = Column(UUID(as_uuid=True), ForeignKey("seat_allocation_service.holds.hold_id"))
    status = Column(String(20), nullable=False)
    assigned_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "seatAssignId": str(self.seat_assign_id),
            "eventId": str(self.event_id),
            "seatId": str(self.seat_id),
            "orderId": str(self.order_id),
            "holdId": str(self.hold_id) if self.hold_id else None,
            "status": self.status
        }


class ReallocationLog(Base):
    __tablename__ = "reallocation_logs"
    __table_args__ = {"schema": "seat_allocation_service"}

    reallocation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), nullable=False)
    old_seat_id = Column(UUID(as_uuid=True))
    new_seat_id = Column(UUID(as_uuid=True))
    reason = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "reallocationId": str(self.reallocation_id),
            "orderId": str(self.order_id),
            "oldSeatId": str(self.old_seat_id) if self.old_seat_id else None,
            "newSeatId": str(self.new_seat_id) if self.new_seat_id else None,
            "reason": self.reason
        }