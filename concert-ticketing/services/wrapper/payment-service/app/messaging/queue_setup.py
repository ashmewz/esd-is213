import pika
import os


RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
EXCHANGE_NAME = "events"

# Routing keys
ROUTING_KEY_REFUND_REQUIRED = "payment.refund_required"
ROUTING_KEY_REFUND_ISSUED = "payment.refund_issued"


def get_connection():
    return pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST)
    )


def setup_queues():
    """Declare the exchange and queues Payment Service needs.

    Safe to call multiple times — RabbitMQ ignores declarations that already exist.
    """
    connection = get_connection()
    channel = connection.channel()

    # Declare the shared topic exchange
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

    # Declare the queue Payment Service consumes from
    channel.queue_declare(queue="payment.refund_required", durable=True)
    channel.queue_bind(
        exchange=EXCHANGE_NAME,
        queue="payment.refund_required",
        routing_key=ROUTING_KEY_REFUND_REQUIRED,
    )

    connection.close()
    print(f"[PaymentService] Queues declared on exchange '{EXCHANGE_NAME}'")
