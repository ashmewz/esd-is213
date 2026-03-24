from flask import Blueprint, request, jsonify
from app.services.swap_service import (
    create_swap_request,
    submit_swap_response,
    get_swap_request,
    get_swap_status,
)

swap_bp = Blueprint("swap", __name__)


@swap_bp.route("/swap", methods=["POST"])
def create_swap_request_route():
    payload = request.get_json(silent=True)
    required_fields = ["orderId", "eventId", "currentSeatId", "desiredTier"]

    if not payload or any(f not in payload for f in required_fields):
        return jsonify({"error": f"Fields required: {required_fields}"}), 400

    result = create_swap_request(
        order_id=payload["orderId"],
        event_id=payload["eventId"],
        current_seat_id=payload["currentSeatId"],
        desired_tier=payload["desiredTier"],
    )
    return jsonify({"message": "Swap request created", "data": result}), 201


@swap_bp.route("/swap/<swap_id>/responses", methods=["POST"])
def submit_swap_response_route(swap_id):
    payload = request.get_json(silent=True)
    if not payload or "userId" not in payload or "response" not in payload:
        return jsonify({"error": "userId and response are required"}), 400

    result = submit_swap_response(
        swap_id=swap_id,
        user_id=payload["userId"],
        response=payload["response"].upper(),
    )
    return jsonify({"message": "Swap response submitted", "data": result}), 200


@swap_bp.route("/swap/requests/<request_id>", methods=["GET"])
def get_swap_request_route(request_id):
    """Fetch a single swap request by its request ID."""
    result = get_swap_request(request_id)
    if not result:
        return jsonify({"error": "Swap request not found"}), 404
    return jsonify({"data": result}), 200


@swap_bp.route("/swap/<swap_id>", methods=["GET"])
def get_swap_status_route(swap_id):
    result = get_swap_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found"}), 404
    return jsonify({"data": result}), 200
