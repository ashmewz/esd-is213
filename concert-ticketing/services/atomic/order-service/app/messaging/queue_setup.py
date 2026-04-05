"""
queue_setup.py

Declare the exchange, queue, and bindings for order-service.
Safe to run multiple times (idempotent).
"""

import os
import pika

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
EXCHANGE_NAME = "concert_ticketing"
QUEUE_NAME = "order_events_queue"
ROUTING_KEYS = [
    "seat.reassigned",        # Step 13: update order with new seat
    "payment.refund.issued",  # Step 13: cancel order after refund
]


def setup_queues():
    print("[*] Connecting to RabbitMQ...")
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
    print(f"[✓] Exchange declared: '{EXCHANGE_NAME}'")

    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    print(f"[✓] Queue declared: '{QUEUE_NAME}'")

    for routing_key in ROUTING_KEYS:
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key=routing_key)
        print(f"   [+] Bound routing key: '{routing_key}'")

    connection.close()
    print("[✓] Queue setup complete.")


if __name__ == "__main__":
    setup_queues()
