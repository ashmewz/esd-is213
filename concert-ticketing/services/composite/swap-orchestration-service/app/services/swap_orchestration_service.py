from app.clients.swap_client import create_swap_request, submit_swap_response, get_swap_status
from app.messaging.producer import publish_event

EXCHANGE = "concert_ticketing"

def start_swap(order_id, event_id, current_seat_id, desired_tier):
    result = create_swap_request(order_id, event_id, current_seat_id, desired_tier)

    match = result.get("match")

    if match:
        publish_event(EXCHANGE, "swap.matched", {
            "matchId": match["swapId"],
            "requestA": match["requestA"],
            "requestB": match["requestB"],
            "status": match["status"]
        })

    return result

def respond_to_swap(swap_id, user_id, response):
    """Submit a user response to a swap and evaluate."""
    result = submit_swap_response(swap_id, user_id, response)
    status = result.get("status")

    if status == "READY_FOR_EXECUTION":
        publish_event(EXCHANGE, "swap.completed", {
            "swapId": swap_id
        })
    elif status == "FAILED":
        publish_event(EXCHANGE, "swap.failed", {
            "swapId": swap_id
        })

    return result

def get_status(swap_id):
    return get_swap_status(swap_id)