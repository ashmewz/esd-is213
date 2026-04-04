import requests
import os

SWAP_SERVICE_URL = os.getenv("SWAP_SERVICE_URL", "http://localhost:5001")

def create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=None, user_id=None):
    url = f"{SWAP_SERVICE_URL}/swap"
    payload = {
        "orderId": order_id,
        "eventId": event_id,
        "currentSeatId": current_seat_id,
        "currentTier": current_tier,
        "desiredTier": desired_tier,
    }
    if user_id:
        payload["userId"] = user_id
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json().get("data")   # unwrap {"message":..., "data":{...}} → return inner dict

def submit_swap_response(swap_id, user_id, response):
    url = f"{SWAP_SERVICE_URL}/swap/{swap_id}/responses"
    payload = {"userId": user_id, "response": response}
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json().get("data")   # unwrap so callers get {"status":..., ...} directly

def get_swap_status(swap_id):
    url = f"{SWAP_SERVICE_URL}/swap/{swap_id}"
    r = requests.get(url)
    r.raise_for_status()
    return r.json().get("data")   # unwrap so callers get the swap dict directly

def list_swap_requests_by_user(user_id):
    """Return raw swap request list for a user from swap-service."""
    url = f"{SWAP_SERVICE_URL}/swap-requests"
    r = requests.get(url, params={"userId": user_id}, timeout=30)
    r.raise_for_status()
    return r.json()  # list of dicts, no wrapper

def cancel_swap_request(request_id):
    url = f"{SWAP_SERVICE_URL}/swap-requests/{request_id}"
    r = requests.delete(url, timeout=30)
    r.raise_for_status()
    return r.json().get("data")
