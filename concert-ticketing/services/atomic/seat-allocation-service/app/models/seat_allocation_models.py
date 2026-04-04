from sqlalchemy import (
    Column,
    String,
    DateTime,
    func,
    UniqueConstraint,
    ForeignKeyConstraint,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid


class Hold(Base):
    __tablename__ = "holds"
    __table_args__ = (
        UniqueConstraint("event_id", "seat_id", "order_id", name="uq_active_hold"),
        Index("ix_holds_event_seat", "event_id", "seat_id"),
        {"schema": "seat_allocation_service"},
    )

    hold_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    seat_id = Column(UUID(as_uuid=True), nullable=False)
    order_id = Column(UUID(as_uuid=True), nullable=False)          # FIX: was BigInteger → UUID
    expiry = Column(DateTime, nullable=False)
    status = Column(String(20), default="ACTIVE")                  # ACTIVE | CONFIRMED | CANCELLED | EXPIRED
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "holdId": str(self.hold_id),
            "eventId": str(self.event_id),
            "seatId": str(self.seat_id),
            "orderId": str(self.order_id),
            "expiry": self.expiry.isoformat() if self.expiry else None,
            "status": self.status,
        }


class SeatAssignment(Base):
    __tablename__ = "seat_assignments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["event_id", "seat_id", "order_id"],
            [
                "seat_allocation_service.holds.event_id",
                "seat_allocation_service.holds.seat_id",
                "seat_allocation_service.holds.order_id",
            ],
        ),
        Index("ix_seat_assignments_event_seat", "event_id", "seat_id"),
        Index("ix_seat_assignments_order", "order_id"),
        {"schema": "seat_allocation_service"},
    )

    seat_assign_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    seat_id = Column(UUID(as_uuid=True), nullable=False)
    order_id = Column(UUID(as_uuid=True), nullable=False)          # FIX: was BigInteger → UUID
    hold_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seat_allocation_service.holds.hold_id"),
        nullable=False,
    )
    status = Column(String(20), nullable=False)                    # SOLD | REASSIGNED | REFUNDED
    assigned_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "seatAssignId": str(self.seat_assign_id),
            "eventId": str(self.event_id),
            "seatId": str(self.seat_id),
            "orderId": str(self.order_id),
            "holdId": str(self.hold_id) if self.hold_id else None,
            "status": self.status,
        }


class ReallocationLog(Base):
    """
    P3 FIX: ReallocationLog was never written to — now written by both
    the seatmap_consumer (Scenario B) and swap_execution_service (Scenario C).
    """
    __tablename__ = "reallocation_logs"
    __table_args__ = (
        Index("ix_reallocation_logs_order", "order_id"),
        {"schema": "seat_allocation_service"},
    )

    reallocation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), nullable=False)          # FIX: was BigInteger → UUID
    old_seat_id = Column(UUID(as_uuid=True))
    new_seat_id = Column(UUID(as_uuid=True))
    reason = Column(String(50))                                    # SEATMAP_CHANGED | SWAP_EXECUTED
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "reallocationId": str(self.reallocation_id),
            "orderId": str(self.order_id),
            "oldSeatId": str(self.old_seat_id) if self.old_seat_id else None,
            "newSeatId": str(self.new_seat_id) if self.new_seat_id else None,
            "reason": self.reason,
        }