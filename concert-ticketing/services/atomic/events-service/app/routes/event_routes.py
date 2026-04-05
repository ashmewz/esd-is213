from datetime import datetime, time, timezone
import uuid

from flask import Blueprint, jsonify, request
from app.core.database import SessionLocal
from app.core.seatmap_templates import SEAT_TEMPLATES, build_visual_sections, generate_event_seats
from app.core.venue_templates import resolve_event_venue
from app.models.events_models import Event, EventShowtime, EventVisualSection, Hold, Seat, SeatAssignment

event_bp = Blueprint("events", __name__)

ALLOWED_SEAT_STATUSES = frozenset({"available", "held", "sold", "blocked", "removed"})
_CUSTOM_SEAT_NS = uuid.UUID("a7c15f48-5012-4d7f-8da4-7a883fb17df6")


def _seat_response(seat: Seat) -> dict:
    return {
        "seatId": str(seat.seat_id),
        "eventId": str(seat.event_id),
        "sectionNo": int(seat.section_no) if seat.section_no is not None else None,
        "rowNo": int(seat.row_no) if seat.row_no is not None else None,
        "seatNo": int(seat.seat_no) if seat.seat_no is not None else None,
        "tier": seat.tier,
        "basePrice": float(seat.base_price),
        "status": seat.status.lower() if seat.status else "available",
    }


def _sync_seat_statuses_from_allocations(db, event_id) -> None:
    now = datetime.now(timezone.utc)
    holds = db.query(Hold).filter_by(event_id=event_id).all()
    assignments = db.query(SeatAssignment).filter_by(event_id=event_id).all()
    seats = db.query(Seat).filter_by(event_id=event_id).all()

    assigned_seat_ids = {assignment.seat_id for assignment in assignments}
    active_hold_seat_ids = set()
    changed = False

    for hold in holds:
        expiry = hold.expiry
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        if hold.status == "ACTIVE" and expiry <= now:
            hold.status = "EXPIRED"
            changed = True

        if hold.status == "ACTIVE" and hold.seat_id not in assigned_seat_ids:
            active_hold_seat_ids.add(hold.seat_id)

    for seat in seats:
        if seat.seat_id in assigned_seat_ids:
            if (seat.status or "").lower() != "sold":
                seat.status = "sold"
                changed = True
            continue

        if seat.seat_id in active_hold_seat_ids:
            if (seat.status or "").lower() != "held":
                seat.status = "held"
                changed = True
            continue

        if (seat.status or "").lower() == "held":
            seat.status = "available"
            changed = True

    if changed:
        db.commit()


def _showtime_response(showtime: EventShowtime) -> dict:
    return {
        "showtimeId": str(showtime.showtime_id),
        "eventId": str(showtime.event_id),
        "dateId": showtime.date_id.isoformat() if showtime.date_id else None,
        "label": showtime.label,
        "times": showtime.times or [],
    }


def _parse_showtime_start(show_date, raw_time: str) -> datetime | None:
    value = str(raw_time or "").strip()
    if not value:
        return None

    for fmt in ("%I:%M %p", "%I %p", "%H:%M", "%H%M"):
        try:
            parsed_time = datetime.strptime(value, fmt).time()
            return datetime.combine(show_date, parsed_time)
        except ValueError:
            continue
    return None


def _derive_runtime_status(event: Event, showtimes: list[EventShowtime]) -> tuple[str, bool, list[dict]]:
    stored_status = (event.status or "").strip().lower()
    if stored_status == "deleted":
        return "deleted", False, [
            {
                **_showtime_response(showtime),
                "availableTimes": [],
                "isSellable": False,
            }
            for showtime in showtimes
        ]

    now = datetime.now()
    has_started = False
    has_future = False
    dates_payload = []

    for showtime in showtimes:
        available_times = []
        for raw_time in showtime.times or []:
            start_at = _parse_showtime_start(showtime.date_id, raw_time)
            if start_at is None:
                available_times.append(raw_time)
                has_future = True
                continue
            if start_at > now:
                available_times.append(raw_time)
                has_future = True
            else:
                has_started = True

        if showtime.date_id and showtime.date_id < now.date():
            has_started = True

        dates_payload.append(
            {
                **_showtime_response(showtime),
                "availableTimes": available_times,
                "isSellable": len(available_times) > 0,
            }
        )

    if has_future:
        derived_status = "live" if has_started else "upcoming"
    else:
        derived_status = "finished"

    return derived_status, has_future, dates_payload


