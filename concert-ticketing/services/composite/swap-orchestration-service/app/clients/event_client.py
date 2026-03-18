import requests
from config import Config

class EventClient:
    def validate_seat(self, event_id, seat_id):
        url = f"{Config.EVENT_SERVICE_URL}/events/{event_id}/{seat_id}"
        res = requests.get(url)
        if res.status_code != 200:
            return None
        return res.json()