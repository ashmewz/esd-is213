from app.clients.swap_client import (
    create_swap_request,
    get_swap_status_by_request,
    submit_swap_response,
    get_swap_status,
    list_swap_requests_by_user,
    cancel_swap_request as _cancel_swap_request,
    get_available_swap_requests as _get_available,
    get_swap_request,
)
from app.clients.user_client import get_user
from app.clients.events_client import get_event, get_seat, seat_label, update_seat_status
from app.clients.seat_allocation_client import execute_swap as _execute_swap
from app.clients.order_client import update_order_seat
from app.clients.payment_client import (
    get_payment_by_order,
    charge_swap_settlement,
    refund_swap_difference,
    PLATFORM_FEE_RATE,
)
from app.messaging.producer import publish_event

EXCHANGE = "concert_ticketing"

_STATUS_MAP = {
    "PENDING": "pending",
    "MATCHED": "awaiting_confirmation",
    "COMPLETED": "completed",
    "FAILED": "failed",
    "CANCELLED": "cancelled",
}


def _enrich(req):
    user_id = req.get("userId")
    if user_id:
        user = get_user(user_id)
        if user:
            req["email"] = user.get("email")
    # Add human-readable seat label
    event_id = req.get("eventId")
    seat_id = req.get("currentSeatId")
    if event_id and seat_id:
        s = get_seat(event_id, seat_id)
        if s:
            req["currentSeatLabel"] = seat_label(s)
    return req


def _get_seat_price(event_id, seat_id):
    """Return the base price of a seat, or 0 if unavailable."""
    if not event_id or not seat_id:
        return 0
    s = get_seat(event_id, seat_id)
    return float(s.get("basePrice", 0)) if s else 0


def start_swap(order_id, event_id, current_seat_id, desired_tier, current_tier=None, user_id=None):
    result = create_swap_request(
        order_id, event_id, current_seat_id, desired_tier,
        current_tier=current_tier, user_id=user_id,
    )
    match = result.get("match")
    if match:
        req_a = _enrich(match.get("requestADetails", {}))
        req_b = _enrich(match.get("requestBDetails", {}))

        # Calculate price difference so users know what they're agreeing to
        price_a = _get_seat_price(event_id, req_a.get("currentSeatId"))
        price_b = _get_seat_price(event_id, req_b.get("currentSeatId"))
        price_diff = abs(price_a - price_b)
        platform_fee = round(price_diff * PLATFORM_FEE_RATE, 2)

        event = get_event(event_id) or {}
        event_name = event.get("name", "")
        raw_date = event.get("eventDate") or event.get("date", "")
        event_date = raw_date[:10] if raw_date else ""

        publish_event(EXCHANGE, "swap.matched", {
            "matchId": match["swapId"],
            "requestADetails": req_a,
            "requestBDetails": req_b,
            "priceDiff": price_diff,
            "platformFee": platform_fee,
            "currency": "SGD",
            "eventName": event_name,
            "eventDate": event_date,
        })
    return result


