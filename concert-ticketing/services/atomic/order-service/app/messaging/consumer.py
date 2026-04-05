"""
consumer.py  —  order-service

Scenario B (choreography): Step 13 — consume 'seat.reassigned' and
'payment.refund.issued' to update local order status.

  seat.reassigned       → update the OrderItem's seat_id to the new seat;
                          order status remains CONFIRMED
  payment.refund.issued → set order + all its items to CANCELLED
"""

import json
import time
import threading
import uuid

import pika

from app.core.database import SessionLocal
from app.models.order_models import Order, OrderItem
from app.messaging.queue_setup import RABBITMQ_URL, EXCHANGE_NAME, QUEUE_NAME, ROUTING_KEYS

MAX_RETRIES = 5
RETRY_BACKOFF_BASE = 2


def _as_uuid_or_none(value):
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


def _handle_seat_reassigned(data: dict):
    order_id = data.get("orderId")
    old_seat_id = data.get("oldSeatId")
    new_seat_id = data.get("newSeatId")

    if not order_id or not new_seat_id:
        print("[order] seat.reassigned: missing orderId or newSeatId — skipping.")
        return

    order_uuid = _as_uuid_or_none(order_id)
    new_seat_uuid = _as_uuid_or_none(new_seat_id)
    old_seat_uuid = _as_uuid_or_none(old_seat_id)

    if not order_uuid or not new_seat_uuid:
        print(f"[order] seat.reassigned: non-UUID orderId={order_id} or newSeatId={new_seat_id} — skipping.")
        return

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_id == order_uuid).first()
        if not order:
            print(f"[order] seat.reassigned: no local order found for orderId={order_id} — skipping.")
            return

        # Update the item whose seat_id matches oldSeatId (or the first item if no match)
        updated = False
        for item in order.items:
            if old_seat_uuid and item.seat_id == old_seat_uuid:
                item.seat_id = new_seat_uuid
                updated = True
                break

        if not updated and order.items:
            order.items[0].seat_id = new_seat_uuid
            updated = True

        if updated:
            db.commit()
            print(f"[order] Seat reassigned for orderId={order_id}: {old_seat_id} → {new_seat_id}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _handle_refund_issued(data: dict):
    order_id = data.get("orderId")

    if not order_id:
        print("[order] payment.refund.issued: missing orderId — skipping.")
        return

    order_uuid = _as_uuid_or_none(order_id)
    if not order_uuid:
        print(f"[order] payment.refund.issued: non-UUID orderId={order_id} — skipping.")
        return

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_id == order_uuid).first()
        if not order:
            print(f"[order] payment.refund.issued: no local order found for orderId={order_id} — skipping.")
            return

        order.status = "CANCELLED"
        for item in order.items:
            item.status = "CANCELLED"
        db.commit()
        print(f"[order] Order {order_id} marked CANCELLED after refund.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def on_message(ch, method, properties, body):
    routing_key = method.routing_key
    try:
        data = json.loads(body)
        print(f"[order] Received '{routing_key}': {data}")

        if routing_key == "seat.reassigned":
            _handle_seat_reassigned(data)
        elif routing_key == "payment.refund.issued":
            _handle_refund_issued(data)

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except json.JSONDecodeError as e:
        print(f"[order] Malformed message: {e} — discarding.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        print(f"[order] Error processing '{routing_key}': {e} — requeuing.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def start_consumer():
    attempt = 0
    while True:
        try:
            print(f"[order] Connecting to RabbitMQ (attempt {attempt + 1})...")
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
            print(f"[order] Listening on: {ROUTING_KEYS}")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[order] RabbitMQ connection failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)

        except KeyboardInterrupt:
            print("[order] Consumer stopped.")
            break

        except Exception as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[order] Unexpected error: {e}. Retrying in {wait}s...")
            time.sleep(wait)


def start_consumer_thread():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()
