import requests
from config import Config

class OrderClient:
    def create_order(self, user_id, event_id, seat_id, price, currency="SGD"):
        return requests.post(
            f"{Config.ORDER_SERVICE_URL}/orders",
            json={"userId": user_id, "eventId": event_id, "seatId": seat_id, "price": price, "currency": currency}
        ).json()

    def confirm_order(self, order_id):
        return requests.put(
            f"{Config.ORDER_SERVICE_URL}/orders/{order_id}/status",
            json={"status": "CONFIRMED"}
        ).json()

    def cancel_order(self, order_id):
        return requests.put(
            f"{Config.ORDER_SERVICE_URL}/orders/{order_id}/status",
            json={"status": "CANCELLED"}
        ).json()