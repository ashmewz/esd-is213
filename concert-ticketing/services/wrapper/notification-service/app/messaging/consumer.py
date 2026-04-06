import json
import time
import threading
import pika
from config import RABBITMQ_URL, EXCHANGE_NAME, EXCHANGE_TYPE, NOTIFICATION_QUEUE, ROUTING_KEYS
from app.services.notification import send_notification
from app.services.order_client import update_order_status, update_order_seat

# Routing key → OutSystems order status (must match exactly what OutSystems accepts)
ORDER_STATUS_MAP = {
    "seat.reassigned":        "CONFIRMED",   # reassigned = still confirmed, new seat
    "payment.refund.issued":  "CANCELLED",   # refunded = order cancelled
}

MAX_RETRIES = 5
RETRY_BACKOFF_BASE = 2  # seconds — doubles each attempt: 2, 4, 8, 16, 32


def on_message(ch, method, properties, body):
    routing_key = method.routing_key
    try:
        data = json.loads(body)
        print(f"[x] Received message on '{routing_key}': {data}")
        send_notification(routing_key, data)

        # Step 13: update OutSystems order status if applicable
        new_status = ORDER_STATUS_MAP.get(routing_key)
        if new_status and data.get("orderId"):
            update_order_status(str(data["orderId"]), new_status)

        # Scenario B: also update the seat on the order after reassignment
        if routing_key == "seat.reassigned" and data.get("orderId") and data.get("newSeatId"):
            update_order_seat(str(data["orderId"]), str(data["newSeatId"]))

        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[✓] Successfully processed '{routing_key}'")
    except json.JSONDecodeError as e:
        # Malformed message — reject and discard, do not requeue
        print(f"[!] Failed to parse message body: {e}. Discarding message.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        # Something went wrong sending the notification — requeue for retry
        print(f"[!] Error handling message on '{routing_key}': {e}. Requeuing.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def start_consumer():
    attempt = 0
    while True:
        try:
            print(f"[*] Connecting to RabbitMQ (attempt {attempt + 1})...")
            params = pika.URLParameters(RABBITMQ_URL)
            params.heartbeat = 60
            params.blocked_connection_timeout = 300
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            # Declare exchange and queue (safe to run multiple times)
            channel.exchange_declare(
                exchange=EXCHANGE_NAME,
                exchange_type=EXCHANGE_TYPE,
                durable=True
            )
            channel.queue_declare(queue=NOTIFICATION_QUEUE, durable=True)

            for routing_key in ROUTING_KEYS:
                channel.queue_bind(
                    exchange=EXCHANGE_NAME,
                    queue=NOTIFICATION_QUEUE,
                    routing_key=routing_key
                )

            # Process one message at a time
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=NOTIFICATION_QUEUE, on_message_callback=on_message)

            attempt = 0  # Reset retry counter on successful connection
            print(f"[✓] Connected. Listening on routing keys: {ROUTING_KEYS}")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[!] RabbitMQ connection failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)

        except KeyboardInterrupt:
            print("[*] Consumer stopped.")
            break

        except Exception as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[!] Unexpected error: {e}. Retrying in {wait}s...")
            time.sleep(wait)


def start_consumer_thread():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()
