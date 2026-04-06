from flask import Blueprint, jsonify, request
from app.services.swap_orchestration_service import (
    start_swap,
    respond_to_swap,
    get_status,
    get_my_swap_requests,
    cancel_swap,
    get_available_swaps,
)

swap_orchestration_bp = Blueprint("swap_orchestrator", __name__)


@swap_orchestration_bp.route("/swap-requests", methods=["GET"])
def list_swap_requests_route():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId query param required"}), 400
    try:
        return jsonify(get_my_swap_requests(user_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@swap_orchestration_bp.route("/swap-requests/available", methods=["GET"])
def available_swaps_route():
    event_id = request.args.get("eventId")
    tier = request.args.get("tier")
    exclude = request.args.get("excludeUserId")
    if not event_id or not tier:
        return jsonify({"error": "eventId and tier required"}), 400
    try:
        return jsonify(get_available_swaps(event_id, tier, exclude)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@swap_orchestration_bp.route("/swap-requests/<request_id>", methods=["DELETE"])
def cancel_swap_route(request_id):
    try:
        return jsonify({"message": "Cancelled", "data": cancel_swap(request_id)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 409


@swap_orchestration_bp.route("/swap-requests", methods=["POST"])
def create_swap_route():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400
    order_id = payload.get("orderId")
    event_id = payload.get("eventId")
    current_seat_id = payload.get("currentSeatId")
    current_tier = payload.get("currentTier")
    desired_tier = payload.get("desiredTier")
    user_id = payload.get("userId")
    if not all([order_id, event_id, current_seat_id, desired_tier]):
        return jsonify({"error": "Missing required fields"}), 400
    result = start_swap(order_id, event_id, current_seat_id, desired_tier, current_tier=current_tier, user_id=user_id)
    return jsonify({"message": "Swap request created", "data": result}), 201


@swap_orchestration_bp.route("/swap-matches/<swap_id>/response", methods=["POST"])
def swap_response_route(swap_id):
    payload = request.get_json(silent=True)
    if not payload or not payload.get("userId") or not payload.get("response"):
        return jsonify({"error": "userId and response required"}), 400
    result = respond_to_swap(swap_id, payload["userId"], payload["response"])
    return jsonify({"message": "Response submitted", "data": result}), 200


@swap_orchestration_bp.route("/swap/<swap_id>", methods=["GET"])
def swap_status_route(swap_id):
    result = get_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found"}), 404
    return jsonify({"data": result}), 200
