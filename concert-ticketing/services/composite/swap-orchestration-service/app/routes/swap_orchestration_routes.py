from flask import Blueprint, jsonify, request
from app.services.swap_orchestration_service import start_swap, respond_to_swap, get_status

swap_orchestration_bp = Blueprint("swap_orchestrator", __name__)

@swap_orchestration_bp.route("/swap-requests", methods=["POST"])
def create_swap_route():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400

    order_id = payload.get("orderId")
    event_id = payload.get("eventId")
    current_seat_id = payload.get("currentSeatId")
    desired_tier = payload.get("desiredTier")

    if not all([order_id, event_id, current_seat_id, desired_tier]):
        return jsonify({"error": "Missing required fields"}), 400

    result = start_swap(order_id, event_id, current_seat_id, desired_tier)
    return jsonify({"message": "Swap request created", "data": result}), 201

@swap_orchestration_bp.route("/swap-matches/<swap_id>/response", methods=["POST"])
def swap_response_route(swap_id):
    payload = request.get_json(silent=True)
    if not payload or not payload.get("userId") or not payload.get("response"):
        return jsonify({"error": "userId and response required"}), 400

    user_id = payload.get("userId")
    response = payload.get("response")

    result = respond_to_swap(swap_id, user_id, response)
    return jsonify({"message": "Response submitted", "data": result}), 200

@swap_orchestration_bp.route("/swap/<swap_id>", methods=["GET"])
def swap_status_route(swap_id):
    result = get_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found"}), 404
    return jsonify({"data": result}), 200