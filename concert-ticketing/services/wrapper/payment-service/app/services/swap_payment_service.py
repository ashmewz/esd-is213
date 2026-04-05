"""
Scenario C — Steps C17–C21: Swap payment settlement.

Consumes swap.payment.required from RabbitMQ, charges the payer via Stripe,
stores the transaction, then publishes swap.payment.settled or
swap.payment.failed back to RabbitMQ so the swap orchestrator can proceed.

Also exposes a refund service used when a swap is cancelled after payment.

Wire the consumer in your payment-service entrypoint:

    from app.consumers.swap_payment_consumer import start_consumer
    import threading
    threading.Thread(target=start_consumer, daemon=True).start()
"""
import json
import logging

import pika
import stripe

from app.core.database import SessionLocal
from app.models.payment_models import SwapPaymentTransaction
from app.clients.stripe_client import charge_customer, refund_payment
from app.messaging.producer import publish_event

logger = logging.getLogger(__name__)

EXCHANGE = "concert_ticketing"
QUEUE = "payment_service.swap_payment"
BINDING_KEY = "swap.payment.required"


# ── Consumer bootstrap ────────────────────────────────────────────────────────

def start_consumer(rabbitmq_url="amqp://guest:guest@localhost/"):
    connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
    channel = connection.channel()

    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=BINDING_KEY)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE, on_message_callback=_on_swap_payment_required)

    logger.info("Swap payment consumer started — listening on %s", BINDING_KEY)
    channel.start_consuming()


# ── Message handler ───────────────────────────────────────────────────────────

def _on_swap_payment_required(ch, method, properties, body):
    """
    Step C17: Consume SwapPaymentRequired.

    Payload:
    {
        "matchId":       "...",
        "payerOrderId":  "...",
        "payeeOrderId":  "...",
        "amount":        150.0,
        "currency":      "SGD",
        "paymentMethodId": "pm_..."   ← Stripe PaymentMethod ID collected by frontend
    }
    """
    try:
        payload = json.loads(body)
        match_id = payload["matchId"]
        payer_order_id = payload["payerOrderId"]
        payee_order_id = payload["payeeOrderId"]
        amount = float(payload["amount"])
        payment_method_id = payload.get("paymentMethodId")

        logger.info("SwapPaymentRequired received for match %s amount=%.2f", match_id, amount)

        result = process_swap_payment(
            match_id=match_id,
            payer_order_id=payer_order_id,
            payee_order_id=payee_order_id,
            amount=amount,
            payment_method_id=payment_method_id,
        )

        if result["status"] == "SETTLED":
            # Step C21a: Publish SwapPaymentSettled
            publish_event(EXCHANGE, "swap.payment.settled", {
                "matchId": match_id,
                "payerOrderId": payer_order_id,
                "payeeOrderId": payee_order_id,
                "transactionId": result["transactionId"],
                "amount": amount,
                "status": "SETTLED",
            })
        else:
            # Step C21b: Publish SwapPaymentFailed
            publish_event(EXCHANGE, "swap.payment.failed", {
                "matchId": match_id,
                "payerOrderId": payer_order_id,
                "reason": result.get("error", "PAYMENT_FAILED"),
            })

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception:
        logger.exception("Failed to process SwapPaymentRequired")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


# ── Core payment logic ────────────────────────────────────────────────────────

def process_swap_payment(match_id, payer_order_id, payee_order_id, amount, payment_method_id=None):
    """
    Steps C18–C20: Charge the payer via Stripe and store the transaction.

    If no payment_method_id is supplied (e.g. in tests), uses a mock Stripe
    test token so the flow can complete end-to-end in sandbox.

    Returns:
        { status: "SETTLED"|"FAILED", transactionId?, error? }
    """
    db = SessionLocal()
    try:
        # Use Stripe test token if no real payment method provided (sandbox only)
        pm_id = payment_method_id or "pm_card_visa"

        # Step C18: Charge payer via Stripe
        stripe_result = charge_customer(
            amount_sgd=amount,
            payment_method_id=pm_id,
            metadata={
                "matchId": match_id,
                "payerOrderId": payer_order_id,
                "payeeOrderId": payee_order_id,
                "type": "swap_settlement",
            },
        )

        # Step C20: Store transaction record
        transaction = SwapPaymentTransaction(
            match_id=match_id,
            payer_order_id=payer_order_id,
            payee_order_id=payee_order_id,
            amount=amount,
            currency="SGD",
            stripe_payment_intent_id=stripe_result["stripePaymentIntentId"],
            transaction_type="SWAP_CHARGE",
            status="SETTLED",
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        logger.info(
            "Swap payment settled: match=%s pi=%s amount=%.2f",
            match_id, stripe_result["stripePaymentIntentId"], amount,
        )

        return {
            "status": "SETTLED",
            "transactionId": str(transaction.transaction_id),
            "stripePaymentIntentId": stripe_result["stripePaymentIntentId"],
        }

    except stripe.error.CardError as exc:
        db.rollback()
        logger.warning("Card declined for swap %s: %s", match_id, exc.user_message)
        _store_failed_transaction(db, match_id, payer_order_id, payee_order_id, amount, str(exc))
        return {"status": "FAILED", "error": "CARD_DECLINED"}

    except stripe.error.StripeError as exc:
        db.rollback()
        logger.error("Stripe error for swap %s: %s", match_id, str(exc))
        _store_failed_transaction(db, match_id, payer_order_id, payee_order_id, amount, str(exc))
        return {"status": "FAILED", "error": "STRIPE_ERROR"}

    except Exception:
        db.rollback()
        logger.exception("Unexpected error processing swap payment for match %s", match_id)
        return {"status": "FAILED", "error": "INTERNAL_ERROR"}

    finally:
        db.close()


# ── Swap refund ───────────────────────────────────────────────────────────────

def refund_swap_payment(match_id, reason="requested_by_customer"):
    """
    Refund the swap settlement charge if the swap is cancelled or fails
    after payment has already been taken.

    Called by the swap orchestrator when swap.failed is received after
    a payment has been settled.

    Returns:
        { status: "REFUNDED"|"FAILED", refundId?, error? }
    """
    db = SessionLocal()
    try:
        # Find the original settled transaction for this match
        transaction = (
            db.query(SwapPaymentTransaction)
            .filter_by(match_id=match_id, status="SETTLED", transaction_type="SWAP_CHARGE")
            .order_by(SwapPaymentTransaction.created_at.desc())
            .first()
        )

        if not transaction:
            logger.info("No settled transaction found for match %s — nothing to refund", match_id)
            return {"status": "NO_CHARGE", "refundId": None}

        stripe_result = refund_payment(
            payment_intent_id=transaction.stripe_payment_intent_id,
            amount_sgd=float(transaction.amount),
            reason=reason,
            metadata={
                "matchId": match_id,
                "type": "swap_refund",
            },
        )

        # Record the refund transaction
        refund_record = SwapPaymentTransaction(
            match_id=match_id,
            payer_order_id=transaction.payer_order_id,
            payee_order_id=transaction.payee_order_id,
            amount=float(transaction.amount),
            currency="SGD",
            stripe_payment_intent_id=stripe_result["stripeRefundId"],
            transaction_type="SWAP_REFUND",
            status="REFUNDED",
            related_transaction_id=transaction.transaction_id,
        )
        db.add(refund_record)

        # Update original transaction status to REFUNDED
        transaction.status = "REFUNDED"
        db.commit()

        logger.info("Swap payment refunded: match=%s refundId=%s", match_id, stripe_result["refundId"])

        return {
            "status": "REFUNDED",
            "refundId": stripe_result["refundId"],
            "stripeRefundId": stripe_result["stripeRefundId"],
        }

    except stripe.error.InvalidRequestError as exc:
        db.rollback()
        logger.error("Stripe refund error for match %s: %s", match_id, str(exc))
        return {"status": "FAILED", "error": str(exc)}

    except Exception:
        db.rollback()
        logger.exception("Unexpected error refunding swap payment for match %s", match_id)
        return {"status": "FAILED", "error": "INTERNAL_ERROR"}

    finally:
        db.close()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _store_failed_transaction(db, match_id, payer_order_id, payee_order_id, amount, error_detail):
    try:
        record = SwapPaymentTransaction(
            match_id=match_id,
            payer_order_id=payer_order_id,
            payee_order_id=payee_order_id,
            amount=amount,
            currency="SGD",
            stripe_payment_intent_id=None,
            transaction_type="SWAP_CHARGE",
            status="FAILED",
            error_detail=error_detail,
        )
        db.add(record)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not store failed transaction record for match %s", match_id)