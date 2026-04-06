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
    required_fields = ["orderId", "eventId", "currentSeatId", "desiredTier"]
    missing = [f for f in required_fields if not payload.get(f)]
    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    try:
        result = start_swap(
            order_id=payload["orderId"],
            event_id=payload["eventId"],
            current_seat_id=payload["currentSeatId"],
            desired_tier=payload["desiredTier"],
            current_tier=payload.get("currentTier"),
            user_id=payload.get("userId"),
        )
        return jsonify({"message": "Swap request created", "data": result}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Internal server error: {e}"}), 500


@swap_orchestration_bp.route("/swap-matches/<swap_id>/response", methods=["POST"])
def swap_response_route(swap_id):
    payload = request.get_json(silent=True)
    if not payload or not payload.get("userId") or not payload.get("response"):
        return jsonify({"error": "userId and response required"}), 400
 
    matched_request_id = payload.get("requestId")  # offerer's requestId
    if not matched_request_id:
        return jsonify({"error": "requestId of the offering ticket is required"}), 400
 
    result = respond_to_swap(
        swap_id,
        payload["userId"],
        payload["response"],
        matched_request_id,
    )
    return jsonify({"message": "Response submitted", "data": result}), 200


@swap_orchestration_bp.route("/swap/<swap_id>", methods=["GET"])
def swap_status_route(swap_id):
    result = get_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found"}), 404
    return jsonify({"data": result}), 200
