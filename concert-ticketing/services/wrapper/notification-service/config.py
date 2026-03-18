import os

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")

EXCHANGE_NAME = "concert_ticketing"
EXCHANGE_TYPE = "topic"

# Queues this service listens on
NOTIFICATION_QUEUE = "notification_queue"

# Routing keys to consume
ROUTING_KEYS = [
    "ticket.purchased",       # Scenario A: ticket purchase confirmed
    "seat.reassigned",        # Scenario B: seat reassigned after seatmap change
    "payment.refund.issued",  # Scenario B: refund issued after seatmap change
    "swap.completed",         # Scenario C: swap completed
]
