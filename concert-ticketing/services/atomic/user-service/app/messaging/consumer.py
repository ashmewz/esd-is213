import pika
from config import Config

def start_consumer():

    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=Config.RABBITMQ_HOST)
    )
    channel = connection.channel()

    channel.exchange_declare(exchange="events", exchange_type="topic")

    result = channel.queue_declare(queue='', exclusive=True)
    queue_name = result.method.queue

    channel.queue_bind(exchange="events", queue=queue_name, routing_key="order.*")

    def callback(ch, method, properties, body):
        print(f"[UserService] Received: {body}")

    channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)

    print("User Service listening...")
    channel.start_consuming()