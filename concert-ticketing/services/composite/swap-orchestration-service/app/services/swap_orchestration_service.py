"""
Scenario C: Seat Swap Orchestration Service — full flow including Stripe refund.

Steps covered:
  C2/C3   start_swap          – submit request, attempt match, publish swap.matched
  C10-C14 respond_to_swap     – record accept/decline, drive payment or execution
  C16B                        – publish swap.payment.required with paymentMethodId
  C22     on_payment_settled  – consume swap.payment.settled → execute swap
  C22     on_payment_failed   – consume swap.payment.failed → refund + publish swap.failed
  C23-C25 _execute_swap       – call Seat Allocation POST /swaps/{matchId}/execute
  C26     publish swap.completed / swap.failed
"""
import logging

from app.clients.swap_client import (
    create_swap_request,
    submit_swap_response,
    get_swap_status,
    get_swap_request as _get_request,
)
from app.clients.seat_client import SeatClient
from app.clients.payment_client import PaymentClient
from app.clients.events_client import EventClient
from app.messaging.producer import publish_event

logger = logging.getLogger(__name__)

EXCHANGE = "concert_ticketing"

seat_client = SeatClient()
payment_client = PaymentClient()
event_client = EventClient()

def start_swap(order_id, event_id, current_seat_id, desired_tier, current_tier=None):
    """
    Steps C2/C3: Persist swap request, attempt match.
    If matched → publish swap.matched (notifies both users via Notification Service).
    """
    result = create_swap_request(
        order_id, event_id, current_seat_id, desired_tier, current_tier=current_tier
    )
    match = result.get("match")

    if match:
        request_a_data = result.get("request", {})
        publish_event(EXCHANGE, "swap.matched", {
            "matchId": match["swapId"],
            "requestA": match["requestA"],
            "requestB": match["requestB"],
            "userA": request_a_data.get("orderId"),
            "seatA": request_a_data.get("currentSeatId"),
            "status": match["status"],
        })
        logger.info("Swap matched: matchId=%s", match["swapId"])

    return result

def respond_to_swap(swap_id, user_id, response, payment_method_id=None):
    """
    Steps C10–C14: Record user's ACCEPT/DECLINE.

    After both respond:
      - DECLINED by either  → publish swap.failed (no refund needed — no charge yet)
      - Both ACCEPTED       → check price delta (Step C15)
          → delta = 0        → execute immediately (Step C16A)
          → delta > 0        → publish swap.payment.required (Step C16B)
                               includes paymentMethodId for Stripe
    """
    result = submit_swap_response(swap_id, user_id, response)
    status = result.get("status")

    if status == "FAILED":
        # Declined — no payment has happened yet, just abort
        publish_event(EXCHANGE, "swap.failed", {
            "swapId": swap_id,
            "reason": "DECLINED",
            "requiresRefund": False,
        })
        return result

    if status == "READY_FOR_EXECUTION":
        price_delta = _calculate_price_delta(swap_id)

        if price_delta == 0:
            # Step C16A: Equal value — skip payment, go straight to execution
            logger.info("Swap %s: no price delta, executing directly", swap_id)
            _execute_swap(swap_id)
        else:
            # Step C16B: Price difference — publish payment required
            payer_order_id, payee_order_id = _determine_payer(swap_id, price_delta)
            logger.info(
                "Swap %s: price delta=%.2f, publishing payment.required", swap_id, abs(price_delta)
            )
            publish_event(EXCHANGE, "swap.payment.required", {
                "matchId": swap_id,
                "payerOrderId": payer_order_id,
                "payeeOrderId": payee_order_id,
                "amount": abs(price_delta),
                "currency": "SGD",
                # paymentMethodId is passed through from the frontend accept action
                # so the payment consumer can charge the right Stripe method
                "paymentMethodId": payment_method_id,
            })

    return result

def on_payment_settled(swap_id, transaction_id):
    """
    Step C22 (success): Called after swap.payment.settled is consumed.
    Proceeds to seat execution.
    """
    logger.info("Swap %s: payment settled (txn=%s), executing", swap_id, transaction_id)
    _execute_swap(swap_id, transaction_id=transaction_id)


def on_payment_failed(swap_id, reason="PAYMENT_FAILED"):
    """
    Step C22 (failure): Called after swap.payment.failed is consumed.

    Since the payment failed, no charge was taken — just abort the swap.
    Seat Allocation is not called. Publish swap.failed so Notification
    Service can inform both users.
    """
    logger.warning("Swap %s: payment failed (%s), aborting", swap_id, reason)
    publish_event(EXCHANGE, "swap.failed", {
        "swapId": swap_id,
        "reason": reason,
        "requiresRefund": False,   # payment never succeeded
    })


