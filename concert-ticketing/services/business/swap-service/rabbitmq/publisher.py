import json, pika
from rabbitmq.connection import get_channel
from rabbitmq.config import EXCHANGE_NAME, EXCHANGE_TYPE

def publish_message(routing_key: str, message: dict):
    connection, channel = get_channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE, durable=True)
    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=routing_key,
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    connection.close()