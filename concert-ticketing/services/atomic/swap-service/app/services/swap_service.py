# app/services/swap_service.py

from app.core.database import SessionLocal
from app.models.swap_models import SwapRequest, SwapMatch, SwapConfirmation
from datetime import datetime, timedelta
import uuid


def create_swap_request(order_id, event_id, current_seat_id, desired_tier):
    """Create a new swap request and attempt to find a match immediately."""
    db = SessionLocal()
    try:
        swap_request = SwapRequest(
            order_id=order_id,
            event_id=event_id,
            current_seat_id=current_seat_id,
            desired_tier=desired_tier,
            expiry=datetime.utcnow() + timedelta(minutes=5),
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
    finally:
        db.close()


def _find_match(db, request):
    """Check existing pending requests for a match and create SwapMatch if found."""
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
        if request.desired_tier == candidate.desired_tier:
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
    return None


def submit_swap_response(swap_id, user_id, response):
    """Submit a user's response (ACCEPT/DECLINE) to a swap and evaluate status."""
    db = SessionLocal()
    try:
        confirmation = SwapConfirmation(
            swap_id=swap_id,
            user_id=user_id,
            status=response,
            responded_at=datetime.utcnow(),
        )
        db.add(confirmation)
        db.commit()
        db.refresh(confirmation)

        return _evaluate_swap(db, swap_id)
    finally:
        db.close()


def _evaluate_swap(db, swap_id):
    """Evaluate swap status based on collected confirmations."""
    confirmations = (
        db.query(SwapConfirmation)
        .filter(SwapConfirmation.swap_id == swap_id)
        .all()
    )

    if len(confirmations) < 2:
        return {"status": "PENDING"}

    statuses = [c.status for c in confirmations]

    if all(s == "ACCEPT" for s in statuses):
        return {"status": "READY_FOR_EXECUTION"}

    if any(s == "DECLINE" for s in statuses):
        return {"status": "FAILED"}

    return {"status": "PENDING"}


def get_swap_request(request_id):
    """Get a single swap request by ID."""
    db = SessionLocal()
    try:
        request = db.query(SwapRequest).get(request_id)
        return request.to_dict() if request else None
    finally:
        db.close()


def get_swap_status(swap_id):
    """Get swap match details with confirmations and overall status."""
    db = SessionLocal()
    try:
        swap = db.query(SwapMatch).get(swap_id)
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