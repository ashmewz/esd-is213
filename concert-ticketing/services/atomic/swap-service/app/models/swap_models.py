from sqlalchemy import Column, String, DateTime, func, UniqueConstraint, BigInteger
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid

class SwapRequest(Base):
    __tablename__ = "swap_requests"
    __table_args__ = {"schema": "swap_service"}

    request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(BigInteger, nullable=False)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    current_seat_id = Column(UUID(as_uuid=True), nullable=False)
    desired_tier = Column(String(20))
    current_tier = Column(String(20), nullable=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(20), default="PENDING")
    expiry = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "requestId": str(self.request_id),
            "orderId": int(self.order_id) if self.order_id is not None else None,
            "eventId": str(self.event_id),
            "currentSeatId": str(self.current_seat_id),
            "desiredTier": self.desired_tier,
            "currentTier": self.current_tier,
            "userId": str(self.user_id) if self.user_id else None,
            "status": self.status
        }


class SwapMatch(Base):
    __tablename__ = "swap_matches"
    __table_args__ = {"schema": "swap_service"}

    swap_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_a = Column(UUID(as_uuid=True))
    request_b = Column(UUID(as_uuid=True))
    status = Column(String(30))
    created_at = Column(DateTime, server_default=func.now())
    UniqueConstraint("request_a", "request_b", name="uq_swap_pair")

    def to_dict(self):
        return {
            "swapId": str(self.swap_id),
            "requestA": str(self.request_a),
            "requestB": str(self.request_b),
            "status": self.status
        }


class SwapConfirmation(Base):
    __tablename__ = "swap_confirmations"
    __table_args__ = {"schema": "swap_service"}

    confirmation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swap_id = Column(UUID(as_uuid=True))
    user_id = Column(UUID(as_uuid=True))
    status = Column(String(20), default="PENDING")
    responded_at = Column(DateTime)

    def to_dict(self):
        return {
            "confirmationId": str(self.confirmation_id),
            "swapId": str(self.swap_id),
            "userId": str(self.user_id),
            "status": self.status
        }


