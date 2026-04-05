# app/services/swap_service.py
from app.core.database import SessionLocal
from app.models.swap_models import SwapRequest, SwapMatch, SwapConfirmation
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

SWAP_SURCHARGE = Decimal("2.00")  # flat $2 fee charged to both parties on every swap

from sqlalchemy import Column, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base


class _Seat(Base):
    """Read-only mirror of events_service.seats for cross-schema price lookups."""
    __tablename__ = "seats"
    __table_args__ = {"schema": "events_service", "extend_existing": True}

    seat_id = Column(PG_UUID(as_uuid=True), primary_key=True)
    tier = Column(String(20))
    base_price = Column(Numeric(10, 2))


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
            payment_info = calculate_payment_difference(str(match.swap_id))
            match_data = {
                **match.to_dict(),
                "requestADetails": request_a.to_dict(),
                "requestBDetails": request_b.to_dict(),
                "paymentRequired": payment_info["paymentRequired"],
                "priceDifference": payment_info["priceDifference"],
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
        payment_info = calculate_payment_difference(swap_id)
        if payment_info["paymentRequired"]:
            return {"status": "PAYMENT_REQUIRED", **payment_info}
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


def calculate_payment_difference(swap_id):
    """
    Determine the payment breakdown for a matched swap.

    A flat $2.00 surcharge (SWAP_SURCHARGE) is charged to BOTH parties on every
    swap.  On top of that, if the two seats have different base prices the user
    upgrading to the more expensive tier also pays the price difference.

    Returns a dict with:
        paymentRequired (bool)  – always True (surcharge applies to every swap)
        payer     (dict)        – user paying the price difference (upgrading), or
                                  req_a when both seats cost the same
        payee     (dict)        – user receiving the price difference (downgrading),
                                  or req_b when both seats cost the same
        priceDifference (float) – absolute seat-price difference; 0.0 when equal
        surcharge       (float) – flat fee per party ($2.00)

    Raises ValueError if the swap or its requests cannot be found, or if
    either seat is missing from the events_service.seats table.
    """
    db = SessionLocal()
    try:
        match = db.query(SwapMatch).filter(SwapMatch.swap_id == swap_id).first()
        if not match:
            raise ValueError(f"SwapMatch {swap_id} not found")

        req_a = db.query(SwapRequest).filter(SwapRequest.request_id == match.request_a).first()
        req_b = db.query(SwapRequest).filter(SwapRequest.request_id == match.request_b).first()
        if not req_a or not req_b:
            raise ValueError(f"One or both SwapRequests for match {swap_id} not found")

        seat_a = db.query(_Seat).filter(_Seat.seat_id == req_a.current_seat_id).first()
        seat_b = db.query(_Seat).filter(_Seat.seat_id == req_b.current_seat_id).first()
        if not seat_a:
            raise ValueError(f"Seat {req_a.current_seat_id} not found in events_service.seats")
        if not seat_b:
            raise ValueError(f"Seat {req_b.current_seat_id} not found in events_service.seats")

        price_a = Decimal(str(seat_a.base_price))
        price_b = Decimal(str(seat_b.base_price))
        diff = abs(price_a - price_b)

        def _party(req, seat):
            return {
                "userId": str(req.user_id) if req.user_id else None,
                "orderId": str(req.order_id),
                "seatId": str(req.current_seat_id),
                "tier": seat.tier,
                "basePrice": float(seat.base_price),
            }

        if diff == 0:
            # No price difference — both just pay the surcharge
            return {
                "paymentRequired": True,
                "payer": _party(req_a, seat_a),
                "payee": _party(req_b, seat_b),
                "priceDifference": 0.0,
                "surcharge": float(SWAP_SURCHARGE),
            }

        # The user moving to the higher-priced seat pays the price difference
        if price_a > price_b:
            # price_a > price_b → req_b is upgrading (receiving the more expensive seat_a)
            payer_req, payer_seat = req_b, seat_b
            payee_req, payee_seat = req_a, seat_a
        else:
            payer_req, payer_seat = req_a, seat_a
            payee_req, payee_seat = req_b, seat_b

        return {
            "paymentRequired": True,
            "payer": _party(payer_req, payer_seat),
            "payee": _party(payee_req, payee_seat),
            "priceDifference": float(diff),
            "surcharge": float(SWAP_SURCHARGE),
        }
    finally:
        db.close()
