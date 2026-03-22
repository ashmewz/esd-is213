from datetime import datetime, timedelta, timezone

from app import db
from app.models.seat_allocation_models import Hold, SeatAssignment


def _utc_now():
    return datetime.now(timezone.utc)


def is_hold_expired(hold):
    expiry = hold.expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return _utc_now() > expiry


def create_hold(order_id, event_id, seat_id, ttl_seconds):
    if ttl_seconds is None or ttl_seconds <= 0:
        raise ValueError("ttlSeconds must be greater than 0.")

    existing_assignment = SeatAssignment.query.filter_by(
        event_id=event_id,
        seat_id=seat_id,
    ).first()
    if existing_assignment:
        raise RuntimeError("Seat is already assigned.")

    existing_hold = Hold.query.filter_by(
        event_id=event_id,
        seat_id=seat_id,
        status="ACTIVE",
    ).first()
    if existing_hold:
        if is_hold_expired(existing_hold):
            existing_hold.status = "EXPIRED"
            db.session.commit()
        else:
            raise RuntimeError("Seat already has an active hold.")

    hold = Hold(
        event_id=event_id,
        seat_id=seat_id,
        order_id=order_id,
        expiry=_utc_now() + timedelta(seconds=ttl_seconds),
        status="ACTIVE",
    )
    db.session.add(hold)
    db.session.commit()
    return hold


def cancel_hold(hold_id):
    hold = Hold.query.get(hold_id)
    if not hold:
        raise LookupError("Hold not found.")

    if is_hold_expired(hold) and hold.status == "ACTIVE":
        hold.status = "EXPIRED"
        db.session.commit()
        return hold

    if hold.status == "CONFIRMED":
        raise RuntimeError("Confirmed hold cannot be cancelled.")

    hold.status = "CANCELLED"
    db.session.commit()
    return hold


def confirm_hold(hold_id, transaction_id):
    if not transaction_id:
        raise ValueError("transactionId is required.")

    hold = Hold.query.get(hold_id)
    if not hold:
        raise LookupError("Hold not found.")

    if is_hold_expired(hold):
        hold.status = "EXPIRED"
        db.session.commit()
        raise RuntimeError("Hold has expired.")

    if hold.status != "ACTIVE":
        raise RuntimeError("Hold is not in ACTIVE state.")

    existing_assignment = SeatAssignment.query.filter_by(
        event_id=hold.event_id,
        seat_id=hold.seat_id,
    ).first()
    if existing_assignment:
        raise RuntimeError("Seat is already assigned.")

    assignment = SeatAssignment(
        event_id=hold.event_id,
        seat_id=hold.seat_id,
        order_id=hold.order_id,
        hold_id=hold.hold_id,
        status="SOLD",
    )
    hold.status = "CONFIRMED"

    # Persist both changes together in one transaction commit.
    db.session.add(assignment)
    db.session.commit()
    return assignment
