import requests
from config import Config

class EventClient:
    def get_event(self, event_id):
        url = f"{Config.EVENT_SERVICE_URL}/events/{event_id}"
        res = requests.get(url, timeout=10)
        if res.status_code != 200:
            return None
        return res.json()

    def validate_seat(self, event_id, seat_id):
        url = f"{Config.EVENT_SERVICE_URL}/events/{event_id}/seats/{seat_id}"
        res = requests.get(url)
        if res.status_code != 200:
            return None
        seat = res.json()
        if seat.get("status", "").lower() != "available":
            return None
        return seat

    def update_seat_status(self, event_id, seat_id, status="sold"):
        """PUT /events/{eventId}/seats/{seatId}/status — mark catalog seat (Scenario A)."""
        url = f"{Config.EVENT_SERVICE_URL}/events/{event_id}/seats/{seat_id}/status"
        return requests.put(url, json={"status": status}, timeout=10)