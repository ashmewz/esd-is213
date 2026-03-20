from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
import uuid

db = SQLAlchemy()

class Transaction(db.Model):
    __tablename__ = "transactions"
    __table_args__ = {"schema": "payment_service"}

    transaction_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = db.Column(UUID(as_uuid=True), nullable=False)
    type = db.Column(db.String(30))
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), default="SGD")
    platform_fee = db.Column(db.Numeric(10, 2), default=0)
    external_ref_id = db.Column(db.String(255))
    status = db.Column(db.String(20), default="PENDING")
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "transactionId": str(self.transaction_id),
            "orderId": str(self.order_id),
            "type": self.type,
            "amount": float(self.amount),
            "platformFee": float(self.platform_fee),
            "status": self.status
        }


class PaymentLedger(db.Model):
    __tablename__ = "payment_ledger"
    __table_args__ = {"schema": "payment_service"}

    ledger_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = db.Column(UUID(as_uuid=True), nullable=False)
    transaction_id = db.Column(UUID(as_uuid=True))
    entry_type = db.Column(db.String(10))
    amount = db.Column(db.Numeric(10, 2))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "ledgerId": str(self.ledger_id),
            "orderId": str(self.order_id),
            "transactionId": str(self.transaction_id) if self.transaction_id else None,
            "entryType": self.entry_type,
            "amount": float(self.amount) if self.amount else None,
            "description": self.description
        }