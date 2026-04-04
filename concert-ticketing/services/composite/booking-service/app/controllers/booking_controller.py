import requests as _requests
from flask import Blueprint, request, jsonify
from app.services.booking_service import BookingService
from config import Config

booking_bp = Blueprint("booking", __name__)
service = BookingService()


@booking_bp.route("/orders/<user_id>", methods=["GET"])
def get_orders(user_id):
    """
    Proxy to the external order-service to fetch a user's confirmed orders.
    Returns [] gracefully when the order-service is unreachable (dev environment).
    """
    try:
        r = _requests.get(
            f"{Config.ORDER_SERVICE_URL}/orders/{user_id}",
            timeout=10,
        )
        r.raise_for_status()
        return jsonify(r.json()), 200
    except Exception as e:
        print(f"[booking] Could not reach order-service for user {user_id}: {e}")
        return jsonify([]), 200   # Return empty list — UI handles this gracefully


@booking_bp.route("/place-booking", methods=["POST"])
def create_booking():
    data = request.json
    user_id = data.get("userId")
    event_id = data.get("eventId")
    seat_id = data.get("seatId")
    card_last4 = data.get("cardLast4", "")

    try:
        result = service.create_booking(user_id, event_id, seat_id, card_last4)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400