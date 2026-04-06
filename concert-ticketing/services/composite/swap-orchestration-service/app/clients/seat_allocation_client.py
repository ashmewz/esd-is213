import os
import requests

SEAT_ALLOCATION_URL = os.getenv("SEAT_ALLOCATION_SERVICE_URL", "http://seat-allocation-service:5000")


def execute_swap(order_id_a, seat_id_a, order_id_b, seat_id_b):
    try:
        resp = requests.post(f"{SEAT_ALLOCATION_URL}/swaps/execute", json={
            "orderIdA": order_id_a,
            "seatIdA": seat_id_a,
            "orderIdB": order_id_b,
            "seatIdB": seat_id_b,
        }, timeout=10)
        return resp.json()
    except Exception as e:
        print(f"[swap-orchestration] execute_swap failed: {e}")
        return None
