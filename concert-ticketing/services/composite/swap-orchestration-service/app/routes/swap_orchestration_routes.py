from flask import Blueprint, jsonify, request
from app.services.swap_orchestration_service import (
    start_swap,
    respond_to_swap,
    on_payment_settled,
    on_payment_failed,
    get_status,
)

swap_orchestration_bp = Blueprint("swap_orchestrator", __name__)


@swap_orchestration_bp.route("/swap-requests", methods=["POST"])
def create_swap_route():
    """
    Steps C1/C2: Accept swap request from Kong/frontend.
    Body: { orderId, eventId, currentSeatId, currentTier, desiredTier }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON."}), 400

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
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON."}), 400

    user_id = payload.get("userId")
    response = (payload.get("response") or "").upper()

    if not user_id or not response:
        return jsonify({"error": "userId and response are required."}), 400
    if response not in ("ACCEPT", "DECLINE"):
        return jsonify({"error": "response must be ACCEPT or DECLINE."}), 400

    payment_method_id = payload.get("paymentMethodId")

    try:
        result = respond_to_swap(
            swap_id=swap_id,
            user_id=user_id,
            response=response,
            payment_method_id=payment_method_id,
        )
        return jsonify({"message": "Response submitted.", "data": result}), 200
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@swap_orchestration_bp.route("/swap-matches/<swap_id>/payment-settled", methods=["POST"])
def payment_settled_route(swap_id):
    """Internal: triggered by swap payment result consumer (or directly in tests)."""
    payload = request.get_json(silent=True) or {}
    transaction_id = payload.get("transactionId")
    if not transaction_id:
        return jsonify({"error": "transactionId is required."}), 400
    try:
        on_payment_settled(swap_id, transaction_id)
        return jsonify({"message": "Swap execution triggered."}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@swap_orchestration_bp.route("/swap-matches/<swap_id>/payment-failed", methods=["POST"])
def payment_failed_route(swap_id):
    """Internal: triggered by swap payment result consumer (or directly in tests)."""
    payload = request.get_json(silent=True) or {}
    reason = payload.get("reason", "PAYMENT_FAILED")
    on_payment_failed(swap_id, reason)
    return jsonify({"message": "Swap aborted."}), 200


@swap_orchestration_bp.route("/swap-requests", methods=["GET"])
def list_swap_requests_route():
    """List authenticated user's swap requests. JWT decoded by Kong."""
    from app.clients.swap_client import get_user_swap_requests
    user_id = request.args.get("userId")
    try:
        result = get_user_swap_requests(user_id)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@swap_orchestration_bp.route("/swap-requests/<request_id>", methods=["DELETE"])
def cancel_swap_request_route(request_id):
    """Cancel a PENDING swap request."""
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
    """Get full swap match status including confirmations."""
    result = get_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found."}), 404
    return jsonify({"data": result}), 200