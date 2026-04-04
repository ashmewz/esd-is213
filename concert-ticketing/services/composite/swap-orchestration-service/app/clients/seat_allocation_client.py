import requests
from config import Config


class SeatAllocationClient:
    """
    Client for interacting with seat-allocation-service.
    Used by swap-orchestration-service.
    """

    BASE_URL = Config.SEAT_ALLOCATION_SERVICE_URL

    # ---------------------------
    # HOLD OPERATIONS (Step C20+)
    # ---------------------------

    def create_hold(self, order_id, event_id, seat_id, ttl_seconds):
        """
        POST /holds
        Create a temporary hold on a seat.
        """
        url = f"{self.BASE_URL}/holds"
        payload = {
            "orderId": order_id,
            "eventId": event_id,
            "seatId": seat_id,
            "ttlSeconds": ttl_seconds,
        }

        res = requests.post(url, json=payload, timeout=10)

        if res.status_code not in (200, 201):
            return None

        return res.json()

    def cancel_hold(self, hold_id):
        """
        DELETE /holds/{holdId}
        Cancel an existing hold.
        """
        url = f"{self.BASE_URL}/holds/{hold_id}"
        res = requests.delete(url, timeout=10)

        if res.status_code != 200:
            return None

        return res.json()

    def confirm_hold(self, hold_id, transaction_id):
        """
        POST /holds/{holdId}/confirm
        Confirm a hold → converts to SOLD assignment.
        """
        url = f"{self.BASE_URL}/holds/{hold_id}/confirm"
        payload = {
            "transactionId": transaction_id
        }

        res = requests.post(url, json=payload, timeout=10)

        if res.status_code != 200:
            return None

        return res.json()

    # ---------------------------
    # SWAP EXECUTION (Step C23)
    # ---------------------------

    def execute_swap(self, match_id, order_a, order_b, seat_a, seat_b):
        """
        POST /swaps/{matchId}/execute
        Triggers atomic swap inside seat-allocation-service.
        """
        url = f"{self.BASE_URL}/swaps/{match_id}/execute"

        payload = {
            "orderA": order_a,
            "orderB": order_b,
            "seatA": seat_a,
            "seatB": seat_b,
        }

        res = requests.post(url, json=payload, timeout=10)

        if res.status_code != 200:
            return None

        return res.json()