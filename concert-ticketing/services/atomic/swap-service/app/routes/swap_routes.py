from flask import Blueprint, request, jsonify
from app.services.swap_service import (
    create_swap_request,
    submit_swap_response,
    get_swap_request,
    get_swap_status,
    expire_stale_requests,
)

swap_bp = Blueprint("swap", __name__)


@swap_bp.route("/swap", methods=["POST"])
def create_swap_request_route():
    payload = request.get_json(silent=True)
    required_fields = ["orderId", "eventId", "currentSeatId", "currentTier", "desiredTier"]

    if not payload or any(f not in payload for f in required_fields):
        return jsonify({"error": f"Fields required: {required_fields}"}), 400

    # Expire stale requests before attempting a new match
    expire_stale_requests()

    result = create_swap_request(
        order_id=payload["orderId"],
        event_id=payload["eventId"],
        current_seat_id=payload["currentSeatId"],
        current_tier=payload["currentTier"],
        desired_tier=payload["desiredTier"],
    )
    return jsonify({"message": "Swap request created.", "data": result}), 201


@swap_bp.route("/swap/<swap_id>/responses", methods=["POST"])
def submit_swap_response_route(swap_id):
    payload = request.get_json(silent=True)
    if not payload or "userId" not in payload or "response" not in payload:
        return jsonify({"error": "userId and response are required."}), 400

    response = payload["response"].upper()
    if response not in ("ACCEPT", "DECLINE"):
        return jsonify({"error": "response must be ACCEPT or DECLINE."}), 400

    try:
        result = submit_swap_response(
            swap_id=swap_id,
            user_id=payload["userId"],
            response=response,
        )
        return jsonify({"message": "Swap response submitted.", "data": result}), 200
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@swap_bp.route("/swap/requests/<request_id>", methods=["GET"])
def get_swap_request_route(request_id):
    result = get_swap_request(request_id)
    if not result:
        return jsonify({"error": "Swap request not found."}), 404
    return jsonify({"data": result}), 200


@swap_bp.route("/swap/<swap_id>", methods=["GET"])
def get_swap_status_route(swap_id):
    result = get_swap_status(swap_id)
    if not result:
        return jsonify({"error": "Swap not found."}), 404
    return jsonify({"data": result}), 200


@swap_bp.route("/swap/requests/<request_id>", methods=["DELETE"])
def cancel_swap_request_route(request_id):
    from app.core.database import SessionLocal
    from app.models.swap_models import SwapRequest
    db = SessionLocal()
    try:
        req = db.get(SwapRequest, request_id)
        if not req:
            return jsonify({"error": "Swap request not found."}), 404
        if req.status != "PENDING":
            return jsonify({"error": f"Cannot cancel a request in status '{req.status}'."}), 409
        req.status = "CANCELLED"
        db.commit()
        return jsonify({"message": "Swap request cancelled.", "data": req.to_dict()}), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()