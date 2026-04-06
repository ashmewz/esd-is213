import os
import requests

EVENTS_SERVICE_URL = os.getenv("EVENTS_SERVICE_URL", "http://events-service:5000")


def get_event(event_id):
    try:
        resp = requests.get(f"{EVENTS_SERVICE_URL}/events/{event_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"[swap-orchestration] get_event failed: {e}")
        return None


def get_seat(event_id, seat_id):
    try:
        resp = requests.get(f"{EVENTS_SERVICE_URL}/events/{event_id}/seats/{seat_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"[swap-orchestration] get_seat failed: {e}")
        return None


def seat_label(seat):
    if not seat:
        return None
    section = seat.get("sectionNo") or seat.get("section")
    row = seat.get("rowNo") or seat.get("row")
    num = seat.get("seatNo") or seat.get("seatNumber") or seat.get("number")
    if section and row and num:
        return f"Section {section} · Row {row} · Seat {num}"
    return seat.get("label") or str(seat.get("seatId", ""))


def update_seat_status(event_id, seat_id, status):
    try:
        resp = requests.put(
            f"{EVENTS_SERVICE_URL}/events/{event_id}/seats/{seat_id}/status",
            json={"status": status},
            timeout=5,
        )
        return resp.json()
    except Exception as e:
        print(f"[swap-orchestration] update_seat_status failed: {e}")
        return None
