from flask import Blueprint, jsonify, request
from sqlalchemy import text
from app.core.database import SessionLocal

swap_exec_bp = Blueprint("swap_exec", __name__)


@swap_exec_bp.route("/swaps/execute", methods=["POST"])
def execute_swap():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "JSON body required"}), 400
    order_id_a = payload.get("orderIdA")
    seat_id_a  = payload.get("seatIdA")
    order_id_b = payload.get("orderIdB")
    seat_id_b  = payload.get("seatIdB")
    if not all([order_id_a, seat_id_a, order_id_b, seat_id_b]):
        return jsonify({"error": "orderIdA, seatIdA, orderIdB, seatIdB required"}), 400
    db = SessionLocal()
    try:
        # Swap: order A now holds seat B, order B now holds seat A
        db.execute(text("""
            UPDATE seat_allocation_service.seat_assignments
            SET seat_id = :new_seat
            WHERE order_id = :order_id AND status = 'SOLD'
        """), {"new_seat": seat_id_b, "order_id": order_id_a})
        db.execute(text("""
            UPDATE seat_allocation_service.seat_assignments
            SET seat_id = :new_seat
            WHERE order_id = :order_id AND status = 'SOLD'
        """), {"new_seat": seat_id_a, "order_id": order_id_b})
        db.commit()
        return jsonify({"message": "Swap executed successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
