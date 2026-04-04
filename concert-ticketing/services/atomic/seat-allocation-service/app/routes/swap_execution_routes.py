"""
New endpoint: POST /swaps/{matchId}/execute
Called by swap-orchestration-service at Step C23.
"""
from flask import Blueprint, jsonify, request
from app.services.swap_execution_service import execute_swap

swap_exec_bp = Blueprint("swap_execution", __name__)


@swap_exec_bp.route("/swaps/<match_id>/execute", methods=["POST"])
def execute_swap_route(match_id):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON request body."}), 400

    required = ["orderA", "orderB", "seatA", "seatB"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        result = execute_swap(
            match_id=match_id,
            order_a=payload["orderA"],
            order_b=payload["orderB"],
            seat_a=payload["seatA"],
            seat_b=payload["seatB"],
        )
        return jsonify({"message": "Swap executed successfully.", "data": result}), 200
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409