import json
import os
import time
import threading
import uuid

import pika

from app.core.database import SessionLocal
from app.models.payment_models import Transaction
from app.providers.stripe_provider import StripeProvider
from app.providers.mock_provider import MockPaymentProvider
from app.messaging.producer import publish_event, RABBITMQ_URL, EXCHANGE_NAME
from app.messaging.queue_setup import QUEUE_NAME, ROUTING_KEYS

MAX_RETRIES = 5
RETRY_BACKOFF_BASE = 2

_provider = StripeProvider() if os.getenv("STRIPE_SECRET_KEY") else MockPaymentProvider()


def _handle_refund_required(data: dict):
    order_id = str(data.get("orderId", ""))
    if not order_id:
        print("[payment] refund.required: missing orderId — skipping.")
        return

    db = SessionLocal()
    try:
        # Look up the original successful PAYMENT transaction for this order
        original = (
            db.query(Transaction)
            .filter(
                Transaction.order_id == order_id,
                Transaction.type == "PAYMENT",
                Transaction.status == "SUCCESS",
            )
            .order_by(Transaction.created_at.desc())
            .first()
        )

        if not original:
            print(f"[payment] No successful PAYMENT transaction for orderId={order_id} — cannot refund.")
            return

        amount = float(original.amount)
        currency = original.currency
        external_ref_id = original.external_ref_id

        # Step 7: call external payment API
        result = _provider.refund(
            external_ref_id=external_ref_id or "",
            amount=amount,
            currency=currency,
        )

        # Step 9: store refund record
        refund_txn = Transaction(
            order_id=order_id,
            user_id=original.user_id,
            type="REFUND",
            amount=amount,
            currency=currency,
            external_ref_id=result.provider_txn_id if result.success else None,
            status="SUCCESS" if result.success else "FAILED",
            failure_reason=result.failure_reason if not result.success else None,
        )
        db.add(refund_txn)
        db.commit()
        db.refresh(refund_txn)

        if result.success:
            # Step 10: publish payment.refund.issued
            publish_event("payment.refund.issued", {
                "orderId": order_id,
                "userId": original.user_id,
                "transactionId": str(refund_txn.transaction_id),
                "amount": amount,
                "currency": currency,
            })
            print(f"[payment] Refund issued for orderId={order_id}, amount={amount} {currency}")
        else:
            print(f"[payment] Refund FAILED for orderId={order_id}: {result.failure_reason}")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def on_message(ch, method, properties, body):
    routing_key = method.routing_key
    try:
        data = json.loads(body)
        print(f"[payment] Received '{routing_key}': {data}")

        if routing_key == "refund.required":
            _handle_refund_required(data)

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except json.JSONDecodeError as e:
        print(f"[payment] Malformed message: {e} — discarding.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        print(f"[payment] Error processing '{routing_key}': {e} — requeuing.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def start_consumer():
    attempt = 0
    while True:
        try:
            print(f"[payment] Connecting to RabbitMQ (attempt {attempt + 1})...")
            params = pika.URLParameters(RABBITMQ_URL)
            params.heartbeat = 60
            params.blocked_connection_timeout = 300
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            for rk in ROUTING_KEYS:
                channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key=rk)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_message)

            attempt = 0
            print(f"[payment] Listening on: {ROUTING_KEYS}")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[payment] RabbitMQ connection failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)

        except KeyboardInterrupt:
            print("[payment] Consumer stopped.")
            break

        except Exception as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[payment] Unexpected error: {e}. Retrying in {wait}s...")
            time.sleep(wait)


def start_consumer_thread():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()
