from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class Hold(db.Model):
    __tablename__ = "holds"
    __table_args__ = {"schema": "seat_allocation"}

    hold_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(UUID(as_uuid=True), nullable=False)
    seat_id = db.Column(UUID(as_uuid=True), nullable=False)
    order_id = db.Column(UUID(as_uuid=True), nullable=False)
    expiry = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default="ACTIVE")
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "holdId": str(self.hold_id),
            "eventId": str(self.event_id),
            "seatId": str(self.seat_id),
            "orderId": str(self.order_id),
            "expiry": self.expiry,
            "status": self.status
        }


class SeatAssignment(db.Model):
    __tablename__ = "seat_assignments"
    __table_args__ = {"schema": "seat_allocation"}

    seat_assign_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = db.Column(UUID(as_uuid=True), nullable=False)
    seat_id = db.Column(UUID(as_uuid=True), nullable=False)
    order_id = db.Column(UUID(as_uuid=True), nullable=False)
    hold_id = db.Column(UUID(as_uuid=True))
    status = db.Column(db.String(20), nullable=False)
    assigned_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "seatAssignId": str(self.seat_assign_id),
            "eventId": str(self.event_id),
            "seatId": str(self.seat_id),
            "orderId": str(self.order_id),
            "holdId": str(self.hold_id) if self.hold_id else None,
            "status": self.status
        }


class ReallocationLog(db.Model):
    __tablename__ = "reallocation_logs"
    __table_args__ = {"schema": "seat_allocation"}

    reallocation_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = db.Column(UUID(as_uuid=True), nullable=False)
    old_seat_id = db.Column(UUID(as_uuid=True))
    new_seat_id = db.Column(UUID(as_uuid=True))
    reason = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "reallocationId": str(self.reallocation_id),
            "orderId": str(self.order_id),
            "oldSeatId": str(self.old_seat_id) if self.old_seat_id else None,
            "newSeatId": str(self.new_seat_id) if self.new_seat_id else None,
            "reason": self.reason
        }