import requests
from config import Config


class EventClient:
    def list_events(self, include_deleted=False, include_finished=False):
        params = {
            "includeDeleted": str(include_deleted).lower(),
            "includeFinished": str(include_finished).lower(),
        }
        resp = requests.get(
            f"{Config.EVENT_SERVICE_URL}/events",
            params=params
        )
        resp.raise_for_status()
        return resp.json()

    def get_event(self, event_id):
        resp = requests.get(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}"
        )
        resp.raise_for_status()
        return resp.json()

    def create_event(self, payload: dict):
        resp = requests.post(
            f"{Config.EVENT_SERVICE_URL}/events",
            json=payload
        )
        resp.raise_for_status()
        return resp.json()

    def update_event(self, event_id, payload: dict):
        resp = requests.put(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}",
            json=payload
        )
        resp.raise_for_status()
        return resp.json()

    def delete_event(self, event_id):
        resp = requests.delete(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}"
        )
        resp.raise_for_status()
        return resp.json()

    def list_seats(self, event_id):
        resp = requests.get(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/seats"
        )
        resp.raise_for_status()
        return resp.json()

    def get_seat(self, event_id, seat_id):
        resp = requests.get(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/seats/{seat_id}"
        )
        resp.raise_for_status()
        return resp.json()

    def update_seat_status(self, event_id, seat_id, status):
        resp = requests.put(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/seats/{seat_id}/status",
            json={"status": status}
        )
        resp.raise_for_status()
        return resp.json()

    def list_visual_sections(self, event_id):
        resp = requests.get(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/visual-sections"
        )
        resp.raise_for_status()
        return resp.json()

    def update_visual_sections(self, event_id, payload: list):
        resp = requests.put(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/visual-sections",
            json=payload
        )
        resp.raise_for_status()
        return resp.json()

    def get_tier_prices(self, event_id):
        resp = requests.get(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/tier-prices"
        )
        resp.raise_for_status()
        return resp.json()

    def update_tier_prices(self, event_id, payload: dict):
        resp = requests.put(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/tier-prices",
            json=payload
        )
        resp.raise_for_status()
        return resp.json()

    def update_seatmap(self, event_id, removed_seat_ids: list):
        resp = requests.put(
            f"{Config.EVENT_SERVICE_URL}/events/{event_id}/seatmap",
            json={"removedSeatIds": removed_seat_ids}
        )
        resp.raise_for_status()
        return resp.json()