# app/services/swap_service.py

from app.core.database import SessionLocal
from app.models.swap_models import SwapRequest, SwapMatch, SwapConfirmation
from datetime import datetime, time, timedelta
import uuid


def create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=None, user_id=None):
    """Create a new swap request and attempt to find a match immediately."""
    db = SessionLocal()
    try:
        swap_request = SwapRequest(
            order_id=order_id,
            event_id=event_id,
            current_seat_id=current_seat_id,
            desired_tier=desired_tier,
            current_tier=current_tier,
            user_id=user_id,
            expiry=datetime.utcnow() + timedelta(minutes=5),
            status="PENDING",
        )
        db.add(swap_request)
        db.commit()
        db.refresh(swap_request)

        match = _find_match(db, swap_request)

        if match:
            match_data = match.to_dict()
            # Enrich with request details for notification
            req_a = db.query(SwapRequest).get(match.request_a)
            req_b = db.query(SwapRequest).get(match.request_b)
            match_data["requestADetails"] = req_a.to_dict() if req_a else {}
            match_data["requestBDetails"] = req_b.to_dict() if req_b else {}
        else:
            match_data = None

        return {
            "request": swap_request.to_dict(),
            "match": match_data,
        }
    finally:
        db.close()


def _find_match(db, request):
    """Check existing pending requests for a cross-match by tier and create SwapMatch if found."""
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
        # Cross-match: A wants candidate's tier AND candidate wants A's tier
        a_wants_b = request.desired_tier == candidate.current_tier
        b_wants_a = candidate.desired_tier == request.current_tier
        if a_wants_b and b_wants_a:
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
    db = SessionLocal()
    try:
        import uuid

        swap_id = uuid.UUID(str(swap_id))
        user_id = uuid.UUID(str(user_id))

        swap = db.query(SwapMatch).get(swap_id)
        if not swap:
            raise ValueError("Swap not found")

        existing = db.query(SwapConfirmation).filter(
            SwapConfirmation.swap_id == swap_id,
            SwapConfirmation.user_id == user_id
        ).first()

        if existing:
            existing.status = response.upper()
            existing.responded_at = datetime.utcnow()
        else:
            confirmation = SwapConfirmation(
                swap_id=swap_id,
                user_id=user_id,
                status=response.upper(),
                responded_at=datetime.utcnow(),
            )
            db.add(confirmation)

        db.commit()

        result = _evaluate_swap(db, swap_id)

        if result["status"] in ("READY_FOR_EXECUTION", "FAILED"):
            swap.status = result["status"]

            if result["status"] == "READY_FOR_EXECUTION":
                req_a = db.query(SwapRequest).get(swap.request_a)
                req_b = db.query(SwapRequest).get(swap.request_b)

                if req_a:
                    req_a.status = "COMPLETED"
                if req_b:
                    req_b.status = "COMPLETED"

                _cancel_related_requests(db, [swap.request_a, swap.request_b])

            db.commit()

        return result

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
    db = SessionLocal()
    try:
        swap = db.query(SwapMatch).get(swap_id)
        if not swap:
            return None

        status = _evaluate_swap(db, swap_id)["status"]

        if status == "READY_FOR_EXECUTION":
            swap.status = "COMPLETED"
            db.commit()

        confirmations = (
            db.query(SwapConfirmation)
            .filter(SwapConfirmation.swap_id == swap_id)
            .all()
        )

        return {
            "swap": swap.to_dict(),
            "confirmations": [c.to_dict() for c in confirmations],
            "status": status,
        }
    finally:
        db.close()


def get_swap_requests_by_user(user_id):
    """Get all swap requests for a given user."""
    db = SessionLocal()
    try:
        requests = (
            db.query(SwapRequest)
            .filter(SwapRequest.user_id == uuid.UUID(user_id))
            .all()
        )
        return [r.to_dict() for r in requests]
    finally:
        db.close()


def cancel_swap_request(request_id):
    """Cancel a pending swap request."""
    db = SessionLocal()
    try:
        req = db.query(SwapRequest).get(request_id)
        if not req:
            raise ValueError("Swap request not found")
        if req.status != "PENDING":
            raise ValueError(f"Cannot cancel a request with status '{req.status}'")
        req.status = "CANCELLED"
        db.commit()
        return req.to_dict()
    finally:
        db.close()


def get_available_swap_requests(event_id, tier, exclude_user_id=None):
    """Return PENDING swap requests for a given eventId + tier, optionally excluding a user."""
    db = SessionLocal()
    try:
        q = db.query(SwapRequest).filter(
            SwapRequest.event_id == event_id,
            SwapRequest.current_tier == tier,
            SwapRequest.status == "PENDING",
        )
        if exclude_user_id:
            try:
                q = q.filter(SwapRequest.user_id != uuid.UUID(exclude_user_id))
            except (ValueError, TypeError):
                pass
        return [r.to_dict() for r in q.all()]
    finally:
        db.close()

def _cancel_related_requests(db, request_ids):
    matched_requests = (
        db.query(SwapRequest)
        .filter(SwapRequest.request_id.in_(request_ids))
        .all()
    )

    if not matched_requests:
        return

    order_ids = {r.order_id for r in matched_requests}
    seat_ids = {r.current_seat_id for r in matched_requests}

    other_requests = (
        db.query(SwapRequest)
        .filter(
            SwapRequest.request_id.notin_(request_ids),
            SwapRequest.status.in_(["PENDING", "MATCHED"]),
            (
                (SwapRequest.order_id.in_(order_ids)) |
                (SwapRequest.current_seat_id.in_(seat_ids))
            )
        )
        .all()
    )

    for r in other_requests:
        r.status = "CANCELLED"

    db.commit()

def get_swap_by_request(request_id):
    """Return the swap match that a given requestId belongs to (if any)."""
    db = SessionLocal()
    try:
        import uuid

        try:
            request_uuid = uuid.UUID(str(request_id))
        except ValueError:
            return None

        swap = (
            db.query(SwapMatch)
            .filter(
                (SwapMatch.request_a == request_uuid) |
                (SwapMatch.request_b == request_uuid)
            )
            .first()
        )

        if not swap:
            return None

        return swap.to_dict()

    finally:
        db.close()