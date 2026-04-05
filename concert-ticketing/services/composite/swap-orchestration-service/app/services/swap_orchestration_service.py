from app.clients.swap_client import (
    create_swap_request, submit_swap_response, get_swap_status,
    list_swap_requests_by_user, cancel_swap_request as _cancel_swap_request,
)
from app.clients.user_client import get_user
from app.clients.events_client import get_event, get_seat, seat_label
from app.messaging.producer import publish_event

EXCHANGE = "concert_ticketing"

def _enrich_request_with_email(request_details: dict) -> dict:
    """Add the user's email to a request details dict by looking up user-service."""
    user_id = request_details.get("userId")
    if user_id:
        user = get_user(user_id)
        if user:
            request_details["email"] = user.get("email")
    return request_details

def start_swap(order_id, event_id, current_seat_id, desired_tier, current_tier=None, user_id=None):
    result = create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=current_tier, user_id=user_id)

    match = result.get("match")

    if match:
        # Enrich both parties' details with their email addresses
        request_a = _enrich_request_with_email(match.get("requestADetails", {}))
        request_b = _enrich_request_with_email(match.get("requestBDetails", {}))

        publish_event(EXCHANGE, "swap.matched", {
            "matchId": match["swapId"],
            "status": match["status"],
            "requestADetails": request_a,
            "requestBDetails": request_b,
            "paymentRequired": match.get("paymentRequired", False),
            "priceDifference": match.get("priceDifference", 0),
            "surcharge": match.get("surcharge", 2.0),
        })

    return result

def respond_to_swap(swap_id, user_id, response):
    """Submit a user response to a swap and evaluate."""
    result = submit_swap_response(swap_id, user_id, response)
    status = result.get("status")

    if status == "READY_FOR_EXECUTION":
        publish_event(EXCHANGE, "swap.completed", {
            "swapId": swap_id
        })
    elif status == "PAYMENT_REQUIRED":
        payer = result.get("payer") or {}
        payee = result.get("payee") or {}
        payer_user = get_user(payer.get("userId")) if payer.get("userId") else {}
        payee_user = get_user(payee.get("userId")) if payee.get("userId") else {}
        payer["email"] = (payer_user or {}).get("email")
        payee["email"] = (payee_user or {}).get("email")
        publish_event(EXCHANGE, "swap.payment_required", {
            "swapId": swap_id,
            "payer": payer,
            "payee": payee,
            "priceDifference": result.get("priceDifference"),
            "surcharge": result.get("surcharge", 2.0),
            "email": payer.get("email"),   # top-level for standard notification routing
        })
    elif status == "FAILED":
        publish_event(EXCHANGE, "swap.failed", {
            "swapId": swap_id
        })

    return result

def get_status(swap_id):
    return get_swap_status(swap_id)


# Maps DB status (uppercase) → UI swapStatus (lowercase)
_STATUS_MAP = {
    "PENDING":              "pending",
    "MATCHED":              "awaiting_confirmation",
    "COMPLETED":            "completed",
    "READY_FOR_EXECUTION":  "completed",
    "FAILED":               "failed",
    "CANCELLED":            "cancelled",
}


def get_my_swap_requests(user_id: str) -> list:
    """
    Fetch a user's swap requests from swap-service and enrich each entry with:
      - eventName from events-service
      - currentSeatLabel from events-service
      - matchedTier / matchedSeatLabel for matched requests
    Returns a list formatted for the SwapPage UI.
    """
    raw = list_swap_requests_by_user(user_id)

    # Cache event lookups to avoid repeated calls for the same event
    event_cache: dict = {}
    seat_cache: dict = {}

    def _event(event_id):
        if event_id not in event_cache:
            event_cache[event_id] = get_event(event_id) or {}
        return event_cache[event_id]

    def _seat(event_id, seat_id):
        key = f"{event_id}:{seat_id}"
        if key not in seat_cache:
            seat_cache[key] = get_seat(event_id, seat_id)
        return seat_cache[key]

    result = []
    for req in raw:
        event_id  = req.get("eventId")
        seat_id   = req.get("currentSeatId")
        event     = _event(event_id) if event_id else {}
        seat      = _seat(event_id, seat_id) if (event_id and seat_id) else None

        # Matched seat enrichment
        matched_event_id = req.get("matchedEventId")
        matched_seat_id  = req.get("matchedSeatId")
        matched_seat = (
            _seat(matched_event_id, matched_seat_id)
            if (matched_event_id and matched_seat_id) else None
        )

        result.append({
            "requestId":        req.get("requestId"),
            "orderId":          req.get("orderId"),
            "eventId":          event_id,
            "eventName":        event.get("name") or event.get("eventName") or "N/A",
            "currentSeatId":    seat_id,
            "currentSeatLabel": seat_label(seat),
            "currentTier":      req.get("currentTier"),
            "desiredTier":      req.get("desiredTier"),
            "swapStatus":       _STATUS_MAP.get(req.get("status", ""), "pending"),
            "matchId":          req.get("matchId"),
            "matchedSeatLabel": seat_label(matched_seat) if matched_seat else None,
            "matchedTier":      req.get("matchedTier"),
            "priceDelta":       0,   # payment not yet implemented
            "offerExpiresAt":   None,
            "outcomeMessage":   None,
        })

    return result


def cancel_swap(request_id: str) -> dict:
    """Cancel a pending swap request."""
    return _cancel_swap_request(request_id)
