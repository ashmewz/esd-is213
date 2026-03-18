import json
import pika
from config import Config

def publish_event(routing_key, message):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=Config.RABBITMQ_HOST)
    )
    channel = connection.channel()

    channel.exchange_declare(exchange="events", exchange_type="topic")

    channel.basic_publish(
        exchange="events",
        routing_key=routing_key,
        body=json.dumps(message)
    )

    connection.close()