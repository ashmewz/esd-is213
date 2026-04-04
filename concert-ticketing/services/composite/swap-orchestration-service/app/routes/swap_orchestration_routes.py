from flask import Blueprint, jsonify, request
from app.services.swap_orchestration_service import (
    start_swap,
    respond_to_swap,
    execute_swap_after_payment,
    abort_swap_after_payment_failure,
    get_status,
)

swap_orchestration_bp = Blueprint("swap_orchestrator", __name__)


@swap_orchestration_bp.route("/swap-requests", methods=["POST"])
def create_swap_route():
    """
    Step C2: Start a swap request.
    Body: { orderId, eventId, currentSeatId, desiredTier }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400

    required = ["orderId", "eventId", "currentSeatId", "desiredTier"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        result = start_swap(
            order_id=payload["orderId"],
            event_id=payload["eventId"],
            current_seat_id=payload["currentSeatId"],
            desired_tier=payload["desiredTier"],
            current_tier=payload.get("currentTier"),
        )
        return jsonify({"message": "Swap request created.", "data": result}), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@swap_orchestration_bp.route("/swap-matches/<swap_id>/response", methods=["POST"])
def swap_response_route(swap_id):
    """
    Steps C10–C14: Submit a user's ACCEPT or DECLINE response.
    Body: { userId, response }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400

    user_id = payload.get("userId")
    response = payload.get("response")

    if not user_id or not response:
        return jsonify({"error": "userId and response are required."}), 400

    response = response.upper()
    if response not in ("ACCEPT", "DECLINE"):
        return jsonify({"error": "response must be ACCEPT or DECLINE."}), 400

    try:
        result = respond_to_swap(swap_id, user_id, response)
        return jsonify({"message": "Response submitted.", "data": result}), 200
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@swap_orchestration_bp.route("/swap-matches/<swap_id>/payment-settled", methods=["POST"])
def payment_settled_route(swap_id):
    """
    Step C22 (success path): Called by the Payment Service consumer after
    swap.payment.settled is consumed, or can be called directly in tests.
    Body: { transactionId }
    """
    payload = request.get_json(silent=True)
    transaction_id = (payload or {}).get("transactionId")

    if not transaction_id:
        return jsonify({"error": "transactionId is required."}), 400

    try:
        execute_swap_after_payment(swap_id, transaction_id)
        return jsonify({"message": "Swap execution triggered."}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@swap_orchestration_bp.route("/swap-matches/<swap_id>/payment-failed", methods=["POST"])
def payment_failed_route(swap_id):
    """
    Step C22 (failure path): Called after swap.payment.failed is consumed.
    Body: { reason }
    """
    payload = request.get_json(silent=True)
    reason = (payload or {}).get("reason", "PAYMENT_FAILED")
    abort_swap_after_payment_failure(swap_id, reason)
    return jsonify({"message": "Swap aborted."}), 200


@swap_orchestration_bp.route("/swap-requests", methods=["GET"])
def list_swap_requests_route():
    """
    SwapPage: list the authenticated user's open swap requests.
    The JWT is forwarded by Kong; the swap service uses it to filter by user.
    """
    from app.clients.swap_client import get_user_swap_requests
    from flask import request as flask_request
    user_id = flask_request.args.get("userId")  # fallback for direct calls
    try:
        result = get_user_swap_requests(user_id)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@swap_orchestration_bp.route("/swap-requests/<request_id>", methods=["DELETE"])
def cancel_swap_request_route(request_id):
    """Cancel a pending swap request before it is matched."""
    from app.clients.swap_client import cancel_swap_request
    try:
        result = cancel_swap_request(request_id)
        return jsonify({"message": "Swap request cancelled.", "data": result}), 200
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409


@swap_orchestration_bp.route("/swap-matches/<swap_id>", methods=["GET"])
def swap_status_route(swap_id):
    """Get full swap match status."""
    result = get_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found."}), 404
    return jsonify({"data": result}), 200