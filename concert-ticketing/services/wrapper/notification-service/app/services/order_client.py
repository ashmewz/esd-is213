import os
import requests

ORDER_SERVICE_URL = os.getenv(
    "ORDER_SERVICE_URL",
    "https://personal-v9ndj4pt.outsystemscloud.com/Order/rest/Order"
)


def update_order_status(order_id: str, status: str):
    """Call OutSystems PUT /orders/{orderId}/status/ to update the order status."""
    try:
        url = f"{ORDER_SERVICE_URL}/orders/{order_id}/status/"
        resp = requests.put(url, json={"status": status}, timeout=10)
        resp.raise_for_status()
        print(f"[order] Updated order {order_id} status to '{status}'")
    except Exception as e:
        print(f"[order] Failed to update order {order_id} status: {e}")


def update_order_seat(order_id: str, new_seat_id: str):
    """Call OutSystems PUT /orders/{orderId}/seat/ to update the seat after reassignment."""
    try:
        url = f"{ORDER_SERVICE_URL}/orders/{order_id}/seat/"
        resp = requests.put(url, json={"SeatId": new_seat_id}, timeout=10)
        resp.raise_for_status()
        print(f"[order] Updated order {order_id} seat to '{new_seat_id}'")
    except Exception as e:
        print(f"[order] Failed to update order {order_id} seat: {e}")
