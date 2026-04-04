# TEMPORARY DATA FILE — replace when database is connected
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
        "status": "ACTIVE",
        "venueName": "Singapore National Stadium",
        "imageUrl": "/taylor.jpg",
    },
    {
        "eventId": EVENT_E2,
        "venueId": VENUE_V2,
        "name": "Coldplay: Music of the Spheres",
        "date": "2025-07-20",
        "seatmap": 2,
        "status": "ACTIVE",
        "venueName": "Singapore Indoor Stadium",
        "imageUrl": "/coldplay.jpg",
    },
]

# Seatmap 1 (Taylor Swift): VIP + CAT1 + CAT2 + CAT3
# Seatmap 2 (Coldplay):     CAT1 + CAT2 + CAT3
SEATMAP_TEMPLATES = {
    1: [
        {"tier": "VIP",  "sections": [1], "rows": 2, "seatsPerRow": 3, "basePrice": 350.00},
        {"tier": "CAT1", "sections": [2], "rows": 2, "seatsPerRow": 3, "basePrice": 200.00},
        {"tier": "CAT2", "sections": [4], "rows": 2, "seatsPerRow": 4, "basePrice": 128.00},
        {"tier": "CAT3", "sections": [6], "rows": 2, "seatsPerRow": 5, "basePrice": 68.00},
    ],
    2: [
        {"tier": "CAT1", "sections": [2], "rows": 2, "seatsPerRow": 4, "basePrice": 180.00},
        {"tier": "CAT2", "sections": [4], "rows": 2, "seatsPerRow": 4, "basePrice": 90.00},
        {"tier": "CAT3", "sections": [6], "rows": 2, "seatsPerRow": 5, "basePrice": 55.00},
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
