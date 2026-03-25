import json
import pika
from app.messaging.queue_setup import get_connection, EXCHANGE_NAME, ROUTING_KEY_REFUND_ISSUED


def publish_refund_issued(order_id: str, user_id: str, transaction_id: str,
                          amount: float, currency: str, status: str):
    """Publish paymentRefundIssued event after a refund is processed.

    Consumed by Order Service and Notification Service (step 10 in Scenario B).
    """
    message = {
        "orderId": order_id,
        "userId": user_id,
        "transactionId": transaction_id,
        "amount": amount,
        "currency": currency,
        "status": status,  # SUCCESS or FAILED
    }

    connection = get_connection()
    channel = connection.channel()

    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=ROUTING_KEY_REFUND_ISSUED,
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2),  # persistent message
    )

    connection.close()
    print(f"[PaymentService] Published paymentRefundIssued for orderId={order_id}, status={status}")