def respond_to_swap(swap_id, user_id, response, matched_request_id):
    result = submit_swap_response(swap_id, user_id, response)
    swap_data = get_swap_status(swap_id)
    status = swap_data.get("status") if swap_data else None
 
    if status == "READY_FOR_EXECUTION":
        swap_data = get_swap_status(swap_id)
        if swap_data:
            swap = swap_data.get("swap", {})
            req_a_id = swap.get("requestA")
            req_b_id = swap.get("requestB")
            req_a = get_swap_request(req_a_id) or {}
            req_b = get_swap_request(req_b_id) or {}
 
            # Use matched_request_id to identify offerer (User B) vs lister (User A)
            # so payment direction is always correct regardless of requestA/B ordering.
            if str(matched_request_id) == str(req_b_id):
                offerer_req, lister_req = req_b, req_a
            else:
                offerer_req, lister_req = req_a, req_b
 
            order_a  = lister_req.get("orderId")
            seat_a   = lister_req.get("currentSeatId")
            order_b  = offerer_req.get("orderId")
            seat_b   = offerer_req.get("currentSeatId")
            tier_a   = lister_req.get("currentTier")
            tier_b   = offerer_req.get("currentTier")
            event_id = lister_req.get("eventId")
 
            price_a = _get_seat_price(event_id, seat_a)
            price_b = _get_seat_price(event_id, seat_b)
            price_diff = abs(price_a - price_b)
            platform_fee = round(price_diff * PLATFORM_FEE_RATE, 2)
 
            payment_info = {}
            if price_diff > 0:
                if price_b > price_a:
                    upgrading_order     = order_a
                    upgrading_user_id   = lister_req.get("userId")
                    downgrading_order   = order_b
                    downgrading_user_id = offerer_req.get("userId")
                else:
                    upgrading_order     = order_b
                    upgrading_user_id   = offerer_req.get("userId")
                    downgrading_order   = order_a
                    downgrading_user_id = lister_req.get("userId")
 
                charge_result = charge_swap_settlement(upgrading_order, upgrading_user_id, price_diff)
                if not charge_result or charge_result.get("status") != "SUCCESS":
                    reason = (charge_result or {}).get("reason", "Payment failed")
                    result["paymentError"] = reason
                    return result
 
                orig_txn = get_payment_by_order(downgrading_order)
                if orig_txn and orig_txn.get("externalRefId"):
                    refund_result = refund_swap_difference(
                        downgrading_order,
                        downgrading_user_id,
                        price_diff,
                        orig_txn.get("currency", "SGD"),
                        orig_txn["externalRefId"],
                    )
                    payment_info["refundStatus"] = (refund_result or {}).get("status")
                else:
                    print(f"[swap-orchestration] No payment intent for order {downgrading_order} — skipping refund")
 
                payment_info["priceDiff"] = price_diff
                payment_info["platformFee"] = platform_fee
                payment_info["totalCharged"] = round(price_diff + platform_fee, 2)
 
            _execute_swap(order_a, seat_a, order_b, seat_b)

            # Update order records so each order reflects the new seat
            update_order_seat(order_a, seat_b)
            update_order_seat(order_b, seat_a)

            if event_id:
                update_seat_status(event_id, seat_a, "sold")
                update_seat_status(event_id, seat_b, "sold")
 
            user_a = get_user(lister_req.get("userId")) or {}
            user_b = get_user(offerer_req.get("userId")) or {}

            # Enrich seat labels and event info for the notification
            seat_a_data = get_seat(event_id, seat_a) or {}
            seat_b_data = get_seat(event_id, seat_b) or {}
            event_data  = get_event(event_id) or {}
            event_name  = event_data.get("name", "")
            raw_date    = event_data.get("eventDate") or event_data.get("date", "")
            event_date  = raw_date[:10] if raw_date else ""
            venue_name  = event_data.get("venueName", "")

            publish_event(EXCHANGE, "swap.completed", {
                "swapId": swap_id,
                "matchedRequestId": matched_request_id,
                "eventName": event_name,
                "eventDate": event_date,
                "venueName": venue_name,
                "userA": {
                    "userId": lister_req.get("userId"),
                    "email": user_a.get("email"),
                    "oldSeatId": seat_a,
                    "newSeatId": seat_b,
                    "oldSeatLabel": seat_label(seat_a_data),
                    "newSeatLabel": seat_label(seat_b_data),
                    "oldTier": tier_a,
                    "tier": tier_b,
                    **({
                        "priceDiff": payment_info.get("priceDiff"),
                        "platformFee": payment_info.get("platformFee"),
                        "totalCharged": payment_info.get("totalCharged"),
                        "paymentType": "refund",
                    } if price_b > price_a and payment_info else {}),
                },
                "userB": {
                    "userId": offerer_req.get("userId"),
                    "email": user_b.get("email"),
                    "oldSeatId": seat_b,
                    "newSeatId": seat_a,
                    "oldSeatLabel": seat_label(seat_b_data),
                    "newSeatLabel": seat_label(seat_a_data),
                    "oldTier": tier_b,
                    "tier": tier_a,
                    **({
                        "priceDiff": payment_info.get("priceDiff"),
                        "platformFee": payment_info.get("platformFee"),
                        "totalCharged": payment_info.get("totalCharged"),
                        "paymentType": "charge",
                    } if price_a > price_b and payment_info else {}),
                },
            })
 
    elif status == "FAILED":
        swap_data = get_swap_status(swap_id)
        if swap_data:
            swap = swap_data.get("swap", {})
            req_a = get_swap_request(swap.get("requestA")) or {}
            req_b = get_swap_request(swap.get("requestB")) or {}
            user_a = get_user(req_a.get("userId")) or {}
            user_b = get_user(req_b.get("userId")) or {}
            publish_event(EXCHANGE, "swap.failed", {
                "swapId": swap_id,
                "matchedRequestId": matched_request_id,
                "userIdA": req_a.get("userId"),
                "userIdB": req_b.get("userId"),
                "emailA": user_a.get("email"),
                "emailB": user_b.get("email"),
            })
 
    return result


