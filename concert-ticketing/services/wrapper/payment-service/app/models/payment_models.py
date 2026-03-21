from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, CheckConstraint, func
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
    order_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(Text)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(Text, default="SGD")
    platform_fee = Column(Numeric(10, 2), default=0)
    external_ref_id = Column(Text)
    status = Column(Text, default="PENDING")
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "transactionId": str(self.transaction_id),
            "orderId": str(self.order_id),
            "type": self.type,
            "amount": float(self.amount),
            "currency": self.currency,
            "platformFee": float(self.platform_fee) if self.platform_fee else 0,
            "externalRefId": self.external_ref_id,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class PaymentLedger(Base):
    __tablename__ = "payment_ledger"
    __table_args__ = (
        CheckConstraint(
            "entry_type IN ('DEBIT','CREDIT')",
            name="check_entry_type"
        ),
        {"schema": "payment_service"}
    )

    ledger_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), nullable=False)
    transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payment_service.transactions.transaction_id"),
        nullable=True
    )
    entry_type = Column(Text)
    amount = Column(Numeric(10, 2))
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "ledgerId": str(self.ledger_id),
            "orderId": str(self.order_id),
            "transactionId": str(self.transaction_id) if self.transaction_id else None,
            "entryType": self.entry_type,
            "amount": float(self.amount) if self.amount else None,
            "description": self.description,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }