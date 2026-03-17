import json
from rabbitmq.connection import get_channel
from rabbitmq.config import EXCHANGE_NAME, EXCHANGE_TYPE

def start_consumer(queue_name: str, routing_key: str, callback):
    connection, channel = get_channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE, durable=True)
    channel.queue_declare(queue=queue_name, durable=True)
    channel.queue_bind(exchange=EXCHANGE_NAME, queue=queue_name, routing_key=routing_key)

    def on_message(ch, method, properties, body):
        data = json.loads(body)
        callback(data)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=queue_name, on_message_callback=on_message)
    print(f"[x] Waiting for messages in {queue_name}")
    channel.start_consuming()