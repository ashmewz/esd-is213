# app/services/swap_service.py
from app.core.database import SessionLocal
from app.models.swap_models import SwapRequest, SwapMatch, SwapConfirmation
from datetime import datetime, timedelta
import uuid


def create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=None, user_id=None):
    """Create a new swap request and attempt to find a match immediately."""
    db = SessionLocal()
    try:
        swap_request = SwapRequest(
            order_id=order_id,
            event_id=event_id,
            current_seat_id=current_seat_id,
            current_tier=current_tier,
            desired_tier=desired_tier,
            user_id=user_id,
            expiry=datetime.utcnow() + timedelta(minutes=5),
            status="PENDING",
        )
        db.add(swap_request)
        db.commit()
        db.refresh(swap_request)

        match, request_a, request_b = _find_match(db, swap_request)

        match_data = None
        if match:
            match_data = {
                **match.to_dict(),
                "requestADetails": request_a.to_dict(),
                "requestBDetails": request_b.to_dict(),
            }

        return {
            "request": swap_request.to_dict(),
            "match": match_data,
        }
    finally:
        db.close()


def _find_match(db, request):
    """
    Find a pending swap request that cross-matches with the given request.
    A match requires:
      - Same event
      - candidate wants what request has (candidate.desired_tier == request.current_tier)
      - request wants what candidate has (request.desired_tier == candidate.current_tier)
    Falls back to desired_tier inequality when current_tier is not stored.
    Returns (match, request_a, request_b) or (None, None, None).
    """
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
        # Full cross-match when both current_tiers are stored
        if request.current_tier and candidate.current_tier:
            i_want_theirs = request.desired_tier == candidate.current_tier
            they_want_mine = candidate.desired_tier == request.current_tier
            is_match = i_want_theirs and they_want_mine
        else:
            # Fallback: they simply want different tiers
            is_match = request.desired_tier != candidate.desired_tier

        if is_match:
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

            return match, request, candidate

    return None, None, None


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
    """Evaluate swap status based on collected confirmations.
    Persists the resolved status back to SwapMatch and SwapRequests."""
    confirmations = (
        db.query(SwapConfirmation)
        .filter(SwapConfirmation.swap_id == swap_id)
        .all()
    )

    if len(confirmations) < 2:
        return {"status": "PENDING"}

    statuses = [c.status for c in confirmations]

    if all(s == "ACCEPT" for s in statuses):
        _persist_match_outcome(db, swap_id, "COMPLETED")
        return {"status": "READY_FOR_EXECUTION"}

    if any(s == "DECLINE" for s in statuses):
        _persist_match_outcome(db, swap_id, "FAILED")
        return {"status": "FAILED"}

    return {"status": "PENDING"}


def _persist_match_outcome(db, swap_id, outcome):
    """Update SwapMatch and its two SwapRequests to the resolved outcome status."""
    match = db.query(SwapMatch).filter(SwapMatch.swap_id == swap_id).first()
    if not match or match.status in ("COMPLETED", "FAILED"):
        return
    match.status = outcome
    for request_id in (match.request_a, match.request_b):
        req = db.query(SwapRequest).filter(SwapRequest.request_id == request_id).first()
        if req:
            req.status = outcome
    db.commit()


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
        swap = db.query(SwapMatch).filter(SwapMatch.swap_id == swap_id).first()
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


def get_swap_requests_by_user(user_id):
    """Return all swap requests for a given user, enriched with match info."""
    db = SessionLocal()
    try:
        requests = (
            db.query(SwapRequest)
            .filter(SwapRequest.user_id == user_id)
            .order_by(SwapRequest.created_at.desc())
            .all()
        )

        result = []
        for req in requests:
            data = req.to_dict()

            # Find the swap match this request belongs to (if any)
            match = (
                db.query(SwapMatch)
                .filter(
                    (SwapMatch.request_a == req.request_id) |
                    (SwapMatch.request_b == req.request_id)
                )
                .first()
            )

            data["matchId"] = str(match.swap_id) if match else None
            data["matchStatus"] = match.status if match else None

            # Find the counterpart request (the other user's seat details)
            if match:
                other_id = (
                    match.request_b if match.request_a == req.request_id
                    else match.request_a
                )
                other = db.query(SwapRequest).filter(SwapRequest.request_id == other_id).first()
                data["matchedSeatId"] = str(other.current_seat_id) if other else None
                data["matchedTier"] = other.current_tier if other else None
                data["matchedEventId"] = str(other.event_id) if other else None
            else:
                data["matchedSeatId"] = None
                data["matchedTier"] = None
                data["matchedEventId"] = None

            result.append(data)

        return result
    finally:
        db.close()


def cancel_swap_request(request_id):
    """Cancel a PENDING swap request. Returns the updated dict or None if not found/cancellable."""
    db = SessionLocal()
    try:
        req = db.query(SwapRequest).filter(SwapRequest.request_id == request_id).first()
        if not req:
            return None
        if req.status != "PENDING":
            raise ValueError(f"Cannot cancel a request with status '{req.status}'")
        req.status = "CANCELLED"
        db.commit()
        db.refresh(req)
        return req.to_dict()
    finally:
        db.close()
