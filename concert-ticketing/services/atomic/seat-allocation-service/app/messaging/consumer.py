"""
Scenario B consumer: listens on seatmap.changed and drives the reassignment
or refund flow for every affected sold seat.

Wire this up in your application entrypoint:

    from app.consumers.seatmap_consumer import start_consumer
    import threading
    threading.Thread(target=start_consumer, daemon=True).start()
"""
import json
import logging

import pika

from app.core.database import SessionLocal
from app.models.seat_allocation_models import SeatAssignment, ReallocationLog
from app.messaging.producer import publish_event

logger = logging.getLogger(__name__)

EXCHANGE = "concert_ticketing"
QUEUE = "seat_allocation.seatmap_changed"
BINDING_KEY = "seatmap.changed"


# ── RabbitMQ consumer bootstrap ───────────────────────────────────────────────

def start_consumer(rabbitmq_url="amqp://guest:guest@localhost/"):
    """Start blocking consumer. Run in a daemon thread."""
    connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
    channel = connection.channel()

    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.queue_bind(queue=QUEUE, exchange=EXCHANGE, routing_key=BINDING_KEY)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE, on_message_callback=_on_seatmap_changed)

    logger.info("Seat allocation consumer started — listening on %s", BINDING_KEY)
    channel.start_consuming()


# ── Message handler ───────────────────────────────────────────────────────────

def _on_seatmap_changed(ch, method, properties, body):
    """
    Step B5: Consume SeatMapChanged and drive reassignment for each affected seat.

    Payload expected:
    {
        "eventId": "...",
        "seatmapVersion": 2,
        "affectedSeatIds": ["...", "..."]
    }
    """
    try:
        payload = json.loads(body)
        event_id = payload["eventId"]
        affected_seat_ids = payload.get("affectedSeatIds", [])

        logger.info(
            "SeatMapChanged received for event %s — %d affected seats",
            event_id, len(affected_seat_ids),
        )

        for seat_id in affected_seat_ids:
            _handle_affected_seat(event_id, seat_id)

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception:
        logger.exception("Failed to process SeatMapChanged message")
        # Negative-ack without requeue to avoid poison-message loops.
        # Send to a dead-letter queue in production.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


# ── Per-seat reassignment logic ───────────────────────────────────────────────

def _handle_affected_seat(event_id, seat_id):
    """
    Step B6/B7: Query sold assignments for the affected seat and attempt
    reassignment. Publishes either SeatReassigned or RefundRequired.
    """
    db = SessionLocal()
    try:
        # Step B6: Find all SOLD assignments for this seat
        assignments = (
            db.query(SeatAssignment)
            .filter_by(event_id=event_id, seat_id=seat_id, status="SOLD")
            .all()
        )

        for assignment in assignments:
            _attempt_reassignment(db, assignment)

    except Exception:
        logger.exception(
            "Error handling affected seat %s for event %s", seat_id, event_id
        )
        db.rollback()
    finally:
        db.close()


def _attempt_reassignment(db, assignment):
    """
    Step B7: Try to find a replacement seat in the same tier for this assignment.

    On success  → Step B8A + B9A (update DB, publish SeatReassigned)
    On failure  → Step B8B       (publish RefundRequired)
    """
    replacement_seat_id = _find_replacement_seat(
        db, assignment.event_id, assignment.seat_id
    )

    if replacement_seat_id:
        _do_reassignment(db, assignment, replacement_seat_id)
    else:
        _request_refund(assignment)


def _find_replacement_seat(db, event_id, original_seat_id):
    """
    Step B7: Find an available seat in the same tier that is not already assigned.

    This queries the seats table in the event-service schema. In a real
    deployment the seat allocation service would call the Event Service API
    instead of querying cross-schema. Both patterns are shown; use whichever
    matches your DB topology.
    """
    # Cross-schema query (single-DB deployment):
    from sqlalchemy import text
    result = db.execute(
        text("""
            SELECT s.seat_id
            FROM events_service.seats s
            WHERE s.event_id = :event_id
              AND s.status    = 'available'
              AND s.tier = (
                  SELECT tier FROM events_service.seats
                  WHERE seat_id = :original_seat_id
                  LIMIT 1
              )
              AND s.seat_id NOT IN (
                  SELECT seat_id
                  FROM seat_allocation_service.seat_assignments
                  WHERE event_id = :event_id
                    AND status   = 'SOLD'
              )
            LIMIT 1
        """),
        {"event_id": event_id, "original_seat_id": original_seat_id},
    )
    row = result.fetchone()
    return str(row[0]) if row else None


def _do_reassignment(db, assignment, new_seat_id):
    """
    Step B8A: Persist the new seat assignment and log the reallocation.
    Step B9A: Publish SeatReassigned.
    """
    old_seat_id = str(assignment.seat_id)
    order_id = assignment.order_id
    event_id = str(assignment.event_id)

    try:
        # Update the existing assignment to point to the new seat
        assignment.seat_id = new_seat_id
        assignment.status = "REASSIGNED"

        # Step B8A: Write reallocation log
        log_entry = ReallocationLog(
            order_id=order_id,
            old_seat_id=old_seat_id,
            new_seat_id=new_seat_id,
            reason="SEATMAP_CHANGED",
        )
        db.add(log_entry)
        db.commit()

        logger.info(
            "Reassigned order %s: seat %s → %s", order_id, old_seat_id, new_seat_id
        )

        # Step B9A: Publish SeatReassigned
        publish_event(EXCHANGE, "seat.reassigned", {
            "orderId": str(order_id),
            "eventId": event_id,
            "oldSeatId": old_seat_id,
            "newSeatId": new_seat_id,
            "reason": "SEATMAP_CHANGED",
        })

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to persist reassignment for order %s; falling back to refund",
            order_id,
        )
        # If the DB write fails, fall back to requesting a refund
        _request_refund(assignment)


def _request_refund(assignment):
    """
    Step B8B: Could not reassign — publish RefundRequired so Payment Service
    triggers a refund and Order Service / Notification Service are informed.
    """
    logger.info(
        "No replacement seat found for order %s seat %s — requesting refund",
        assignment.order_id, assignment.seat_id,
    )
    publish_event(EXCHANGE, "refund.required", {
        "orderId": str(assignment.order_id),
        "eventId": str(assignment.event_id),
        "seatId": str(assignment.seat_id),
        "reason": "SEATMAP_CHANGED_NO_REASSIGNMENT",
    })