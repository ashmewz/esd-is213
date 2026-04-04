"""
Swap execution service — Step C24.
Atomically swaps seat ownership between two orders in seat_assignments.
"""
from app.core.database import SessionLocal
from app.models.seat_allocation_models import SeatAssignment, ReallocationLog


def execute_swap(match_id, order_a, order_b, seat_a, seat_b):
    """
    Step C24: Atomically swap seat_id between two SeatAssignment rows.

    order_a currently holds seat_a  →  should hold seat_b after swap
    order_b currently holds seat_b  →  should hold seat_a after swap

    Raises LookupError if either assignment is not found.
    Raises RuntimeError if either assignment is not in a swappable state.
    """
    db = SessionLocal()
    try:
        assign_a = (
            db.query(SeatAssignment)
            .filter_by(order_id=order_a, seat_id=seat_a, status="SOLD")
            .first()
        )
        assign_b = (
            db.query(SeatAssignment)
            .filter_by(order_id=order_b, seat_id=seat_b, status="SOLD")
            .first()
        )

        if not assign_a:
            raise LookupError(
                f"No SOLD assignment found for order {order_a} seat {seat_a}."
            )
        if not assign_b:
            raise LookupError(
                f"No SOLD assignment found for order {order_b} seat {seat_b}."
            )

        # Atomically swap seat_ids
        assign_a.seat_id = seat_b
        assign_a.status = "SOLD"  # remains sold; just a different seat

        assign_b.seat_id = seat_a
        assign_b.status = "SOLD"

        # Log both sides of the reallocation for audit
        log_a = ReallocationLog(
            order_id=order_a,
            old_seat_id=seat_a,
            new_seat_id=seat_b,
            reason="SWAP_EXECUTED",
        )
        log_b = ReallocationLog(
            order_id=order_b,
            old_seat_id=seat_b,
            new_seat_id=seat_a,
            reason="SWAP_EXECUTED",
        )
        db.add(log_a)
        db.add(log_b)

        db.commit()

        return {
            "matchId": match_id,
            "status": "SWAP_EXECUTED",
            "orderA": {"orderId": str(order_a), "newSeatId": str(seat_b)},
            "orderB": {"orderId": str(order_b), "newSeatId": str(seat_a)},
        }

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()