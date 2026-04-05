from flask import Blueprint, request, jsonify
from app.services.booking_service import BookingService

booking_bp = Blueprint("booking", __name__)
service = BookingService()

@booking_bp.route("/place-booking", methods=["POST"])
def create_booking():
    data = request.json
    order_id = data.get("orderId")
    event_id = data.get("eventId")
    seat_id = data.get("seatId")
    card_last4 = data.get("cardLast4", "")

    try:
        result = service.create_booking(order_id, event_id, seat_id, card_last4)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400