import json
import threading
import pika
from config import RABBITMQ_URL, EXCHANGE_NAME, EXCHANGE_TYPE, NOTIFICATION_QUEUE, ROUTING_KEYS
from app.services.notification import send_notification


def on_message(ch, method, properties, body):
    data = json.loads(body)
    routing_key = method.routing_key
    print(f"[x] Received message on {routing_key}: {data}")
    send_notification(routing_key, data)
    ch.basic_ack(delivery_tag=method.delivery_tag)


def start_consumer():
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE, durable=True)
    channel.queue_declare(queue=NOTIFICATION_QUEUE, durable=True)

    for routing_key in ROUTING_KEYS:
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=NOTIFICATION_QUEUE, routing_key=routing_key)

    channel.basic_consume(queue=NOTIFICATION_QUEUE, on_message_callback=on_message)
    print(f"[x] Notification service listening on: {ROUTING_KEYS}")
    channel.start_consuming()


def start_consumer_thread():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()
