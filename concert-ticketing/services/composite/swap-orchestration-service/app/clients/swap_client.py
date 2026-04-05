import requests
from config import Config


def get_user_swap_requests(user_id=None):
    params = {}
    if user_id:
        params["userId"] = user_id

    resp = requests.get(
        f"{Config.SWAP_SERVICE_URL}/swap-requests",
        params=params
    )
    resp.raise_for_status()
    return resp.json()


def get_swap_request(request_id):
    resp = requests.get(
        f"{Config.SWAP_SERVICE_URL}/swap-requests/{request_id}"
    )
    resp.raise_for_status()
    return resp.json()


def cancel_swap_request(request_id):
    resp = requests.delete(
        f"{Config.SWAP_SERVICE_URL}/swap-requests/{request_id}"
    )
    resp.raise_for_status()
    return resp.json()

def create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=None):
    resp = requests.post(
        f"{Config.SWAP_SERVICE_URL}/swap",
        json={
            "orderId": order_id,
            "eventId": event_id,
            "currentSeatId": current_seat_id,
            "desiredTier": desired_tier,
            "currentTier": current_tier,
        }
    )
    resp.raise_for_status()
    return resp.json().get("data", resp.json())

def submit_swap_response(swap_id, user_id, response):
    resp = requests.post(
        f"{Config.SWAP_SERVICE_URL}/swap/{swap_id}/responses",
        json={
            "userId": user_id,
            "response": response,
        }
    )
    resp.raise_for_status()
    return resp.json().get("data", resp.json())

def get_swap_status(swap_id):
    resp = requests.get(
        f"{Config.SWAP_SERVICE_URL}/swap/{swap_id}"
    )
    resp.raise_for_status()
    return resp.json().get("data", resp.json())