def _visual_section_response(section: EventVisualSection) -> dict:
    return {
        "visualSectionId": str(section.visual_section_id),
        "eventId": str(section.event_id),
        "sectionCode": section.section_code,
        "label": section.label,
        "dataSection": section.data_section,
        "x": float(section.x) if section.x is not None else None,
        "y": float(section.y) if section.y is not None else None,
        "w": float(section.w) if section.w is not None else None,
        "h": float(section.h) if section.h is not None else None,
        "multiline": bool(section.multiline),
        "hidden": bool(section.hidden),
        "shape": section.shape,
        "pts": section.pts,
    }


def _tier_prices_response(seats: list[Seat]) -> dict:
    prices = {}
    for seat in seats:
        if seat.tier and seat.tier not in prices:
            prices[seat.tier] = float(seat.base_price)
    return prices


def _event_response(db, event: Event) -> dict:
    payload = event.to_dict()
    showtimes = (
        db.query(EventShowtime)
        .filter_by(event_id=event.event_id)
        .order_by(EventShowtime.date_id.asc())
        .all()
    )
    derived_status, can_buy, dates_payload = _derive_runtime_status(event, showtimes)
    payload["status"] = derived_status
    payload["canBuy"] = can_buy
    payload["dates"] = dates_payload
    return payload


def _normalize_times(times) -> list[str]:
    if not isinstance(times, list):
        return []
    return [str(time).strip() for time in times if str(time).strip()]


def _extract_showtime_payloads(payload: dict) -> list[dict]:
    raw_dates = payload.get("dates")
    if not isinstance(raw_dates, list):
        return []

    showtimes = []
    for item in raw_dates:
        if not isinstance(item, dict):
            continue
        date_id = str(item.get("dateId") or "").strip()
        label = str(item.get("label") or "").strip()
        times = _normalize_times(item.get("times"))
        if not date_id or not label:
            continue
        try:
            parsed_date = datetime.strptime(date_id, "%Y-%m-%d").date()
        except ValueError:
            continue
        showtimes.append(
            {
                "date_id": parsed_date,
                "label": label,
                "times": times,
            }
        )
    return showtimes


def _derive_event_datetime(payload: dict, showtimes: list[dict]) -> tuple[datetime | None, str]:
    event_timing = ""

    if showtimes:
        first = showtimes[0]
        if first["times"]:
            event_timing = first["times"][0]
        return datetime.combine(first["date_id"], datetime.min.time()), event_timing

    raw_event_date = str(payload.get("eventDate") or "").strip()
    if raw_event_date:
        try:
            parsed = datetime.fromisoformat(raw_event_date.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=None), str(payload.get("eventTiming") or "").strip()
        except ValueError:
            pass

    return None, str(payload.get("eventTiming") or "").strip()


def _derive_event_date_display(showtimes: list[dict], payload: dict) -> str | None:
    if not showtimes:
        raw_display = str(payload.get("date") or "").strip()
        return raw_display or None

    ordered_dates = sorted(showtime["date_id"] for showtime in showtimes)
    first = ordered_dates[0]
    last = ordered_dates[-1]

    if first == last:
        return first.strftime("%a %d %b %Y")

    if first.year == last.year and first.month == last.month:
        return f"{first.strftime('%a %d')} - {last.strftime('%a %d %b %Y')}"

    if first.year == last.year:
        return f"{first.strftime('%a %d %b')} - {last.strftime('%a %d %b %Y')}"

    return f"{first.strftime('%a %d %b %Y')} - {last.strftime('%a %d %b %Y')}"


def _apply_event_payload(event: Event, payload: dict) -> list[dict]:
    showtimes = _extract_showtime_payloads(payload)
    event_datetime, event_timing = _derive_event_datetime(payload, showtimes)
    if event_datetime is None:
        raise ValueError("At least one valid date is required.")
    venue = resolve_event_venue(payload)

    event.name = str(payload.get("name") or "").strip()
    event.venue_id = venue["venue_id"]
    event.venue_name = venue["venue_name"]
    event.event_date = event_datetime
    event.event_timing = event_timing
    event.event_date_display = _derive_event_date_display(showtimes, payload) or event_datetime.strftime("%Y-%m-%d")
    event.status = str(payload.get("status") or "active").strip().lower() or "active"
    event.image_url = str(payload.get("imageUrl") or "").strip() or None
    event.seatmap = venue["seatmap_template_id"]
    event.min_price = payload.get("minPrice")
    return showtimes


