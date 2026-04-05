import pika

RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"
EXCHANGE_NAME = "concert_ticketing"

# seat-allocation queue
conn = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
ch = conn.channel()
ch.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
ch.queue_declare(queue="seat_allocation_queue", durable=True)
ch.queue_bind(exchange=EXCHANGE_NAME, queue="seat_allocation_queue", routing_key="seat.map.changed")
print("Done — seat_allocation_queue created")

# payment queue
ch.queue_declare(queue="payment_refund_queue", durable=True)
ch.queue_bind(exchange=EXCHANGE_NAME, queue="payment_refund_queue", routing_key="refund.required")
print("Done — payment_refund_queue created")

conn.close()
print("All queues ready.")