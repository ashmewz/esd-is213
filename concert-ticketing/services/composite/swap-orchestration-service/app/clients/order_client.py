import requests

ORDER_SERVICE_URL = "https://personal-v9ndj4pt.outsystemscloud.com/Order/rest/Order"


def update_order_seat(order_id, new_seat_id):
    """Call OutSystems to update the seatId on an order after a swap."""
    try:
        resp = requests.put(
            f"{ORDER_SERVICE_URL}/orders/{order_id}/seat/",
            json={"SeatId": str(new_seat_id)},
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[swap-orchestration] Updated OutSystems order {order_id} -> seat {new_seat_id}")
        else:
            print(f"[swap-orchestration] OutSystems seat update failed for order {order_id}: {resp.status_code} {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print(f"[swap-orchestration] OutSystems seat update error for order {order_id}: {e}")
        return False
