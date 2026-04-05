import uuid


VENUE_TEMPLATES = [
    {
        "venueId": "b0000001-0000-4000-8000-000000000001",
        "venueName": "Singapore National Stadium",
        "seatmapTemplateId": 1,
    },
    {
        "venueId": "b0000002-0000-4000-8000-000000000001",
        "venueName": "Singapore Indoor Stadium",
        "seatmapTemplateId": 2,
    },
    {
        "venueId": "b0000003-0000-4000-8000-000000000001",
        "venueName": "Mediacorp Theatre",
        "seatmapTemplateId": 3,
    },
    {
        "venueId": "b0000004-0000-4000-8000-000000000001",
        "venueName": "Capitol Theatre",
        "seatmapTemplateId": 4,
    },
    {
        "venueId": "b0000005-0000-4000-8000-000000000001",
        "venueName": "The Star Theatre",
        "seatmapTemplateId": 5,
    },
    {
        "venueId": "b0000006-0000-4000-8000-000000000001",
        "venueName": "Arena @ EXPO (Hall 7)",
        "seatmapTemplateId": 6,
    },
]


VENUE_BY_ID = {
    venue["venueId"]: venue for venue in VENUE_TEMPLATES
}

VENUE_BY_NAME = {
    venue["venueName"].strip().casefold(): venue for venue in VENUE_TEMPLATES
}


def get_venue_template(*, venue_id=None, venue_name=None):
    if venue_id:
        return VENUE_BY_ID.get(str(venue_id).strip())
    if venue_name:
        return VENUE_BY_NAME.get(str(venue_name).strip().casefold())
    return None


def resolve_event_venue(payload: dict) -> dict:
    venue = get_venue_template(
        venue_id=payload.get("venueId"),
        venue_name=payload.get("venueName"),
    )
    if venue is None:
        raise ValueError("A supported venue is required.")

    return {
        "venue_id": uuid.UUID(venue["venueId"]),
        "venue_name": venue["venueName"],
        "seatmap_template_id": venue["seatmapTemplateId"],
    }
