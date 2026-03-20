import requests
from config import Config

class NotificationClient:
    def send_notification(self, payload):
        return requests.post(
            f"{Config.NOTIFICATION_SERVICE_URL}/notification",
            json=payload
        )