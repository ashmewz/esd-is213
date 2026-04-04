import requests
from config import Config

class SeatClient:
    def create_hold(self, order_id, event_id, seat_id, ttl_seconds=900):
        return requests.post(
            f"{Config.SEAT_SERVICE_URL}/holds",
            json={"orderId": order_id, "eventId": event_id, "seatId": seat_id, "ttlSeconds": ttl_seconds}
        ).json()

    def confirm_seat(self, hold_id, transaction_id):
        return requests.post(
            f"{Config.SEAT_SERVICE_URL}/holds/{hold_id}/confirm",
            json={"transactionId": transaction_id}
        ).json()

    def cancel_hold(self, hold_id):
        requests.delete(f"{Config.SEAT_SERVICE_URL}/holds/{hold_id}")