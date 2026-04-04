from sqlalchemy import Column, String, DateTime, func, Numeric, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid


class SwapRequest(Base):
    __tablename__ = "swap_requests"
    __table_args__ = (
        Index("ix_swap_requests_event_status", "event_id", "status"),
        {"schema": "swap_service"},
    )

    request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), nullable=False)          # FIX: was UUID, kept UUID
    event_id = Column(UUID(as_uuid=True), nullable=False)
    current_seat_id = Column(UUID(as_uuid=True), nullable=False)
    current_tier = Column(String(20), nullable=False)              # FIX: added — needed for match logic
    desired_tier = Column(String(20), nullable=False)
    status = Column(String(20), default="PENDING")
    expiry = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "requestId": str(self.request_id),
            "orderId": str(self.order_id),
            "eventId": str(self.event_id),
            "currentSeatId": str(self.current_seat_id),
            "currentTier": self.current_tier,
            "desiredTier": self.desired_tier,
            "status": self.status,
            "expiry": self.expiry.isoformat() if self.expiry else None,
        }


class SwapMatch(Base):
    __tablename__ = "swap_matches"
    __table_args__ = (
        UniqueConstraint("request_a", "request_b", name="uq_swap_pair"),
        {"schema": "swap_service"},
    )

    swap_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_a = Column(UUID(as_uuid=True), nullable=False)
    request_b = Column(UUID(as_uuid=True), nullable=False)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "swapId": str(self.swap_id),
            "requestA": str(self.request_a),
            "requestB": str(self.request_b),
            "status": self.status,
        }


class SwapConfirmation(Base):
    __tablename__ = "swap_confirmations"
    __table_args__ = (
        UniqueConstraint("swap_id", "user_id", name="uq_swap_user_response"),
        {"schema": "swap_service"},
    )

    confirmation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swap_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(String(20), nullable=False)   # ACCEPT | DECLINE
    responded_at = Column(DateTime, nullable=False)

    def to_dict(self):
        return {
            "confirmationId": str(self.confirmation_id),
            "swapId": str(self.swap_id),
            "userId": str(self.user_id),
            "status": self.status,
            "respondedAt": self.responded_at.isoformat() if self.responded_at else None,
        }


class SwapPayment(Base):
    __tablename__ = "swap_payments"
    __table_args__ = {"schema": "swap_service"}

    swap_payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swap_id = Column(UUID(as_uuid=True), nullable=False)
    payer_order_id = Column(UUID(as_uuid=True), nullable=False)    # FIX: was UUID, kept UUID
    payee_order_id = Column(UUID(as_uuid=True), nullable=False)    # FIX: was UUID, kept UUID
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="REQUIRED")                # REQUIRED | SETTLED | FAILED
    transaction_id = Column(UUID(as_uuid=True))

    def to_dict(self):
        return {
            "swapPaymentId": str(self.swap_payment_id),
            "swapId": str(self.swap_id),
            "payerOrderId": str(self.payer_order_id),
            "payeeOrderId": str(self.payee_order_id),
            "amount": float(self.amount) if self.amount else None,
            "status": self.status,
            "transactionId": str(self.transaction_id) if self.transaction_id else None,
        }