# app/repositories/swap_repository.py

from app.models.swap_models import SwapRequest, SwapMatch
from app.core.database import SessionLocal


def create_swap_request(request):
    db = SessionLocal()
    try:
        db.add(request)
        db.commit()
        db.refresh(request)
        return request
    finally:
        db.close()


def find_matching_requests(event_id, request_id):
    db = SessionLocal()
    try:
        return (
            db.query(SwapRequest)
            .filter(
                SwapRequest.event_id == event_id,
                SwapRequest.status == "PENDING",
                SwapRequest.request_id != request_id,
            )
            .all()
        )
    finally:
        db.close()