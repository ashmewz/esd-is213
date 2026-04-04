"""
queue_setup.py

Declare the exchange used by events-service (publisher only — no queue needed).
Safe to run multiple times (idempotent).
"""

import pika
from app.messaging.producer import RABBITMQ_URL, EXCHANGE_NAME


def setup_exchange():
    print("[*] Connecting to RabbitMQ...")
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type="topic",
        durable=True,
    )
    print(f"[✓] Exchange declared: '{EXCHANGE_NAME}' (type=topic)")

    connection.close()
    print("[✓] Exchange setup complete.")


if __name__ == "__main__":
    setup_exchange()
