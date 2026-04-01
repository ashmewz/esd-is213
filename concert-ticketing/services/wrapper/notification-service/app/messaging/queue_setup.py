"""
queue_setup.py

Standalone script to declare the RabbitMQ exchange and queues.
Run this once before starting the service, or on every deploy — it is idempotent.

Usage:
    python queue_setup.py
"""

import pika
from config import RABBITMQ_URL, EXCHANGE_NAME, EXCHANGE_TYPE, NOTIFICATION_QUEUE, ROUTING_KEYS


def setup_queues():
    print(f"[*] Connecting to RabbitMQ...")
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    # Declare exchange
    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type=EXCHANGE_TYPE,
        durable=True
    )
    print(f"[✓] Exchange declared: '{EXCHANGE_NAME}' (type={EXCHANGE_TYPE})")

    # Declare notification queue
    channel.queue_declare(queue=NOTIFICATION_QUEUE, durable=True)
    print(f"[✓] Queue declared: '{NOTIFICATION_QUEUE}'")

    # Bind all routing keys
    for routing_key in ROUTING_KEYS:
        channel.queue_bind(
            exchange=EXCHANGE_NAME,
            queue=NOTIFICATION_QUEUE,
            routing_key=routing_key
        )
        print(f"   [+] Bound routing key: '{routing_key}'")

    connection.close()
    print("\n[✓] Queue setup complete.")


if __name__ == "__main__":
    setup_queues()