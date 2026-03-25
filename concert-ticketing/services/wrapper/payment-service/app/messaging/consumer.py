import json
import logging
import pika
from app.messaging.queue_setup import get_connection, EXCHANGE_NAME, ROUTING_KEY_REFUND_REQUIRED
from app.messaging.producer import publish_refund_issued

logger = logging.getLogger(__name__)


def handle_refund_required(ch, method, properties, body):
    """Handle a RefundRequired event from Seat Allocation Service.

    Called automatically when a message arrives on payment.refund_required queue.
    Triggered when a seat cannot be reassigned after a seat map change (Scenario B).
    """
    try:
        data = json.loads(body)
        logger.info("[PaymentService] Received RefundRequired: %s", data)

        order_id = data.get("orderId")
        user_id = data.get("userId")
        amount = data.get("amount")
        currency = data.get("currency", "SGD")
        idempotency_key = data.get("idempotencyKey")

        if not order_id or not user_id or not amount:
            logger.error("[PaymentService] Invalid RefundRequired message — missing fields: %s", data)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Import here to avoid circular imports at module level
        from app.services.payment_service import process_refund

        txn = process_refund(
            order_id=order_id,
            user_id=user_id,
            amount=amount,
            currency=currency,
            idempotency_key=idempotency_key,
        )

        # Publish result back to RabbitMQ (step 10 in Scenario B)
        publish_refund_issued(
            order_id=order_id,
            user_id=user_id,
            transaction_id=str(txn.transaction_id),
            amount=float(txn.amount),
            currency=txn.currency,
            status=txn.status,
        )

    except Exception:
        logger.exception("[PaymentService] Error processing RefundRequired message")

    finally:
        # Always acknowledge so the message is removed from the queue
        ch.basic_ack(delivery_tag=method.delivery_tag)


def start_consumer(app):
    """Start listening for RefundRequired events.

    Runs in a background thread — app context is passed in so SQLAlchemy
    db.session works correctly inside the callback.
    """
    def run():
        with app.app_context():
            connection = get_connection()
            channel = connection.channel()

            channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
            channel.queue_declare(queue="payment.refund_required", durable=True)
            channel.queue_bind(
                exchange=EXCHANGE_NAME,
                queue="payment.refund_required",
                routing_key=ROUTING_KEY_REFUND_REQUIRED,
            )

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(
                queue="payment.refund_required",
                on_message_callback=handle_refund_required,
            )

            print("[PaymentService] Listening for RefundRequired events...")
            channel.start_consuming()

    import threading
    thread = threading.Thread(target=run, daemon=True)
    thread.start()
