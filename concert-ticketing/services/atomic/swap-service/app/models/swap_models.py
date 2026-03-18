from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class SwapRequest(db.Model):
    __tablename__ = "swap_requests"
    __table_args__ = {"schema": "swap_service"}

    request_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = db.Column(UUID(as_uuid=True), nullable=False)
    event_id = db.Column(UUID(as_uuid=True), nullable=False)
    current_seat_id = db.Column(UUID(as_uuid=True), nullable=False)
    desired_tier = db.Column(db.String(20))
    status = db.Column(db.String(20), default="PENDING")
    expiry = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "requestId": str(self.request_id),
            "orderId": str(self.order_id),
            "eventId": str(self.event_id),
            "currentSeatId": str(self.current_seat_id),
            "desiredTier": self.desired_tier,
            "status": self.status
        }


class SwapMatch(db.Model):
    __tablename__ = "swap_matches"
    __table_args__ = {"schema": "swap_service"}

    swap_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_a = db.Column(UUID(as_uuid=True))
    request_b = db.Column(UUID(as_uuid=True))
    status = db.Column(db.String(30))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "swapId": str(self.swap_id),
            "requestA": str(self.request_a),
            "requestB": str(self.request_b),
            "status": self.status
        }


class SwapConfirmation(db.Model):
    __tablename__ = "swap_confirmations"
    __table_args__ = {"schema": "swap_service"}

    confirmation_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swap_id = db.Column(UUID(as_uuid=True))
    user_id = db.Column(UUID(as_uuid=True))
    status = db.Column(db.String(20), default="PENDING")
    responded_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "confirmationId": str(self.confirmation_id),
            "swapId": str(self.swap_id),
            "userId": str(self.user_id),
            "status": self.status
        }


class SwapPayment(db.Model):
    __tablename__ = "swap_payments"
    __table_args__ = {"schema": "swap_service"}

    swap_payment_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swap_id = db.Column(UUID(as_uuid=True))
    payer_order_id = db.Column(UUID(as_uuid=True))
    payee_order_id = db.Column(UUID(as_uuid=True))
    amount = db.Column(db.Numeric(10, 2))
    status = db.Column(db.String(20), default="REQUIRED")
    transaction_id = db.Column(UUID(as_uuid=True))

    def to_dict(self):
        return {
            "swapPaymentId": str(self.swap_payment_id),
            "swapId": str(self.swap_id),
            "amount": float(self.amount) if self.amount else None,
            "status": self.status
        }