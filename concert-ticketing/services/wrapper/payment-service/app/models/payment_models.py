from sqlalchemy import Column, DateTime, Numeric, Text, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "type IN ('PAYMENT','REFUND','ADJUSTMENT','SWAP_SETTLEMENT')",
            name="check_transaction_type"
        ),
        CheckConstraint(
            "status IN ('PENDING','SUCCESS','FAILED')",
            name="check_transaction_status"
        ),
        {"schema": "payment_service"}
    )

    transaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Text, nullable=False)
    user_id = Column(Text, nullable=True)
    type = Column(Text)                             # PAYMENT, REFUND, ADJUSTMENT, SWAP_SETTLEMENT
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(Text, default="SGD")
    platform_fee = Column(Numeric(10, 2), default=0)
    external_ref_id = Column(Text)                  # provider's transaction reference
    idempotency_key = Column(Text, unique=True, nullable=True)
    status = Column(Text, default="PENDING")        # PENDING, SUCCESS, FAILED
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "transactionId": str(self.transaction_id),
            "orderId": self.order_id,
            "userId": self.user_id,
            "type": self.type,
            "amount": float(self.amount),
            "currency": self.currency,
            "platformFee": float(self.platform_fee) if self.platform_fee else 0,
            "externalRefId": self.external_ref_id,
            "idempotencyKey": self.idempotency_key,
            "status": self.status,
            "failureReason": self.failure_reason,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
