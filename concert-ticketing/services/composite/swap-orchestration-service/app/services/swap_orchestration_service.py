from app.clients.swap_client import (
    create_swap_request,
    submit_swap_response,
    get_swap_status,
)
from app.clients.seat_allocation_client import SeatAllocationClient
from app.clients.payment_client import PaymentClient
from app.clients.event_client import EventClient
from app.messaging.producer import publish_event

EXCHANGE = "concert_ticketing"

seat_client = SeatAllocationClient()
payment_client = PaymentClient()
event_client = EventClient()


def start_swap(order_id, event_id, current_seat_id, desired_tier, current_tier=None):
    """
    Step C2/C3: Persist swap request and attempt immediate matching.
    If a match is found, publish swap.matched so Notification Service
    can notify both parties to accept or decline.
    """
    result = create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=current_tier)
    match = result.get("match")

    if match:
        # Enrich the match event with seat IDs so Notification Service
        # can tell each user what they'd be swapping to.
        request_a_data = result.get("request", {})
        publish_event(EXCHANGE, "swap.matched", {
            "matchId": match["swapId"],
            "requestA": match["requestA"],
            "requestB": match["requestB"],
            "userA": request_a_data.get("orderId"),   # orchestration resolves to userId via order
            "seatA": request_a_data.get("currentSeatId"),
            "status": match["status"],
        })

    return result


def respond_to_swap(swap_id, user_id, response):
    """
    Steps C10–C14: Submit a user response and evaluate overall swap status.

    After both parties respond:
      - If either DECLINED → publish swap.failed
      - If both ACCEPTED  → check whether a price delta exists (Step C15)
          - No delta       → proceed directly to execution (Step C16A)
          - Delta exists   → publish swap.payment.required (Step C16B)
    """
    result = submit_swap_response(swap_id, user_id, response)
    status = result.get("status")

    if status == "FAILED":
        publish_event(EXCHANGE, "swap.failed", {"swapId": swap_id, "reason": "DECLINED"})
        return result

    if status == "READY_FOR_EXECUTION":
        # ── Step C15: Check payment settlement requirement ──
        price_delta = _calculate_price_delta(swap_id)

        if price_delta == 0:
            # ── Step C16A: No payment difference — execute immediately ──
            _execute_swap(swap_id)
        else:
            # ── Step C16B: Price delta exists — trigger payment settlement ──
            swap_data = get_swap_status(swap_id)
            swap_info = swap_data.get("swap", {}) if swap_data else {}

            payer_order_id, payee_order_id = _determine_payer(swap_id, price_delta)

            publish_event(EXCHANGE, "swap.payment.required", {
                "matchId": swap_id,
                "payerOrderId": payer_order_id,
                "payeeOrderId": payee_order_id,
                "amount": abs(price_delta),
                "currency": "SGD",
            })

    return result


def execute_swap_after_payment(swap_id, transaction_id):
    """
    Step C22: Called by the consumer that listens on swap.payment.settled.
    Proceeds to seat execution after successful payment settlement.
    """
    _execute_swap(swap_id, transaction_id=transaction_id)


def abort_swap_after_payment_failure(swap_id, reason="PAYMENT_FAILED"):
    """
    Step C22 (failure path): Called by the consumer that listens on swap.payment.failed.
    """
    publish_event(EXCHANGE, "swap.failed", {
        "swapId": swap_id,
        "reason": reason,
    })


