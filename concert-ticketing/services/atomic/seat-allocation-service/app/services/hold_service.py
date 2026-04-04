from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal
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

    db = SessionLocal()
    try:
        existing_assignment = db.query(SeatAssignment).filter_by(
            event_id=event_id,
            seat_id=seat_id,
        ).first()
        if existing_assignment:
            raise RuntimeError("Seat is already assigned.")

        existing_hold = db.query(Hold).filter_by(
            event_id=event_id,
            seat_id=seat_id,
            order_id=order_id,
        ).first()

        if existing_hold:
            if existing_hold.status == "ACTIVE" and not is_hold_expired(existing_hold):
                raise RuntimeError("Seat already has an active hold.")

            # reuse the same row instead of inserting a new one
            existing_hold.status = "ACTIVE"
            existing_hold.expiry = _utc_now() + timedelta(seconds=ttl_seconds)
            db.commit()
            db.refresh(existing_hold)
            return existing_hold

        hold = Hold(
            event_id=event_id,
            seat_id=seat_id,
            order_id=order_id,
            expiry=_utc_now() + timedelta(seconds=ttl_seconds),
            status="ACTIVE",
        )
        db.add(hold)
        db.commit()
        db.refresh(hold)
        return hold
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def cancel_hold(hold_id):
    db = SessionLocal()
    try:
        hold = db.get(Hold, hold_id)
        if not hold:
            raise LookupError("Hold not found.")

        if is_hold_expired(hold) and hold.status == "ACTIVE":
            hold.status = "EXPIRED"
            db.commit()
            db.refresh(hold)
            return hold

        if hold.status == "CONFIRMED":
            raise RuntimeError("Confirmed hold cannot be cancelled.")

        hold.status = "CANCELLED"
        db.commit()
        db.refresh(hold)
        return hold
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def confirm_hold(hold_id, transaction_id):
    if not transaction_id:
        raise ValueError("transactionId is required.")

    db = SessionLocal()
    try:
        hold = db.get(Hold, hold_id)
        if not hold:
            raise LookupError("Hold not found.")

        if is_hold_expired(hold):
            hold.status = "EXPIRED"
            db.commit()
            raise RuntimeError("Hold has expired.")

        if hold.status != "ACTIVE":
            raise RuntimeError("Hold is not in ACTIVE state.")

        existing_assignment = db.query(SeatAssignment).filter_by(
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
            transaction_id=transaction_id,
            status="SOLD",
        )

        hold.status = "CONFIRMED"

        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
