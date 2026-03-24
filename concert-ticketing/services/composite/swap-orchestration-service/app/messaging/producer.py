import json, pika
from app.messaging.rabbitmq import get_channel

def publish_event(exchange, routing_key, payload):
    channel, conn = get_channel()
    channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)
    message = json.dumps(payload)
    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=message,
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2
        )
    )
    conn.close()