def get_status(swap_id):
    return get_swap_status(swap_id)


def get_my_swap_requests(user_id):
    raw = list_swap_requests_by_user(user_id)
    event_cache = {}
    seat_cache = {}

    def _event(eid):
        if eid not in event_cache:
            event_cache[eid] = get_event(eid) or {}
        return event_cache[eid]

    def _seat(eid, sid):
        k = f"{eid}:{sid}"
        if k not in seat_cache:
            seat_cache[k] = get_seat(eid, sid)
        return seat_cache[k]

    result = []
    for req in raw:
        eid = req.get("eventId")
        sid = req.get("currentSeatId")

        ev = _event(eid) if eid else {}
        s  = _seat(eid, sid) if (eid and sid) else None

        swap_id = None
        matched_request_id = None
        matched_seat = None
        user_has_responded = False

        if req.get("status") in ["MATCHED", "COMPLETED"]:
            swap_data = get_swap_status_by_request(req["requestId"])

            if swap_data:
                swap_id = swap_data.get("swapId")

                if swap_data.get("requestA") == req["requestId"]:
                    matched_request_id = swap_data.get("requestB")
                else:
                    matched_request_id = swap_data.get("requestA")

                # Look up the matched request to get its seat
                if matched_request_id:
                    matched_req = get_swap_request(matched_request_id)
                    if matched_req:
                        matched_seat_id = matched_req.get("currentSeatId")
                        matched_seat = _seat(eid, matched_seat_id) if (eid and matched_seat_id) else None

                # Check if this user has already responded
                if swap_id:
                    full_swap = get_swap_status(swap_id)
                    if full_swap:
                        confirmations = full_swap.get("confirmations", [])
                        user_has_responded = any(
                            str(c.get("userId")) == str(user_id) for c in confirmations
                        )

        result.append({
            **req,
            "eventName": ev.get("name"),
            "eventDate": ev.get("eventDate") or ev.get("date"),
            "currentSeatLabel": seat_label(s) if s else None,
            "matchedSeatLabel": seat_label(matched_seat) if matched_seat else None,
            "swapStatus": _STATUS_MAP.get(req.get("status", ""), "pending"),
            "swapId": swap_id,
            "matchedRequestId": matched_request_id,
            "userHasResponded": user_has_responded,
        })
    return result


def cancel_swap(request_id):
    return _cancel_swap_request(request_id)


def get_available_swaps(event_id, tier, exclude_user_id=None):
    raw = _get_available(event_id, tier, exclude_user_id)
    seat_cache = {}

    def _seat(eid, sid):
        k = f"{eid}:{sid}"
        if k not in seat_cache:
            seat_cache[k] = get_seat(eid, sid)
        return seat_cache[k]

    result = []
    for req in raw:
        eid = req.get("eventId")
        sid = req.get("currentSeatId")
        s = _seat(eid, sid) if (eid and sid) else None
        result.append({
            **req,
            "currentSeatLabel": seat_label(s) if s else None,
        })
    return result