def _replace_event_template_data(db, event: Event) -> None:
    db.query(Seat).filter_by(event_id=event.event_id).delete()
    db.query(EventVisualSection).filter_by(event_id=event.event_id).delete()

    generated_seats = generate_event_seats(event.event_id, event.seatmap)
    generated_sections = build_visual_sections(event.event_id, event.seatmap)

    for seat in generated_seats:
        db.add(seat)
    for section in generated_sections:
        db.add(section)

    if generated_seats:
        event.min_price = min(seat.base_price for seat in generated_seats)


def _fallback_tier_for_section(event: Event, data_section: int) -> str:
    if event.seatmap == 2:
        if data_section == 120:
            return "VIP"
        if 110 <= data_section <= 129 and data_section != 120:
            return "CAT1"
        if (100 <= data_section <= 109) or (200 <= data_section <= 299):
            return "CAT2"
        if 300 <= data_section <= 599:
            return "CAT3"
    if 1000 <= data_section < 2000:
        return "VIP"
    if 2000 <= data_section < 3000:
        return "CAT1"
    if 3000 <= data_section < 4000:
        return "CAT2"
    if 4000 <= data_section < 5000:
        return "CAT3"
    if data_section == 1:
        return "VIP"
    if data_section <= 3:
        return "CAT1"
    if data_section <= 5:
        return "CAT2"
    return "CAT3"


def _seed_spec_for_tier(event: Event, tier: str) -> dict | None:
    templates = SEAT_TEMPLATES.get(event.seatmap) or []
    for template in templates:
        if template["tier"] == tier:
            return template
    return None


def _sync_seats_for_visual_sections(db, event: Event, payload: list[dict]) -> None:
    referenced_sections = {
        int(item.get("dataSection"))
        for item in payload
        if item.get("dataSection") is not None
    }
    existing_seats = db.query(Seat).filter_by(event_id=event.event_id).all()
    seats_by_section = {}
    for seat in existing_seats:
        seats_by_section.setdefault(int(seat.section_no), []).append(seat)

    for section_no, section_seats in list(seats_by_section.items()):
        if section_no not in referenced_sections:
            for seat in section_seats:
                db.delete(seat)

    existing_sections = set(seats_by_section.keys())
    missing_sections = sorted(referenced_sections - existing_sections)
    if not missing_sections:
        remaining_seats = db.query(Seat).filter_by(event_id=event.event_id).all()
        if remaining_seats:
            event.min_price = min(seat.base_price for seat in remaining_seats)
        return

    payload_by_section = {
        int(item["dataSection"]): item
        for item in payload
        if item.get("dataSection") is not None
    }
    remaining_by_section = {
        int(section_no): seats
        for section_no, seats in seats_by_section.items()
        if int(section_no) in referenced_sections
    }

    for section_no in missing_sections:
        item = payload_by_section.get(section_no, {})
        tier = str(item.get("tier") or "").strip().upper() or _fallback_tier_for_section(event, section_no)

        same_tier_sections = []
        for other_section_no, section_seats in remaining_by_section.items():
            if section_seats and section_seats[0].tier == tier:
                same_tier_sections.append((other_section_no, section_seats))

        exemplar = None
        if same_tier_sections:
            exemplar = min(
                same_tier_sections,
                key=lambda pair: abs(pair[0] - section_no),
            )[1]

        if exemplar:
            for seat in exemplar:
                db.add(
                    Seat(
                        seat_id=uuid.uuid5(
                            _CUSTOM_SEAT_NS,
                            f"{event.event_id}|{tier}|{section_no}|{seat.row_no}|{seat.seat_no}",
                        ),
                        event_id=event.event_id,
                        tier=tier,
                        section_no=section_no,
                        row_no=seat.row_no,
                        seat_no=seat.seat_no,
                        base_price=seat.base_price,
                        status="available",
                    )
                )
            continue

        seed = _seed_spec_for_tier(event, tier)
        if seed is None:
            continue

        for row_no in range(1, seed["rows"] + 1):
            for seat_no in range(1, seed["seatsPerRow"] + 1):
                db.add(
                    Seat(
                        seat_id=uuid.uuid5(
                            _CUSTOM_SEAT_NS,
                            f"{event.event_id}|{tier}|{section_no}|{row_no}|{seat_no}",
                        ),
                        event_id=event.event_id,
                        tier=tier,
                        section_no=section_no,
                        row_no=row_no,
                        seat_no=seat_no,
                        base_price=seed["basePrice"],
                        status="available",
                    )
                )

    remaining_seats = db.query(Seat).filter_by(event_id=event.event_id).all()
    if remaining_seats:
        event.min_price = min(seat.base_price for seat in remaining_seats)


