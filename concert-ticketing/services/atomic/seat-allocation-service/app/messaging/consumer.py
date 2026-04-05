"""
consumer.py  —  seat-allocation-service

Scenario B (choreography): consumes 'seat.map.changed' published by events-service.

For each SOLD seat that was removed from the new seatmap:
  - Step 4/5a: attempt to reassign to an available seat → publish 'seat.reassigned'
  - Step 5b:   if no available seat exists      → publish 'refund.required'
"""

import json
import os
import time
import threading
import uuid

import pika
import requests

from app.core.database import SessionLocal
from app.models.seat_allocation_models import SeatAssignment, ReallocationLog
from app.messaging.producer import publish_event, RABBITMQ_URL, EXCHANGE_NAME
from app.messaging.queue_setup import QUEUE_NAME, ROUTING_KEYS

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:5000")
EVENTS_SERVICE_URL = os.getenv("EVENTS_SERVICE_URL", "http://events-service:5000")

MAX_RETRIES = 5
RETRY_BACKOFF_BASE = 2  # seconds


def _get_user_email(user_id: str) -> str | None:
    if not user_id:
        return None
    try:
        resp = requests.get(f"{USER_SERVICE_URL}/users/{user_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json().get("email")
    except Exception as e:
        print(f"[seat-allocation] Failed to fetch email for userId={user_id}: {e}")
    return None


def _get_seat_details(event_id: str, seat_id: str) -> dict:
    try:
        resp = requests.get(f"{EVENTS_SERVICE_URL}/events/{event_id}/seats/{seat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[seat-allocation] Failed to fetch seat details for seatId={seat_id}: {e}")
    return {}


def _get_event_details(event_id: str) -> dict:
    try:
        resp = requests.get(f"{EVENTS_SERVICE_URL}/events/{event_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[seat-allocation] Failed to fetch event details for eventId={event_id}: {e}")
    return {}


def _format_seat_label(seat: dict) -> str:
    tier = seat.get("tier", "")
    section = seat.get("sectionNo", "")
    row = seat.get("rowNo", "")
    seat_no = seat.get("seatNo", "")
    return f"{tier} · Section {section} · Row {row} · Seat {seat_no}"


def _handle_seat_map_changed(data: dict):
    event_id_str = data.get("eventId")
    removed_seat_ids = set(data.get("removedSeatIds", []))
    available_seat_ids = list(data.get("availableSeatIds", []))

    if not event_id_str or not removed_seat_ids:
        print("[seat-allocation] seat.map.changed: no eventId or removedSeatIds — skipping.")
        return

    try:
        event_id = uuid.UUID(event_id_str)
    except (ValueError, TypeError):
        print(f"[seat-allocation] Invalid eventId UUID: {event_id_str}")
        return

    db = SessionLocal()
    try:
        # Find all SOLD assignments for this event whose seat was removed
        removed_uuids = set()
        for sid in removed_seat_ids:
            try:
                removed_uuids.add(uuid.UUID(str(sid)))
            except (ValueError, TypeError):
                pass

        affected = (
            db.query(SeatAssignment)
            .filter(
                SeatAssignment.event_id == event_id,
                SeatAssignment.status == "SOLD",
                SeatAssignment.seat_id.in_(removed_uuids),
            )
            .all()
        )

        print(f"[seat-allocation] Affected sold seats: {len(affected)}")

        claimed_this_run: set = set()

        # Fetch truly available seats live from events-service (authoritative source)
        try:
            all_seats_resp = requests.get(
                f"{EVENTS_SERVICE_URL}/events/{event_id_str}/seats", timeout=10
            )
            all_seats = all_seats_resp.json() if all_seats_resp.status_code == 200 else []
        except Exception as e:
            print(f"[seat-allocation] Failed to fetch seats for event {event_id_str}: {e}")
            all_seats = []

        # Build available seats indexed by (tier, sectionNo) and by tier alone
        available_by_tier_section: dict = {}  # key: (tier, sectionNo)
        available_by_tier: dict = {}           # key: tier (fallback)
        for s in all_seats:
            if s.get("status") == "available":
                tier = s.get("tier")
                section_no = s.get("sectionNo")
                key = (tier, section_no)
                available_by_tier_section.setdefault(key, []).append(s.get("seatId"))
                available_by_tier.setdefault(tier, []).append(s.get("seatId"))

        for assignment in affected:
            old_seat_id = str(assignment.seat_id)
            order_id = assignment.order_id
            user_id = assignment.user_id

            # Fetch the removed seat's tier and section
            old_seat_details = _get_seat_details(event_id_str, old_seat_id)
            old_tier = old_seat_details.get("tier")
            old_section = old_seat_details.get("sectionNo")

            # Prefer same section first, then fall back to any seat of same tier
            new_seat_id = None
            same_section_candidates = available_by_tier_section.get((old_tier, old_section), [])
            any_tier_candidates = available_by_tier.get(old_tier, [])
            for candidate in (same_section_candidates + any_tier_candidates):
                if candidate not in claimed_this_run:
                    new_seat_id = candidate
                    claimed_this_run.add(candidate)
                    break

            if new_seat_id:
                # Step 5a: reassign
                try:
                    new_seat_uuid = uuid.UUID(new_seat_id)
                    assignment.seat_id = new_seat_uuid

                    log = ReallocationLog(
                        order_id=order_id,
                        old_seat_id=uuid.UUID(old_seat_id),
                        new_seat_id=new_seat_uuid,
                        reason="seatmap_change",
                    )
                    db.add(log)
                    db.commit()

                    # Mark new seat as sold in events-service
                    try:
                        requests.put(
                            f"{EVENTS_SERVICE_URL}/events/{event_id_str}/seats/{new_seat_id}/status",
                            json={"status": "sold"},
                            timeout=5,
                        )
                    except Exception as e:
                        print(f"[seat-allocation] Failed to mark new seat as sold: {e}")

                    email = _get_user_email(user_id)
                    old_seat = _get_seat_details(event_id_str, old_seat_id)
                    new_seat = _get_seat_details(event_id_str, new_seat_id)
                    event_details = _get_event_details(event_id_str)
                    publish_event("seat.reassigned", {
                        "orderId": str(order_id),
                        "eventId": event_id_str,
                        "oldSeatId": old_seat_id,
                        "newSeatId": new_seat_id,
                        "oldSeatLabel": _format_seat_label(old_seat),
                        "newSeatLabel": _format_seat_label(new_seat),
                        "eventName": event_details.get("name"),
                        "venue": event_details.get("venueName"),
                        "eventDate": event_details.get("eventDate") or event_details.get("date"),
                        "email": email,
                    })
                    print(f"[seat-allocation] Reassigned order {order_id}: {old_seat_id} → {new_seat_id}")
                except Exception as e:
                    db.rollback()
                    print(f"[seat-allocation] Failed to reassign order {order_id}: {e}")
            else:
                # Step 5b: no available seat — request refund
                publish_event("refund.required", {
                    "orderId": str(order_id),
                    "eventId": event_id_str,
                    "seatId": old_seat_id,
                })
                print(f"[seat-allocation] Refund required for order {order_id}, seat {old_seat_id}")

    finally:
        db.close()


def on_message(ch, method, properties, body):
    routing_key = method.routing_key
    try:
        data = json.loads(body)
        print(f"[seat-allocation] Received '{routing_key}': {data}")

        if routing_key == "seat.map.changed":
            _handle_seat_map_changed(data)

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except json.JSONDecodeError as e:
        print(f"[seat-allocation] Malformed message: {e} — discarding.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        print(f"[seat-allocation] Error processing '{routing_key}': {e} — requeuing.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def start_consumer():
    attempt = 0
    while True:
        try:
            print(f"[seat-allocation] Connecting to RabbitMQ (attempt {attempt + 1})...")
            params = pika.URLParameters(RABBITMQ_URL)
            params.heartbeat = 60
            params.blocked_connection_timeout = 300
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            for rk in ROUTING_KEYS:
                channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key=rk)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_message)

            attempt = 0
            print(f"[seat-allocation] Listening on: {ROUTING_KEYS}")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[seat-allocation] RabbitMQ connection failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)

        except KeyboardInterrupt:
            print("[seat-allocation] Consumer stopped.")
            break

        except Exception as e:
            attempt += 1
            wait = RETRY_BACKOFF_BASE ** min(attempt, MAX_RETRIES)
            print(f"[seat-allocation] Unexpected error: {e}. Retrying in {wait}s...")
            time.sleep(wait)


def start_consumer_thread():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()
