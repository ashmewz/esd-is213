import requests
from config import Config

class SeatClient:
    def create_hold(self, order_id, event_id, seat_id):
        return requests.post(
            f"{Config.SEAT_SERVICE_URL}/hold/{order_id}",
            json={"eventId": event_id, "seatId": seat_id}
        ).json()

    def confirm_seat(self, order_id, seat_id):
        return requests.post(
            f"{Config.SEAT_SERVICE_URL}/confirm/{order_id}",
            json={"seatId": seat_id}
        ).json()

    def cancel_hold(self, order_id):
        requests.delete(f"{Config.SEAT_SERVICE_URL}/hold/{order_id}")