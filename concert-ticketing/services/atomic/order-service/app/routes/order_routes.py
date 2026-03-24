import logging

from flask import Blueprint, jsonify, request

from app.services.order_service import create_order, get_order, update_order_status


logger = logging.getLogger(__name__)

order_bp = Blueprint("orders", __name__)

REQUIRED_ORDER_FIELDS = ("userId", "eventId", "seatId", "price")


@order_bp.route("/orders", methods=["POST"])
def create_order_route():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON request body."}), 400

    missing = [name for name in REQUIRED_ORDER_FIELDS if payload.get(name) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    user_id = payload.get("userId")
    event_id = payload.get("eventId")
    seat_id = payload.get("seatId")
    price = payload.get("price")
    currency = payload.get("currency", "SGD")

    try:
        order = create_order(user_id, event_id, seat_id, price, currency=currency)
        return (
            jsonify(
                {
                    "message": "Order created successfully.",
                    "data": order.to_dict(),
                }
            ),
            201,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        logger.exception("Unexpected error in create_order_route")
        return jsonify({"error": "Internal server error."}), 500


@order_bp.route("/orders/<order_id>", methods=["GET"])
def get_order_route(order_id):
    try:
        order = get_order(order_id)
        return jsonify(
            {
                "message": "Order retrieved successfully.",
                "data": order.to_dict(),
            }
        ), 200
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception:
        logger.exception("Unexpected error in get_order_route")
        return jsonify({"error": "Internal server error."}), 500


@order_bp.route("/orders/<order_id>/status", methods=["PUT"])
def update_order_status_route(order_id):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON request body."}), 400

    status = payload.get("status")

    if status is None:
        return jsonify({"error": "status is required."}), 400

    try:
        order = update_order_status(order_id, status)
        return (
            jsonify(
                {
                    "message": "Order status updated successfully.",
                    "data": order.to_dict(),
                }
            ),
            200,
        )
    except LookupError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        logger.exception("Unexpected error in update_order_status_route")
        return jsonify({"error": "Internal server error."}), 500
