const KONG = "http://localhost:8000";
const USER_ID = 1; // hardcoded test user

export { USER_ID };

export async function getEvents() {
  const res = await fetch(`${KONG}/events`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function getSeatmap(eventId) {
  const res = await fetch(`${KONG}/events/${eventId}`);
  if (!res.ok) throw new Error("Failed to fetch seatmap");
  return res.json();
}

export async function validateSeat(eventId, seatId) {
  const res = await fetch(`${KONG}/events/${eventId}/${seatId}`);
  if (!res.ok) throw new Error("Seat not available");
  return res.json();
}

export async function createBooking(eventId, seatId) {
  const res = await fetch(`${KONG}/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, eventId, seatId }),
  });
  if (!res.ok) throw new Error("Booking failed");
  return res.json();
}

export async function createSwapRequest(orderId, desiredTier) {
  const res = await fetch(`${KONG}/swap/${orderId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ desiredTier }),
  });
  if (!res.ok) throw new Error("Swap request failed");
  return res.json();
}

export async function cancelSwapRequest(orderId) {
  const res = await fetch(`${KONG}/swap/${orderId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Cancel swap failed");
  return res.json();
}
