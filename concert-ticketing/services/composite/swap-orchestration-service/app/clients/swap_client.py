import requests
import os

SWAP_SERVICE_URL = os.getenv("SWAP_SERVICE_URL", "http://swap-service:5000")


def create_swap_request(order_id, event_id, current_seat_id, desired_tier, current_tier=None, user_id=None):
    url = f"{SWAP_SERVICE_URL}/swap"
    payload = {
        "orderId": order_id,
        "eventId": event_id,
        "currentSeatId": current_seat_id,
        "desiredTier": desired_tier,
    }
    if current_tier:
        payload["currentTier"] = current_tier
    if user_id:
        payload["userId"] = user_id
    r = requests.post(url, json=payload, timeout=10)
    r.raise_for_status()
    return r.json().get("data", r.json())


def submit_swap_response(swap_id, user_id, response):
    url = f"{SWAP_SERVICE_URL}/swap/{swap_id}/responses"
    payload = {"userId": user_id, "response": response.upper()}
    r = requests.post(url, json=payload, timeout=10)
    r.raise_for_status()
    return r.json().get("data", r.json())


def get_swap_status(swap_id):
    url = f"{SWAP_SERVICE_URL}/swap/{swap_id}"
    r = requests.get(url, timeout=10)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json().get("data", r.json())


def get_swap_request(request_id):
    try:
        resp = requests.get(f"{SWAP_SERVICE_URL}/swap/requests/{request_id}", timeout=5)
        if resp.status_code == 200:
            return resp.json().get("data")
        return None
    except Exception as e:
        print(f"[swap-orchestration] get_swap_request failed: {e}")
        return None


def list_swap_requests_by_user(user_id):
    try:
        resp = requests.get(f"{SWAP_SERVICE_URL}/swap-requests", params={"userId": user_id}, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return []
    except Exception as e:
        print(f"[swap-orchestration] list_swap_requests_by_user failed: {e}")
        return []


def cancel_swap_request(request_id):
    try:
        resp = requests.delete(f"{SWAP_SERVICE_URL}/swap-requests/{request_id}", timeout=10)
        resp.raise_for_status()
        return resp.json().get("data", resp.json())
    except Exception as e:
        raise ValueError(str(e))


def get_available_swap_requests(event_id, tier, exclude_user_id=None):
    try:
        params = {"eventId": event_id, "tier": tier}
        if exclude_user_id:
            params["excludeUserId"] = exclude_user_id
        resp = requests.get(f"{SWAP_SERVICE_URL}/swap-requests/available", params=params, timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return []
    except Exception as e:
        print(f"[swap-orchestration] get_available_swap_requests failed: {e}")
        return []