def _execute_swap(swap_id, transaction_id=None):
    """
    P1 GAP FIX: Steps C23–C25 — call Seat Allocation Service to physically
    swap the seat assignments between the two orders.

    Previously the orchestrator published swap.completed immediately without
    ever calling the allocation service, meaning seats were never actually swapped.
    """
    swap_data = get_swap_status(swap_id)
    if not swap_data:
        publish_event(EXCHANGE, "swap.failed", {
            "swapId": swap_id,
            "reason": "SWAP_DATA_NOT_FOUND",
        })
        return

    swap_info = swap_data.get("swap", {})
    request_a_id = swap_info.get("requestA")
    request_b_id = swap_info.get("requestB")

    # Resolve order IDs and seat IDs from the two swap requests
    # (swap_client.get_swap_request returns the full SwapRequest dict)
    from app.clients.swap_client import get_swap_request as _get_request
    req_a = _get_request(request_a_id) or {}
    req_b = _get_request(request_b_id) or {}

    order_a = req_a.get("orderId")
    order_b = req_b.get("orderId")
    seat_a = req_a.get("currentSeatId")
    seat_b = req_b.get("currentSeatId")

    if not all([order_a, order_b, seat_a, seat_b]):
        publish_event(EXCHANGE, "swap.failed", {
            "swapId": swap_id,
            "reason": "MISSING_SWAP_DETAILS",
        })
        return

    try:
        # Step C23: POST /swaps/{matchId}/execute  →  Seat Allocation Service
        result = seat_client.execute_swap(
            match_id=swap_id,
            order_a=order_a,
            order_b=order_b,
            seat_a=seat_a,
            seat_b=seat_b,
        )

        if result.get("status") == "SWAP_EXECUTED":
            # Step C26: Publish final success outcome
            publish_event(EXCHANGE, "swap.completed", {
                "matchId": swap_id,
                "orderA": order_a,
                "orderB": order_b,
                "oldSeatA": seat_a,
                "oldSeatB": seat_b,
                "newSeatA": seat_b,   # A now sits in B's old seat
                "newSeatB": seat_a,   # B now sits in A's old seat
                "transactionId": transaction_id,
                "status": "SWAP_COMPLETED",
            })
        else:
            raise RuntimeError(f"Execution returned unexpected status: {result}")

    except Exception as exc:
        publish_event(EXCHANGE, "swap.failed", {
            "swapId": swap_id,
            "reason": "EXECUTION_FAILED",
            "detail": str(exc),
        })


def _calculate_price_delta(swap_id):
    """
    P2 GAP: Compute the price difference between the two seats being swapped.
    Returns a signed delta: positive means request_a owes request_b money.
    Returns 0 if prices cannot be resolved (safe default = no payment required).
    """
    swap_data = get_swap_status(swap_id)
    if not swap_data:
        return 0

    swap_info = swap_data.get("swap", {})
    from app.clients.swap_client import get_swap_request as _get_request
    req_a = _get_request(swap_info.get("requestA")) or {}
    req_b = _get_request(swap_info.get("requestB")) or {}

    seat_a_id = req_a.get("currentSeatId")
    seat_b_id = req_b.get("currentSeatId")
    event_id = req_a.get("eventId")

    if not all([seat_a_id, seat_b_id, event_id]):
        return 0

    try:
        seat_a = event_client.validate_seat(event_id, seat_a_id) or {}
        seat_b = event_client.validate_seat(event_id, seat_b_id) or {}
        price_a = float(seat_a.get("basePrice") or seat_a.get("price") or 0)
        price_b = float(seat_b.get("basePrice") or seat_b.get("price") or 0)
        return price_b - price_a   # positive = A is upgrading, owes B the difference
    except Exception:
        return 0


def _determine_payer(swap_id, price_delta):
    """
    Returns (payer_order_id, payee_order_id).
    The payer is whoever is moving to the more expensive seat.
    """
    swap_data = get_swap_status(swap_id)
    swap_info = (swap_data or {}).get("swap", {})
    from app.clients.swap_client import get_swap_request as _get_request
    req_a = _get_request(swap_info.get("requestA")) or {}
    req_b = _get_request(swap_info.get("requestB")) or {}

    order_a = req_a.get("orderId")
    order_b = req_b.get("orderId")

    # price_delta = price_b - price_a
    # positive → A is upgrading (A pays B)
    # negative → B is upgrading (B pays A)
    if price_delta > 0:
        return order_a, order_b
    else:
        return order_b, order_a


def get_status(swap_id):
    return get_swap_status(swap_id)