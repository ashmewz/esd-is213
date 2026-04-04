import json
import os

import pika

DEFAULT_RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"
DEFAULT_EXCHANGE = "concert_ticketing"


def publish_seatmap_changed(payload: dict) -> None:
    """Publish seatmap.changed on the shared topic exchange (durable)."""
    url = os.getenv("RABBITMQ_URL", DEFAULT_RABBITMQ_URL)
    exchange = os.getenv("RABBITMQ_EXCHANGE", DEFAULT_EXCHANGE)

    connection = pika.BlockingConnection(pika.URLParameters(url))
    try:
        channel = connection.channel()
        channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)
        channel.basic_publish(
            exchange=exchange,
            routing_key="seatmap.changed",
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
            ),
        )
    finally:
        connection.close()
