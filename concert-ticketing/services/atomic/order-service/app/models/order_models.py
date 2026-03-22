from sqlalchemy import Column, String, DateTime, func, Numeric
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": "order_service"}

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    event_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(String(20), default="CREATED")
    total_amount = Column(Numeric(10, 2))
    currency = Column(String(10), default="SGD")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "orderId": str(self.order_id),
            "userId": str(self.user_id),
            "eventId": str(self.event_id),
            "status": self.status,
            "totalAmount": float(self.total_amount) if self.total_amount else None,
            "currency": self.currency
        }


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": "order_service"}

    order_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), nullable=False)
    seat_id = Column(UUID(as_uuid=True), nullable=False)
    price = Column(Numeric(10, 2))
    status = Column(String(20), default="RESERVED")

    def to_dict(self):
        return {
            "orderItemId": str(self.order_item_id),
            "orderId": str(self.order_id),
            "seatId": str(self.seat_id),
            "price": float(self.price) if self.price else None,
            "status": self.status
        }