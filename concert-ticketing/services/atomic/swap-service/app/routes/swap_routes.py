from flask import Blueprint, request, jsonify
from app.services.swap_service import (
    create_swap_request,
    submit_swap_response,
    get_swap_request,
    get_swap_status,
)
from app.core.database import SessionLocal
from app.models.swap_models import SwapRequest

swap_bp = Blueprint("swap", __name__)

@swap_bp.route("/swap", methods=["POST"], endpoint="create_swap")
def create_swap_request_route():
    payload = request.get_json(silent=True)

    required_fields = ["orderId", "eventId", "currentSeatId", "desiredTier"]
    if not payload or any(f not in payload for f in required_fields):
        return jsonify({"error": f"Fields required: {required_fields}"}), 400

    try:
        result = create_swap_request(
            order_id=payload["orderId"],
            event_id=payload["eventId"],
            current_seat_id=payload["currentSeatId"],
            desired_tier=payload["desiredTier"],
        )
        return jsonify({"message": "Swap request created", "data": result}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e) or "Failed to create swap request"}), 500

@swap_bp.route("/swap-requests", methods=["POST"], endpoint="create_swap_compat")
def create_swap_request_compat():
    payload = request.get_json(silent=True)

    if not payload:
        return jsonify({"error": "Invalid JSON"}), 400

    order_id = payload.get("orderId")
    event_id = payload.get("eventId")
    current_seat_id = payload.get("currentSeatId") or payload.get("seatId")
    desired_tier = payload.get("desiredTier")

    if not all([order_id, event_id, current_seat_id, desired_tier]):
        return jsonify({
            "error": "Fields required: orderId, eventId, currentSeatId/seatId, desiredTier"
        }), 400

    try:
        result = create_swap_request(
            order_id=order_id,
            event_id=event_id,
            current_seat_id=current_seat_id,
            desired_tier=desired_tier,
        )

        return jsonify({
            "message": "Swap request created",
            "data": result
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e) or "Failed to create swap request"
        }), 500

@swap_bp.route("/swap/<swap_id>/responses", methods=["POST"], endpoint="submit_response")
def submit_swap_response_route(swap_id):
    payload = request.get_json(silent=True)

    if not payload or "userId" not in payload or "response" not in payload:
        return jsonify({"error": "userId and response are required"}), 400

    try:
        result = submit_swap_response(
            swap_id=swap_id,
            user_id=payload["userId"],
            response=payload["response"].upper(),
        )
        return jsonify({"message": "Swap response submitted", "data": result}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@swap_bp.route("/swap/requests/<request_id>", methods=["GET"], endpoint="get_request")
def get_swap_request_route(request_id):
    result = get_swap_request(request_id)

    if not result:
        return jsonify({"error": "Swap request not found"}), 404

    return jsonify({"data": result}), 200

@swap_bp.route("/swap/<swap_id>", methods=["GET"], endpoint="get_status")
def get_swap_status_route(swap_id):
    result = get_swap_status(swap_id)

    if not result:
        return jsonify({"error": "Swap not found"}), 404

    return jsonify({"data": result}), 200

@swap_bp.route("/swap-requests", methods=["GET"], endpoint="list_requests")
def list_swap_requests():
    user_id = request.args.get("userId")
    result = get_user_swap_requests(user_id)
    return jsonify(result), 200

def get_user_swap_requests(user_id=None):
    db = SessionLocal()
    try:
        query = db.query(SwapRequest)

        # ✅ FIXED: filter by user_id (not order_id)
        if user_id:
            query = query.filter(SwapRequest.user_id == user_id)

        requests = query.all()
        return [r.to_dict() for r in requests]

    finally:
        db.close()