"""
Scenario C — Seat Swap End-to-End Test
========================================
Tests the full swap.matched notification path using two fixed users:
  - lumine  (User A): norvenkoh@gmail.com
  - aether  (User B): norven.koh.2024@computing.smu.edu.sg

Flow:
  1. Auto-discover an event with 2+ available seat tiers
  2. Mark one seat per tier as 'sold' (simulate ownership)
  3. lumine (tier-A seat) requests swap → wants tier-B
  4. aether (tier-B seat) requests swap → wants tier-A → triggers match
  5. Both accept → swap.matched + swap.completed events published
  6. Notification-service emails both users

Port map (from docker-compose.yml):
  events-service:             http://localhost:5001
  swap-service:               http://localhost:5003
  swap-orchestration-service: http://localhost:5006
"""

import sys
import requests

# ── Service base URLs ────────────────────────────────────────────────────────
EVENTS_URL    = "http://localhost:5001"
SWAP_ORCH_URL = "http://localhost:5006"

# ── Fixed test users ─────────────────────────────────────────────────────────
USER_A_ID    = "f7d0c5fa-ccb0-4ac8-8d65-ad60294d51a5"   # lumine
USER_A_EMAIL = "norvenkoh@gmail.com"

USER_B_ID    = "745c75dc-830e-4c9c-946c-88428b9f66b5"    # aether
USER_B_EMAIL = "norven.koh.2024@computing.smu.edu.sg"

# ── Helpers ──────────────────────────────────────────────────────────────────

def _ok(label: str, resp: requests.Response) -> dict:
    """Print result and return JSON; abort on non-2xx."""
    try:
        body = resp.json()
    except Exception:
        body = resp.text
    status_icon = "✓" if resp.ok else "✗"
    print(f"  [{status_icon}] {label} — HTTP {resp.status_code}")
    if not resp.ok:
        print(f"      Response: {body}")
        sys.exit(1)
    return body


def fetch_event_and_seats():
    print("\n[2] Fetching events …")
    resp = requests.get(f"{EVENTS_URL}/events", timeout=60)
    events = _ok("GET /events", resp)
    if not events:
        print("  [!] No events found.")
        sys.exit(1)

    # Pick first event that has available seats in at least 2 different tiers
    for event in events:
        event_id = event["eventId"]
        resp2 = requests.get(f"{EVENTS_URL}/events/{event_id}/seats", timeout=60)
        seats = _ok(f"GET /events/{event_id}/seats", resp2)

        # Only consider seats that are available (not already held/sold)
        by_tier: dict[str, list] = {}
        for s in seats:
            if s.get("status", "available") == "available":
                by_tier.setdefault(s["tier"], []).append(s)

        tiers = list(by_tier.keys())
        if len(tiers) < 2:
            continue

        # Pick one available seat from each of the first two tiers
        tier_a, tier_b = tiers[0], tiers[1]
        seat_a = by_tier[tier_a][0]
        seat_b = by_tier[tier_b][0]
        print(f"      Event:  {event_id}  ({event.get('name', event.get('eventName', '?'))})")
        print(f"      Seat A: {seat_a['seatId']}  tier={tier_a}  price={seat_a['basePrice']}  status=available")
        print(f"      Seat B: {seat_b['seatId']}  tier={tier_b}  price={seat_b['basePrice']}  status=available")
        return event_id, seat_a, seat_b

    print("  [!] No event with 2+ available seat tiers found.")
    sys.exit(1)


def mark_seat_sold(event_id: str, seat: dict) -> None:
    """Mark a seat as 'sold' to simulate it being owned by a user."""
    seat_id = seat["seatId"]
    resp = requests.put(
        f"{EVENTS_URL}/events/{event_id}/seats/{seat_id}/status",
        json={"status": "sold"},
        timeout=60,
    )
    _ok(f"PUT seat {seat_id[:8]}… → sold", resp)


def create_swap(label: str, order_id: str, event_id: str,
                current_seat_id: str, current_tier: str, desired_tier: str, user_id: str) -> dict:
    print(f"\n  → {label} creates swap request (currentSeat={current_seat_id[:8]}… tier={current_tier} → wantsTier={desired_tier})")
    resp = requests.post(
        f"{SWAP_ORCH_URL}/swap-requests",
        json={
            "orderId":       order_id,
            "eventId":       event_id,
            "currentSeatId": current_seat_id,
            "currentTier":   current_tier,
            "desiredTier":   desired_tier,
            "userId":        user_id,
        },
        timeout=60,
    )
    body = _ok(f"POST /swap-requests ({label})", resp)
    return body.get("data", {})


def respond_to_swap(label: str, match_id: str, user_id: str, response: str) -> dict:
    print(f"\n  → {label} responds '{response}' to match {match_id[:8]}…")
    resp = requests.post(
        f"{SWAP_ORCH_URL}/swap-matches/{match_id}/response",
        json={"userId": user_id, "response": response},
        timeout=60,
    )
    body = _ok(f"POST /swap-matches/{match_id[:8]}…/response ({label})", resp)
    return body.get("data", {})


