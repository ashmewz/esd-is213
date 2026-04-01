"""
producer.py

Test producer — simulates the events other microservices would publish.
Use this to test your notification service locally without needing the real services.

Usage:
    python producer.py                      # publishes all 4 event types
    python producer.py ticket.purchased     # publishes one specific event
"""

import json
import sys
import uuid
import pika
from config import RABBITMQ_URL, EXCHANGE_NAME

# Sample payloads that mimic what other microservices would send
SAMPLE_EVENTS = {
    "ticket.purchased": {
        "orderId": str(uuid.uuid4()),
        "userId": str(uuid.uuid4()),
        "email": "user@example.com",        # <-- change to your email to test
        "seatId": "A12",
        "eventName": "Coldplay World Tour 2026",
        "venue": "Singapore National Stadium",
        "eventDate": "2026-06-15T20:00:00+08:00",
    },
    "seat.reassigned": {
        "orderId": str(uuid.uuid4()),
        "userId": str(uuid.uuid4()),
        "email": "user@example.com",
        "oldSeatId": "B5",
        "newSeatId": "C10",
        "eventName": "Coldplay World Tour 2026",
    },
    "payment.refund.issued": {
        "orderId": str(uuid.uuid4()),
        "userId": str(uuid.uuid4()),
        "email": "user@example.com",
        "amount": "150.00",
        "currency": "SGD",
        "reason": "Seat removed from updated seatmap",
    },
    "swap.completed": {
        "orderId": str(uuid.uuid4()),
        "userId": str(uuid.uuid4()),
        "email": "user@example.com",
        "oldSeatId": "D3",
        "newSeatId": "D7",
        "eventName": "Coldplay World Tour 2026",
    },
}


def publish_event(channel, routing_key: str, payload: dict):
    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=routing_key,
        body=json.dumps(payload),
        properties=pika.BasicProperties(
            delivery_mode=2,  # persistent — survives RabbitMQ restart
            content_type="application/json",
        ),
    )
    print(f"[→] Published '{routing_key}':\n{json.dumps(payload, indent=2)}\n")


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None

    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    # Ensure exchange exists
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

    if target:
        if target not in SAMPLE_EVENTS:
            print(f"[!] Unknown event type: '{target}'")
            print(f"    Valid options: {list(SAMPLE_EVENTS.keys())}")
            sys.exit(1)
        publish_event(channel, target, SAMPLE_EVENTS[target])
    else:
        print(f"[*] Publishing all {len(SAMPLE_EVENTS)} test events...\n")
        for routing_key, payload in SAMPLE_EVENTS.items():
            publish_event(channel, routing_key, payload)

    connection.close()
    print("[✓] Done.")


if __name__ == "__main__":
    main()