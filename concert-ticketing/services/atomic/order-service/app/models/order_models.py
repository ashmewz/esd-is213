from sqlalchemy import Column, String, DateTime, func, Numeric, ForeignKey
from app.core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.orm import relationship


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": "order_service"}

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="CREATED")
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="SGD")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Current rule: one order has one item; the one-to-many remains for future extensibility.
    items = relationship(
        "OrderItem",
        back_populates="order",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        item = self.items[0] if self.items else None
        data = {
            "orderId": str(self.order_id),
            "userId": str(self.user_id),
            "eventId": str(self.event_id),
            "totalAmount": float(self.total_amount),
            "currency": self.currency,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
        if item:
            nested = item.to_dict()
            nested.pop("orderId", None)
            data["orderItem"] = nested
        else:
            data["orderItem"] = None
        return data


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": "order_service"}

    order_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("order_service.orders.order_id"),
        nullable=False,
        index=True,
    )
    seat_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), nullable=False, default="CREATED")

    order = relationship("Order", back_populates="items")

    def to_dict(self):
        return {
            "orderItemId": str(self.order_item_id),
            "orderId": str(self.order_id),
            "seatId": str(self.seat_id),
            "price": float(self.price),
            "status": self.status,
        }
