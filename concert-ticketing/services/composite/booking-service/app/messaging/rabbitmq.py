import pika
import json
import os

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
EXCHANGE_NAME = "concert_ticketing"

def publish_event(routing_key, payload):
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()

    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=routing_key,
        body=json.dumps(payload),
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2
        )
    )

    connection.close()