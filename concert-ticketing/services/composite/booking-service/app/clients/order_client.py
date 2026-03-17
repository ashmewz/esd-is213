import requests
from config import Config

class OrderClient:
    def create_order(self, user_id, event_id, seat_id):
        return requests.post(
            f"{Config.ORDER_SERVICE_URL}/order",
            json={"userId": user_id, "eventId": event_id, "seatId": seat_id}
        ).json()

    def confirm_order(self, order_id):
        return requests.post(
            f"{Config.ORDER_SERVICE_URL}/order/{order_id}"
        ).json()