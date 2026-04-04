from flask import Blueprint, jsonify, request

from app.services.hold_service import cancel_hold, confirm_hold, create_hold


hold_bp = Blueprint("holds", __name__)


@hold_bp.route("/holds", methods=["POST"])
def create_hold_route():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON request body."}), 400

    order_id = payload.get("orderId")
    event_id = payload.get("eventId")
    seat_id = payload.get("seatId")
    ttl_seconds = payload.get("ttlSeconds")

    if order_id is None or event_id is None or seat_id is None or ttl_seconds is None:
        return jsonify({"error": "orderId, eventId, seatId, and ttlSeconds are required."}), 400

    if isinstance(order_id, bool):
        return jsonify({"error": "orderId must be a numeric order identifier."}), 400
    try:
        order_id = int(order_id)
    except (TypeError, ValueError):
        return jsonify({"error": "orderId must be a valid integer."}), 400

    try:
        hold = create_hold(order_id, event_id, seat_id, ttl_seconds)
        return (
            jsonify(
                {
                    "message": "Hold created successfully.",
                    "data": hold.to_dict(),
                }
            ),
            201,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409


@hold_bp.route("/holds/<hold_id>", methods=["DELETE"])
def cancel_hold_route(hold_id):
    try:
        hold = cancel_hold(hold_id)
        return (
            jsonify(
                {
                    "message": "Hold cancelled successfully.",
                    "data": hold.to_dict(),
                }
            ),
            200,
        )
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409


@hold_bp.route("/holds/<hold_id>/confirm", methods=["POST"])
def confirm_hold_route(hold_id):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON request body."}), 400

    transaction_id = payload.get("transactionId")
    if transaction_id is None:
        return jsonify({"error": "transactionId is required."}), 400

    try:
        assignment = confirm_hold(hold_id, transaction_id)
        return (
            jsonify(
                {
                    "message": "Hold confirmed successfully.",
                    "data": assignment.to_dict(),
                }
            ),
            200,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409
