import pika
import json
from config import Config

def publish_event(event_name, payload):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=Config.RABBITMQ_HOST)
    )
    channel = connection.channel()

    channel.queue_declare(queue=event_name)

    channel.basic_publish(
        exchange='',
        routing_key=event_name,
        body=json.dumps(payload)
    )

    connection.close()