def _ensure_event_template_data(db, event: Event) -> None:
    if not event.venue_name:
        return

    needs_refresh = False
    venue_payload = {"venueId": str(event.venue_id) if event.venue_id else None, "venueName": event.venue_name}

    if not event.venue_id or not event.seatmap:
        venue = resolve_event_venue(venue_payload)
        event.venue_id = venue["venue_id"]
        event.venue_name = venue["venue_name"]
        event.seatmap = venue["seatmap_template_id"]
        needs_refresh = True

    has_seats = db.query(Seat).filter_by(event_id=event.event_id).first() is not None
    has_sections = db.query(EventVisualSection).filter_by(event_id=event.event_id).first() is not None

    if has_seats and has_sections:
        legacy_seat = (
            db.query(Seat)
            .filter_by(event_id=event.event_id)
            .filter(Seat.section_no < 100)
            .first()
        )
        legacy_section = (
            db.query(EventVisualSection)
            .filter_by(event_id=event.event_id)
            .filter(EventVisualSection.data_section < 100)
            .first()
        )
        if legacy_seat or legacy_section:
            _replace_event_template_data(db, event)
            needs_refresh = True
            has_seats = True
            has_sections = True

    if not has_seats or not has_sections:
        _replace_event_template_data(db, event)
        needs_refresh = True

    if needs_refresh:
        db.commit()


@event_bp.route("/")
def hello():
    return "Hello from events service"


@event_bp.route("/events")
def list_events():
    db = SessionLocal()
    try:
        include_deleted = str(request.args.get("includeDeleted", "")).lower() in {"1", "true", "yes"}
        include_finished = str(request.args.get("includeFinished", "")).lower() in {"1", "true", "yes"}
        query = db.query(Event)
        if not include_deleted:
            query = query.filter(Event.status != "deleted")
        events = query.all()
        payloads = [_event_response(db, event) for event in events]
        if not include_finished:
          payloads = [event for event in payloads if event.get("status") != "finished"]
        return jsonify(payloads), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>")
def get_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        _ensure_event_template_data(db, event)
        return jsonify(_event_response(db, event)), 200
    finally:
        db.close()


@event_bp.route("/events", methods=["POST"])
def create_event():
    db = SessionLocal()
    try:
        payload = request.get_json(silent=True) or {}
        event = Event()
        showtimes = _apply_event_payload(event, payload)

        if not event.name:
            return jsonify({"error": "name is required"}), 400

        db.add(event)
        db.flush()

        for showtime in showtimes:
            db.add(
                EventShowtime(
                    event_id=event.event_id,
                    date_id=showtime["date_id"],
                    label=showtime["label"],
                    times=showtime["times"],
                )
            )

        _replace_event_template_data(db, event)

        db.commit()
        db.refresh(event)
        return jsonify(_event_response(db, event)), 201
    except ValueError as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 400
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        payload = request.get_json(silent=True) or {}
        showtimes = _apply_event_payload(event, payload)
        if not event.name:
            return jsonify({"error": "name is required"}), 400

        db.query(EventShowtime).filter_by(event_id=event.event_id).delete()
        for showtime in showtimes:
            db.add(
                EventShowtime(
                    event_id=event.event_id,
                    date_id=showtime["date_id"],
                    label=showtime["label"],
                    times=showtime["times"],
                )
            )

        _replace_event_template_data(db, event)

        db.commit()
        db.refresh(event)
        return jsonify(_event_response(db, event)), 200
    except ValueError as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 400
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        event.status = "deleted"
        db.commit()
        return jsonify({"message": "Event deleted", "data": _event_response(db, event)}), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats")
