from app.core.database import SessionLocal
from app.models.swap_models import SwapRequest, SwapMatch, SwapConfirmation, SwapPayment
from datetime import datetime, timedelta, timezone
import uuid


def _utc_now():
    return datetime.now(timezone.utc)


def _is_expired(swap_request):
    if not swap_request.expiry:
        return False
    expiry = swap_request.expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return _utc_now() > expiry


def create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=None):
    db = SessionLocal()
    try:
        swap_request = SwapRequest(
            order_id=order_id,
            event_id=event_id,
            current_seat_id=current_seat_id,
            current_tier=current_tier or "",
            desired_tier=desired_tier,
            expiry=_utc_now() + timedelta(minutes=30),
            status="PENDING",
        )
        db.add(swap_request)
        db.commit()
        db.refresh(swap_request)

        match = _find_match(db, swap_request)

        return {
            "request": swap_request.to_dict(),
            "match": match.to_dict() if match else None,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _find_match(db, request):
    candidates = (
        db.query(SwapRequest)
        .filter(
            SwapRequest.event_id == request.event_id,
            SwapRequest.status == "PENDING",
            SwapRequest.request_id != request.request_id,
        )
        .all()
    )

    for candidate in candidates:
        if _is_expired(candidate):
            candidate.status = "EXPIRED"
            db.add(candidate)
            continue

        i_want_theirs = request.desired_tier == candidate.current_tier
        they_want_mine = candidate.desired_tier == request.current_tier

        if i_want_theirs and they_want_mine:
            match = SwapMatch(
                request_a=request.request_id,
                request_b=candidate.request_id,
                status="MATCHED",
            )
            db.add(match)

            request.status = "MATCHED"
            candidate.status = "MATCHED"

            db.commit()
            db.refresh(match)
            return match

    db.commit() 
    return None


def submit_swap_response(swap_id, user_id, response):
    if response not in ("ACCEPT", "DECLINE"):
        raise ValueError("response must be ACCEPT or DECLINE")

    db = SessionLocal()
    try:
        swap = db.get(SwapMatch, swap_id)
        if not swap:
            raise LookupError("Swap match not found.")

        if swap.status not in ("MATCHED", "PENDING_RESPONSE"):
            raise RuntimeError(f"Swap is not awaiting responses (status: {swap.status}).")

        # Prevent duplicate responses from the same user
        existing = (
            db.query(SwapConfirmation)
            .filter_by(swap_id=swap_id, user_id=user_id)
            .first()
        )
        if existing:
            raise RuntimeError("User has already submitted a response for this swap.")

        confirmation = SwapConfirmation(
            swap_id=swap_id,
            user_id=user_id,
            status=response,
            responded_at=_utc_now(),
        )
        db.add(confirmation)
        db.commit()
        db.refresh(confirmation)

        return _evaluate_swap(db, swap_id)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _evaluate_swap(db, swap_id):
    confirmations = (
        db.query(SwapConfirmation)
        .filter(SwapConfirmation.swap_id == swap_id)
        .all()
    )

    if len(confirmations) < 2:
        return {"status": "PENDING_RESPONSE"}

    statuses = [c.status for c in confirmations]

    if all(s == "ACCEPT" for s in statuses):
        return {"status": "READY_FOR_EXECUTION"}

    if any(s == "DECLINE" for s in statuses):
        return {"status": "FAILED"}

    return {"status": "PENDING_RESPONSE"}


def record_swap_payment(swap_id, payer_order_id, payee_order_id, amount, transaction_id):
    db = SessionLocal()
    try:
        payment = SwapPayment(
            swap_id=swap_id,
            payer_order_id=payer_order_id,
            payee_order_id=payee_order_id,
            amount=amount,
            status="SETTLED",
            transaction_id=transaction_id,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_swap_request(request_id):
    db = SessionLocal()
    try:
        req = db.get(SwapRequest, request_id)
        return req.to_dict() if req else None
    finally:
        db.close()


def get_swap_status(swap_id):
    db = SessionLocal()
    try:
        swap = db.get(SwapMatch, swap_id)
        if not swap:
            return None

        confirmations = (
            db.query(SwapConfirmation)
            .filter(SwapConfirmation.swap_id == swap_id)
            .all()
        )

        return {
            "swap": swap.to_dict(),
            "confirmations": [c.to_dict() for c in confirmations],
            "status": _evaluate_swap(db, swap_id)["status"],
        }
    finally:
        db.close()


def expire_stale_requests():
    db = SessionLocal()
    try:
        now = _utc_now()
        stale = (
            db.query(SwapRequest)
            .filter(SwapRequest.status == "PENDING", SwapRequest.expiry < now)
            .all()
        )
        for r in stale:
            r.status = "EXPIRED"
        db.commit()
        return len(stale)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()