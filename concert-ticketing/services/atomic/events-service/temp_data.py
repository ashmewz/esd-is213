# TEMPORARY DATA FILE — replace when database is connected
import copy
import uuid

# Deterministic seat IDs so the dataset is stable across process restarts.
_SEAT_ID_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _seat_id(event_id: str, tier: str, section: str, row: int, seat_no: int) -> str:
    key = f"{event_id}|{tier}|{section}|{row}|{seat_no}"
    return str(uuid.uuid5(_SEAT_ID_NS, key))


# Small stable dataset for integration tests
EVENT_E1 = "a0000001-0000-4000-8000-000000000001"
EVENT_E2 = "a0000002-0000-4000-8000-000000000001"
VENUE_V1 = "b0000001-0000-4000-8000-000000000001"
VENUE_V2 = "b0000002-0000-4000-8000-000000000001"


events = [
    {
        "eventId": EVENT_E1,
        "venueId": VENUE_V1,
        "name": "Taylor Swift: Eras Tour",
        "date": "2025-06-15",
        "seatmap": 1,
        "seatmapVersion": 1,
        "status": "ACTIVE",
    },
    {
        "eventId": EVENT_E2,
        "venueId": VENUE_V2,
        "name": "Coldplay: Music of the Spheres",
        "date": "2025-07-20",
        "seatmap": 2,
        "seatmapVersion": 1,
        "status": "ACTIVE",
    },
]

# Seatmap 1: VIP + CAT1 in section A; compact for testing
# Seatmap 2: CAT1 + CAT2 in section A
SEATMAP_TEMPLATES = {
    1: [
        {"tier": "VIP", "sections": ["A"], "rows": 2, "seatsPerRow": 3, "basePrice": 350.00},
        {"tier": "CAT1", "sections": ["A"], "rows": 2, "seatsPerRow": 3, "basePrice": 200.00},
    ],
    2: [
        {"tier": "CAT1", "sections": ["A"], "rows": 2, "seatsPerRow": 4, "basePrice": 180.00},
        {"tier": "CAT2", "sections": ["A"], "rows": 2, "seatsPerRow": 4, "basePrice": 90.00},
    ],
}


def _seat_label(section: str, row: int, seat_no: int) -> str:
    return f"{section}-{row}-{seat_no}"


def generate_seats(event_list):
    out = []
    for event in event_list:
        eid = event["eventId"]
        template = SEATMAP_TEMPLATES.get(event["seatmap"], [])
        for tier_config in template:
            for section in tier_config["sections"]:
                for row in range(1, tier_config["rows"] + 1):
                    for seat_no in range(1, tier_config["seatsPerRow"] + 1):
                        out.append(
                            {
                                "seatId": _seat_id(
                                    eid, tier_config["tier"], section, row, seat_no
                                ),
                                "eventId": eid,
                                "seatLabel": _seat_label(section, row, seat_no),
                                "tier": tier_config["tier"],
                                "sectionNo": section,
                                "rowNo": row,
                                "seatNo": seat_no,
                                "basePrice": tier_config["basePrice"],
                                "status": "AVAILABLE",
                            }
                        )
    return out


seats = generate_seats(events)


def event_by_id(event_id: str):
    for e in events:
        if e["eventId"] == event_id:
            return e
    return None


def _find_seat_index_in(pool: list, event_id: str, seat_key: str):
    """Match admin seat key against canonical seatId (UUID) or human seatLabel."""
    for i, s in enumerate(pool):
        if s["eventId"] != event_id:
            continue
        if s["seatId"] == seat_key or s["seatLabel"] == seat_key:
            return i
    return None


def _apply_seatmap_changes_to_pool(pool: list, event_id: str, changes: list) -> None:
    """Mutate `pool` in place. Raises ValueError with a short message on invalid input."""
    if not isinstance(changes, list):
        raise ValueError("changes must be an array")

    allowed = frozenset({"REMOVE", "REMAP"})
    for ch in changes:
        if not isinstance(ch, dict):
            raise ValueError("each change must be an object")
        seat_key = ch.get("seatId")
        action = ch.get("action")
        if not seat_key or not isinstance(seat_key, str):
            raise ValueError("each change requires a string seatId")
        if action not in allowed:
            raise ValueError("each change requires action REMOVE or REMAP")
        if action == "REMAP":
            new_sid = ch.get("newSeatId")
            if not new_sid or not isinstance(new_sid, str):
                raise ValueError("REMAP changes require a string newSeatId")

        idx = _find_seat_index_in(pool, event_id, seat_key)
        if idx is None:
            raise ValueError(f"seat not found for this event: {seat_key}")

        if action == "REMOVE":
            pool.pop(idx)
        else:
            new_sid = ch["newSeatId"]
            for j, s in enumerate(pool):
                if j != idx and s["eventId"] == event_id and s["seatLabel"] == new_sid:
                    raise ValueError(f"newSeatId already in use: {new_sid}")
            pool[idx]["seatLabel"] = new_sid


def compute_seats_after_seatmap_changes(event_id: str, changes: list) -> list:
    """Return a new seat list after applying changes (does not mutate global `seats`)."""
    pool = copy.deepcopy(seats)
    _apply_seatmap_changes_to_pool(pool, event_id, changes)
    return pool
