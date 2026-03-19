# TEMPORARY DATA FILE - remove when database is connected
events = [
    {
        "eventId": 1,
        "venueId": 1,
        "name": "Taylor Swift: Eras Tour",
        "date": "2025-06-15",
        "seatmap": 1,
        "status": "ACTIVE"
    },
    {
        "eventId": 2,
        "venueId": 2,
        "name": "Coldplay: Music of the Spheres",
        "date": "2025-07-20",
        "seatmap": 2,
        "status": "ACTIVE"
    },
    {
        "eventId": 3,
        "venueId": 1,
        "name": "Bruno Mars: 24K Magic Tour",
        "date": "2025-08-05",
        "seatmap": 1,
        "status": "ACTIVE"
    },
    {
        "eventId": 4,
        "venueId": 3,
        "name": "Ed Sheeran: Mathematics Tour",
        "date": "2025-05-10",
        "seatmap": 3,
        "status": "CANCELLED"
    },
]

# Seats are generated per event based on its seatmap.
# Seatmap 1: 3 tiers (VIP, CAT1, CAT2), 2 sections (A, B), 2 rows, 3 seats/row
# Seatmap 2: 2 tiers (CAT1, CAT2), 1 section (A), 3 rows, 4 seats/row
# Seatmap 3: 2 tiers (VIP, CAT1), 1 section (A), 2 rows, 2 seats/row

SEATMAP_TEMPLATES = {
    1: [
        {"tier": "VIP",  "sections": ["A"],      "rows": 2, "seatsPerRow": 3, "basePrice": 350.00},
        {"tier": "CAT1", "sections": ["A", "B"], "rows": 2, "seatsPerRow": 3, "basePrice": 200.00},
        {"tier": "CAT2", "sections": ["A", "B"], "rows": 2, "seatsPerRow": 3, "basePrice": 100.00},
    ],
    2: [
        {"tier": "CAT1", "sections": ["A"],      "rows": 3, "seatsPerRow": 4, "basePrice": 180.00},
        {"tier": "CAT2", "sections": ["A"],      "rows": 3, "seatsPerRow": 4, "basePrice": 90.00},
    ],
    3: [
        {"tier": "VIP",  "sections": ["A"],      "rows": 2, "seatsPerRow": 2, "basePrice": 400.00},
        {"tier": "CAT1", "sections": ["A"],      "rows": 2, "seatsPerRow": 2, "basePrice": 220.00},
    ],
}

def generate_seats(events):
    seats = []
    seat_id = 1
    for event in events:
        template = SEATMAP_TEMPLATES.get(event["seatmap"], [])
        for tier_config in template:
            for section in tier_config["sections"]:
                for row in range(1, tier_config["rows"] + 1):
                    for seat_no in range(1, tier_config["seatsPerRow"] + 1):
                        seats.append({
                            "seatId": seat_id,
                            "eventId": event["eventId"],
                            "tier": tier_config["tier"],
                            "sectionNo": section,
                            "rowNo": row,
                            "seatNo": seat_no,
                            "basePrice": tier_config["basePrice"],
                            "status": "AVAILABLE"
                        })
                        seat_id += 1
    return seats

seats = generate_seats(events)