def list_seats_for_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        _ensure_event_template_data(db, event)
        _sync_seat_statuses_from_allocations(db, event_id)
        seats = db.query(Seat).filter_by(event_id=event_id).all()
        return jsonify([_seat_response(s) for s in seats]), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/visual-sections")
def list_visual_sections_for_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        _ensure_event_template_data(db, event)
        sections = (
            db.query(EventVisualSection)
            .filter_by(event_id=event_id)
            .order_by(EventVisualSection.section_code.asc())
            .all()
        )
        return jsonify([_visual_section_response(section) for section in sections]), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/visual-sections", methods=["PUT"])
def update_visual_sections_for_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        payload = request.get_json(silent=True)
        if not isinstance(payload, list):
            return jsonify({"error": "A list of visual sections is required"}), 400

        _ensure_event_template_data(db, event)

        db.query(EventVisualSection).filter_by(event_id=event_id).delete()

        created_sections = []
        for item in payload:
            section_code = str(item.get("sectionCode") or item.get("id") or "").strip()
            label = str(item.get("label") or "").strip()
            data_section = item.get("dataSection")
            if not section_code or not label or data_section is None:
                continue

            raw_x = item.get("x")
            raw_y = item.get("y")
            raw_w = item.get("w")
            raw_h = item.get("h")
            section = EventVisualSection(
                event_id=event.event_id,
                section_code=section_code,
                label=label,
                data_section=int(data_section),
                x=float(raw_x) if raw_x is not None else None,
                y=float(raw_y) if raw_y is not None else None,
                w=float(raw_w) if raw_w is not None else None,
                h=float(raw_h) if raw_h is not None else None,
                multiline=bool(item.get("multiline", False)),
                hidden=bool(item.get("hidden", False)),
                shape=item.get("shape"),
                pts=item.get("pts"),
            )
            db.add(section)
            created_sections.append(section)

        _sync_seats_for_visual_sections(db, event, payload)

        db.commit()
        return jsonify([_visual_section_response(section) for section in created_sections]), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>/tier-prices")
def get_tier_prices_for_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        seats = (
            db.query(Seat)
            .filter_by(event_id=event_id)
            .order_by(Seat.tier.asc(), Seat.section_no.asc(), Seat.row_no.asc(), Seat.seat_no.asc())
            .all()
        )
        return jsonify(_tier_prices_response(seats)), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/tier-prices", methods=["PUT"])
def update_tier_prices_for_event(event_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404

        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            return jsonify({"error": "Tier prices payload must be an object"}), 400

        seats = db.query(Seat).filter_by(event_id=event_id).all()
        for tier, raw_price in payload.items():
            try:
                price = float(raw_price)
            except (TypeError, ValueError):
                continue
            for seat in seats:
                if seat.tier == tier:
                    seat.base_price = price

        if seats:
            event.min_price = min(seat.base_price for seat in seats)

        db.commit()
        return jsonify(_tier_prices_response(seats)), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats/<seat_id>")
def get_seat(event_id, seat_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        _sync_seat_statuses_from_allocations(db, event_id)
        seat = db.query(Seat).filter_by(seat_id=seat_id, event_id=event_id).first()
        if seat is None:
            return jsonify({"error": "Seat not found"}), 404
        if seat.status.lower() != "available":
            return jsonify({"error": "Seat is not available"}), 409
        return jsonify(_seat_response(seat)), 200
    finally:
        db.close()


@event_bp.route("/events/<event_id>/seats/<seat_id>/status", methods=["PUT"])
def update_seat_status(event_id, seat_id):
    db = SessionLocal()
    try:
        event = db.query(Event).filter_by(event_id=event_id).first()
        if event is None:
            return jsonify({"error": "Event not found"}), 404
        seat = db.query(Seat).filter_by(seat_id=seat_id, event_id=event_id).first()
        if seat is None:
            return jsonify({"error": "Seat not found"}), 404

        payload = request.get_json(silent=True)
        if not payload or "status" not in payload:
            return jsonify({"error": "status is required"}), 400

        normalized = payload["status"].strip().lower()
        if normalized not in ALLOWED_SEAT_STATUSES:
            return jsonify({"error": "Invalid status.", "allowed": sorted(ALLOWED_SEAT_STATUSES)}), 400

        seat.status = normalized
        db.commit()
        return jsonify({"message": "Seat status updated successfully.", "data": _seat_response(seat)}), 200
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
