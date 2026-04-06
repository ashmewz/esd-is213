import os
import requests
from flask import Blueprint, jsonify, request

from app.services.hold_service import cancel_hold, confirm_hold, create_hold
from app.core.database import SessionLocal
from app.models.seat_allocation_models import SeatAssignment

EVENTS_SERVICE_URL = os.getenv("EVENTS_SERVICE_URL", "http://events-service:5000")

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
    user_id = payload.get("userId")

    if order_id is None or event_id is None or seat_id is None or ttl_seconds is None:
        return jsonify({"error": "orderId, eventId, seatId, and ttlSeconds are required."}), 400

    if isinstance(order_id, bool):
        return jsonify({"error": "orderId must be a numeric order identifier."}), 400
    try:
        order_id = int(order_id)
    except (TypeError, ValueError):
        return jsonify({"error": "orderId must be a valid integer."}), 400

    try:
        hold = create_hold(order_id, event_id, seat_id, ttl_seconds, user_id=user_id)
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


@hold_bp.route("/seat-assignments", methods=["GET"])
def list_seat_assignments():
    """Return all SOLD seat assignments for a user, enriched with seat details.
    Uses one events-service call per unique event (not per seat) for performance.
    """
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId query param required"}), 400

    db = SessionLocal()
    try:
        assignments = (
            db.query(SeatAssignment)
            .filter(SeatAssignment.user_id == user_id, SeatAssignment.status == "SOLD")
            .all()
        )

        # Batch seat lookups by event — one call per event fetches all seats at once
        event_seats: dict = {}  # event_id -> {seat_id -> seat_dict}
        for a in assignments:
            eid = str(a.event_id)
            if eid not in event_seats:
                try:
                    resp = requests.get(
                        f"{EVENTS_SERVICE_URL}/events/{eid}/seats", timeout=5
                    )
                    if resp.status_code == 200:
                        seats_list = resp.json()
                        event_seats[eid] = {s["seatId"]: s for s in seats_list}
                    else:
                        event_seats[eid] = {}
                except Exception:
                    event_seats[eid] = {}

        result = []
        for a in assignments:
            eid = str(a.event_id)
            sid = str(a.seat_id)
            seat = event_seats.get(eid, {}).get(sid, {})
            tier = seat.get("tier")
            section_no = seat.get("sectionNo")
            row_no = seat.get("rowNo")
            seat_no = seat.get("seatNo")
            seat_label = (
                f"Section {section_no} · Row {row_no} · Seat {seat_no}"
                if section_no and row_no and seat_no else sid
            )
            result.append({
                "orderId": a.order_id,
                "eventId": eid,
                "seatId": sid,
                "status": a.status,
                "tier": tier,
                "sectionNo": section_no,
                "rowNo": row_no,
                "seatNo": seat_no,
                "seatLabel": seat_label,
            })

        return jsonify(result), 200
    finally:
        db.close()
