// Set VITE_USE_MOCK=true in .env to use mock data (when backend is not running)
import * as mock from "./mock/mockApi";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// ── Direct service URLs (bypassing Kong as a temporary measure) ────────────
// TODO: Re-enable Kong routing once Kong is stable.
// const KONG = import.meta.env.VITE_KONG_URL || "http://localhost:8000";
// async function apiFetch(path, options = {}) {
//   const res = await fetch(`${KONG}${path}`, {
//     headers: { "Content-Type": "application/json" },
//     ...options,
//   });
//   if (!res.ok) {
//     const body = await res.json().catch(() => ({}));
//     throw Object.assign(new Error(body.error || `Request failed: ${res.status}`), { status: res.status, body });
//   }
//   return res.json();
// }

// Requests go to Vite's dev proxy (/api/*) which forwards to the real service,
// avoiding CORS since the browser only ever talks to localhost:5173.
async function fetchFrom(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `Request failed: ${res.status}`), { status: res.status, body });
  }
  return res.json();
}

const SERVICES = {
  events:  "/api",
  booking: "/api",
};

export const USER_ID = mock.USER_ID;

// ── Events & Seatmap ───────────────────────────────────────────────────────

export async function getEvents() {
  if (USE_MOCK) return mock.getEvents();
  return fetchFrom(SERVICES.events, "/events");
}

export async function getEvent(eventId) {
  if (USE_MOCK) return mock.getEvent(eventId);
  // events-service has no GET /events/{id} — fetch list and filter
  const events = await fetchFrom(SERVICES.events, "/events");
  const event = events.find((e) => String(e.eventId) === String(eventId));
  if (!event) throw new Error("Event not found");
  return event;
}

export async function getSeatmap(eventId) {
  if (USE_MOCK) return mock.getSeatmap(eventId);
  const seats = await fetchFrom(SERVICES.events, `/events/${eventId}/seats`);
  return { seats, visualSections: [] };
}

export async function validateSeat(eventId, seatId) {
  if (USE_MOCK) return mock.validateSeat(eventId, seatId);
  const seat = await fetchFrom(SERVICES.events, `/events/${eventId}/seats/${seatId}`);
  if (seat.status !== "available") throw new Error("Seat not available");
  return seat;
}

// ── Booking (Scenario A orchestration) ────────────────────────────────────

export async function createBooking(payload) {
  if (USE_MOCK) return mock.createBooking(payload);

  const items = payload?.items ?? [];
  if (items.length === 0) {
    throw Object.assign(new Error("Your cart is empty."), { code: "EMPTY_CART" });
  }

  const item = items[0];
  try {
    return await fetchFrom(SERVICES.booking, "/booking", {
      method: "POST",
      body: JSON.stringify({
        userId: payload.userId,
        eventId: item.eventId,
        seatId: item.seatId,
      }),
    });
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("payment")) err.code = "PAYMENT_FAILED";
    else if (msg.includes("seat")) err.code = "SEAT_UNAVAILABLE";
    throw err;
  }
}

// ── Orders ─────────────────────────────────────────────────────────────────
// No list-by-user endpoint exists yet — always uses mock

export async function getMyOrders(userId = USER_ID) {
  return mock.getMyOrders(userId);
}

// ── Notifications ──────────────────────────────────────────────────────────
// notification-service is RabbitMQ-only (no REST GET) — always uses mock

export async function getMyNotifications(userId = USER_ID) {
  return mock.getMyNotifications(userId);
}

export async function simulateSeatReassignment(orderId) {
  return mock.simulateSeatReassignment(orderId);
}

export async function simulateRefundIssued(orderId) {
  return mock.simulateRefundIssued(orderId);
}

// ── Auth ───────────────────────────────────────────────────────────────────
// user-service has no login endpoint yet — always uses mock

export async function customerLogin(identifier, password) {
  return mock.customerLogin(identifier, password);
}

// ── Swap (not wired to real API) ───────────────────────────────────────────

export async function getMySwapRequests(userId = USER_ID) {
  return mock.getMySwapRequests(userId);
}

export async function createSwapRequest(payload) {
  return mock.createSwapRequest(payload);
}

export async function cancelSwapRequest(requestId) {
  return mock.cancelSwapRequest(requestId);
}

export async function simulateSwapMatch(requestId) {
  return mock.simulateSwapMatch(requestId);
}

export async function respondToSwapRequest(requestId, response) {
  return mock.respondToSwapRequest(requestId, response);
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function adminLogin(username, password) {
  return mock.adminLogin(username, password);
}

export async function adminGetEvents() {
  if (USE_MOCK) return mock.adminGetEvents();
  return fetchFrom(SERVICES.events, "/events");
}

export async function adminCreateEvent(data) {
  if (USE_MOCK) return mock.adminCreateEvent(data);
  return fetchFrom(SERVICES.events, "/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adminUpdateEvent(eventId, data) {
  if (USE_MOCK) return mock.adminUpdateEvent(eventId, data);
  return fetchFrom(SERVICES.events, `/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// No DELETE /events endpoint in events-service — always uses mock
export async function adminDeleteEvent(eventId) {
  return mock.adminDeleteEvent(eventId);
}

// Tier prices / section configs / visual sections have no real endpoints yet
export async function adminGetTierPrices(eventId) {
  return mock.adminGetTierPrices(eventId);
}

export async function adminUpdateTierPrices(eventId, prices) {
  return mock.adminUpdateTierPrices(eventId, prices);
}

export async function adminGetSectionConfigs(eventId) {
  return mock.adminGetSectionConfigs(eventId);
}

export async function adminSetSectionConfigs(eventId, configs) {
  return mock.adminSetSectionConfigs(eventId, configs);
}

export async function adminGetVisualSections(eventId) {
  return mock.adminGetVisualSections(eventId);
}

export async function adminSetVisualSections(eventId, sections) {
  return mock.adminSetVisualSections(eventId, sections);
}
