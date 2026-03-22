import uuid

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import db
from app.models.order_models import Order, OrderItem

_ALLOWED_STATUSES = frozenset({"CREATED", "CONFIRMED", "CANCELLED"})


def _as_uuid(value):
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


def create_order(user_id, event_id, seat_id, price, currency="SGD"):
    if user_id is None or event_id is None or seat_id is None or price is None:
        raise ValueError("userId, eventId, seatId, and price are required.")

    try:
        user_id = _as_uuid(user_id)
        event_id = _as_uuid(event_id)
        seat_id = _as_uuid(seat_id)
    except (ValueError, TypeError):
        raise ValueError("Invalid UUID for userId, eventId, or seatId.")

    try:
        price_val = float(price)
    except (TypeError, ValueError):
        raise ValueError("price must be a number.")

    if price_val <= 0:
        raise ValueError("price must be greater than 0.")

    if not currency:
        currency = "SGD"
    currency = str(currency).upper()

    # One order = one item for now; total_amount matches that single line price.
    order = Order(
        user_id=user_id,
        event_id=event_id,
        total_amount=price_val,
        currency=currency,
        status="CREATED",
    )
    try:
        db.session.add(order)
        db.session.flush()

        item = OrderItem(
            order_id=order.order_id,
            seat_id=seat_id,
            price=price_val,
            status="CREATED",
        )
        db.session.add(item)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return get_order(str(order.order_id))


def get_order(order_id):
    try:
        oid = _as_uuid(order_id)
    except (ValueError, TypeError):
        raise LookupError("Order not found.")

    order = db.session.scalar(
        select(Order)
        .where(Order.order_id == oid)
        .options(selectinload(Order.items))
    )
    if not order:
        raise LookupError("Order not found.")
    return order


def update_order_status(order_id, status):
    if status is None or str(status).strip() == "":
        raise ValueError("status is required.")

    status = str(status).strip().upper()
    if status not in _ALLOWED_STATUSES:
        raise ValueError("Invalid status.")

    order = get_order(order_id)
    order.status = status
    for item in order.items:
        item.status = status
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return get_order(order_id)