def refund_after_execution_failure(swap_id):
    """
    Called when seat execution fails AFTER payment has already been settled.
    Triggers a Stripe refund via the Payment Service API, then publishes swap.failed.
    """
    logger.error("Swap %s: execution failed after payment — triggering refund", swap_id)
    try:
        payment_client.refund_swap(swap_id, reason="requested_by_customer")
    except Exception:
        logger.exception("Could not trigger refund for swap %s — manual reconciliation needed", swap_id)

    publish_event(EXCHANGE, "swap.failed", {
        "swapId": swap_id,
        "reason": "EXECUTION_FAILED_AFTER_PAYMENT",
        "requiresRefund": True,
    })

def _execute_swap(swap_id, transaction_id=None):
    """
    Steps C23–C25: Call Seat Allocation Service to physically swap assignments.
    If execution fails and payment was already taken → trigger refund.
    """
    swap_data = get_swap_status(swap_id)
    if not swap_data:
        logger.error("Swap %s: data not found at execution time", swap_id)
        if transaction_id:
            refund_after_execution_failure(swap_id)
        else:
            publish_event(EXCHANGE, "swap.failed", {"swapId": swap_id, "reason": "DATA_NOT_FOUND"})
        return

    swap_info = swap_data.get("swap", {})
    req_a = _get_request(swap_info.get("requestA")) or {}
    req_b = _get_request(swap_info.get("requestB")) or {}

    order_a = req_a.get("orderId")
    order_b = req_b.get("orderId")
    seat_a = req_a.get("currentSeatId")
    seat_b = req_b.get("currentSeatId")

    if not all([order_a, order_b, seat_a, seat_b]):
        logger.error("Swap %s: missing order/seat data", swap_id)
        if transaction_id:
            refund_after_execution_failure(swap_id)
        return

    try:
        # Step C23: POST /swaps/{matchId}/execute → Seat Allocation Service
        result = seat_client.execute_swap(
            match_id=swap_id,
            order_a=order_a,
            order_b=order_b,
            seat_a=seat_a,
            seat_b=seat_b,
        )

        if result.get("status") == "SWAP_EXECUTED":
            # Step C26: Publish swap.completed
            publish_event(EXCHANGE, "swap.completed", {
                "matchId": swap_id,
                "orderA": order_a,
                "orderB": order_b,
                "oldSeatA": seat_a,
                "oldSeatB": seat_b,
                "newSeatA": seat_b,
                "newSeatB": seat_a,
                "transactionId": transaction_id,
                "status": "SWAP_COMPLETED",
            })
            logger.info("Swap %s completed successfully", swap_id)
        else:
            raise RuntimeError(f"Unexpected execution response: {result}")

    except Exception as exc:
        logger.exception("Swap execution failed for %s: %s", swap_id, str(exc))
        if transaction_id:
            # Payment was taken but execution failed — must refund
            refund_after_execution_failure(swap_id)
        else:
            publish_event(EXCHANGE, "swap.failed", {
                "swapId": swap_id,
                "reason": "EXECUTION_FAILED",
                "requiresRefund": False,
            })


# ── Price delta helpers ───────────────────────────────────────────────────────

def _calculate_price_delta(swap_id):
    """
    Step C15: Compute signed price difference between the two seats.
    Positive = request_a is upgrading (owes money).
    Zero = no payment required.
    Returns 0 on any resolution error (safe default).
    """
    swap_data = get_swap_status(swap_id)
    if not swap_data:
        return 0

    swap_info = swap_data.get("swap", {})
    req_a = _get_request(swap_info.get("requestA")) or {}
    req_b = _get_request(swap_info.get("requestB")) or {}

    event_id = req_a.get("eventId")
    seat_a_id = req_a.get("currentSeatId")
    seat_b_id = req_b.get("currentSeatId")

    if not all([event_id, seat_a_id, seat_b_id]):
        return 0

    try:
        seat_a = event_client.validate_seat(event_id, seat_a_id) or {}
        seat_b = event_client.validate_seat(event_id, seat_b_id) or {}
        price_a = float(seat_a.get("basePrice") or seat_a.get("price") or 0)
        price_b = float(seat_b.get("basePrice") or seat_b.get("price") or 0)
        return round(price_b - price_a, 2)
    except Exception:
        logger.exception("Could not resolve seat prices for swap %s", swap_id)
        return 0


def _determine_payer(swap_id, price_delta):
    swap_data = get_swap_status(swap_id)
    swap_info = (swap_data or {}).get("swap", {})
    req_a = _get_request(swap_info.get("requestA")) or {}
    req_b = _get_request(swap_info.get("requestB")) or {}

    order_a = req_a.get("orderId")
    order_b = req_b.get("orderId")

    if price_delta > 0:
        return order_a, order_b   # A pays B
    else:
        return order_b, order_a   # B pays A


def get_status(swap_id):
    return get_swap_status(swap_id)