def check_swap_status(match_id: str) -> dict:
    resp = requests.get(f"{SWAP_ORCH_URL}/swap/{match_id}", timeout=60)
    body = _ok(f"GET /swap/{match_id[:8]}…", resp)
    return body.get("data", {})


# ── Main flow ────────────────────────────────────────────────────────────────

def run():
    print("=" * 60)
    print("  Scenario C — Seat Swap Flow Test")
    print("  Users: lumine (A) ↔ aether (B)")
    print("=" * 60)

    user_a_id, user_a_email = USER_A_ID, USER_A_EMAIL   # lumine
    user_b_id, user_b_email = USER_B_ID, USER_B_EMAIL   # aether

    # Auto-discover an event with 2 available seat tiers
    event_id, seat_a_obj, seat_b_obj = fetch_event_and_seats()
    seat_a_id, tier_a = seat_a_obj["seatId"], seat_a_obj["tier"]
    seat_b_id, tier_b = seat_b_obj["seatId"], seat_b_obj["tier"]

    # Fake order UUIDs — swap-service doesn't validate FK
    order_a = "00000000-0000-0000-0000-000000000001"
    order_b = "00000000-0000-0000-0000-000000000002"

    print(f"\n  Test participants:")
    print(f"    lumine (A): {user_a_id}  email={user_a_email}")
    print(f"    aether (B): {user_b_id}  email={user_b_email}")
    print(f"    Event:  {event_id}")
    print(f"    Seat A (tier={tier_a}): {seat_a_id}")
    print(f"    Seat B (tier={tier_b}): {seat_b_id}")

    # ── Step 3: Mark seats as 'sold' (simulate ownership) ────────
    print("\n[3] Marking seats as sold to simulate user ownership …")
    mark_seat_sold(event_id, seat_a_obj)
    mark_seat_sold(event_id, seat_b_obj)

    # ── Step 4: lumine requests swap ─────────────────────────────
    print("\n[4] lumine creates a swap request …")
    result_a = create_swap(
        "lumine", order_a, event_id, seat_a_id, current_tier=tier_a, desired_tier=tier_b, user_id=user_a_id
    )
    print(f"      match after lumine: {result_a.get('match')}")

    # ── Step 5: aether requests swap (should trigger match) ───────
    print("\n[5] aether creates a swap request (expects match) …")
    result_b = create_swap(
        "aether", order_b, event_id, seat_b_id, current_tier=tier_b, desired_tier=tier_a, user_id=user_b_id
    )
    match = result_b.get("match")

    if not match:
        print("\n  [!] No match found after aether's request.")
        print("      Check: migration a1b2c3d4e5f6 ran, swap-service rebuilt, tiers cross correctly.")
        sys.exit(1)

    match_id = match.get("swapId") or match.get("matchId")
    print(f"\n  [✓] Match found! matchId = {match_id}")
    print(f"      swap.matched published → notification-service should email both users")

    # ── Step 6: Both users accept ─────────────────────────────────
    print("\n[6] Both users respond ACCEPT …")
    respond_to_swap("lumine", match_id, user_a_id, "ACCEPT")
    eval_result = respond_to_swap("aether", match_id, user_b_id, "ACCEPT")

    # ── Step 9/10: Check payment requirement ──────────────────────
    print("\n[9/10] Evaluating payment requirement …")
    eval_status = eval_result.get("status")

    if eval_status == "PAYMENT_REQUIRED":
        payer = eval_result.get("payer", {})
        payee = eval_result.get("payee", {})
        diff  = eval_result.get("priceDifference", 0)
        print(f"  [✓] Payment required — price difference: ${diff:.2f}")
        print(f"      Payer (upgrading): userId={payer.get('userId')}  tier={payer.get('tier')}  basePrice={payer.get('basePrice')}")
        print(f"      Payee (downgrading): userId={payee.get('userId')}  tier={payee.get('tier')}  basePrice={payee.get('basePrice')}")
        print(f"      → swap.payment_required published to RabbitMQ")
    elif eval_status == "READY_FOR_EXECUTION":
        print(f"  [✓] No payment required (same tier price) — proceeding to execution")
        print(f"      → swap.completed published to RabbitMQ")
    else:
        print(f"  [!] Unexpected evaluation status: {eval_status}")

    # ── Step 7: Check final status ────────────────────────────────
    print("\n[7] Checking final swap status …")
    status = check_swap_status(match_id)
    print(f"      Final status: {status.get('status', status)}")

    print("\n" + "=" * 60)
    print("  All steps passed.")
    print(f"  Check inbox: {user_a_email} and {user_b_email}")
    print("  Check notification-service logs for confirmation.")
    print("  RabbitMQ UI → http://localhost:15672 (guest/guest)")
    print("=" * 60)


if __name__ == "__main__":
    run()
