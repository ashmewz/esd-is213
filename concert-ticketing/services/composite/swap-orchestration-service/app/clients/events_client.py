import requests
import os

EVENTS_SERVICE_URL = os.getenv("EVENTS_SERVICE_URL", "http://events-service:5000")


def get_event(event_id: str) -> dict | None:
    """Fetch event metadata (name, date, venue) by ID."""
    try:
        r = requests.get(f"{EVENTS_SERVICE_URL}/events/{event_id}", timeout=15)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[events_client] Failed to fetch event {event_id}: {e}")
        return None


def get_seat(event_id: str, seat_id: str) -> dict | None:
    """Fetch seat details (tier, sectionNo, rowNo, seatNo) by event + seat ID."""
    try:
        r = requests.get(f"{EVENTS_SERVICE_URL}/events/{event_id}/seats/{seat_id}", timeout=15)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[events_client] Failed to fetch seat {seat_id}: {e}")
        return None


def seat_label(seat: dict | None) -> str:
    """Build a human-readable seat label from a seat dict."""
    if not seat:
        return "Unknown seat"
    if seat.get("seatLabel"):
        return seat["seatLabel"]
    section = seat.get("sectionNo", "?")
    row = seat.get("rowNo", "?")
    num = seat.get("seatNo", "?")
    return f"Section {section} · Row {row} · Seat {num}"
