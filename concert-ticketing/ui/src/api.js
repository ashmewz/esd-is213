import { DEFAULT_SEAT_CONFIG, generateSeatsFromConfig } from "./mock/data";
import { DEFAULT_VENUE_SECTIONS } from "./mock/venueData";
import { getSeatmap as getMockSeatmap } from "./mock/mockApi";

export { USER_ID } from "./mock/mockApi";
export {
  holdSeat,
  releaseHold,
  validateSeat,
  customerLogin,
  createBooking,
  getMyOrders,
  getMyNotifications,
  simulateSeatReassignment,
  simulateRefundIssued,
  getMySwapRequests,
  createSwapRequest,
  cancelSwapRequest,
  simulateSwapMatch,
  respondToSwapRequest,
  // Admin (non-event)
  adminLogin,
  adminGetTierPrices,
  adminUpdateTierPrices,
  adminGetSectionConfigs,
  adminSetSectionConfigs,
  adminGetVisualSections,
  adminSetVisualSections,
} from "./mock/mockApi";

// ── Real API ──────────────────────────────────────────────────────────────────
const EVENTS_API = import.meta.env.VITE_EVENTS_API_URL;

// Normalise real API event shape → UI shape
function normaliseEvent(e) {
  return {
    eventId:   e.eventId,
    name:      e.name,
    venueName: e.venueName ?? e.venueId ?? "",
    date:      e.date ?? e.eventDate ?? "",
    status:    (e.status ?? "").toLowerCase(),
    minPrice:  e.minPrice ?? null,
    imageUrl:  e.imageUrl ?? null,
    dates:     e.dates ?? [],
  };
}

export async function getEvent(eventId) {
  const res = await fetch(`${EVENTS_API}/events/${eventId}`);
  if (!res.ok) throw new Error("Event not found");
  return normaliseEvent(await res.json());
}

export async function getEvents() {
  const res = await fetch(`${EVENTS_API}/events`);
  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json();
  return data.map(normaliseEvent);
}

// getSeatmap fetches the real event then generates mock seats (until seat-service is wired)
export async function getSeatmap(eventId) {
  try {
    const event = await getEvent(eventId);
    // Use a stable numeric seed from the UUID for mock seat generation
    const seed = parseInt(event.eventId.replace(/-/g, "").slice(0, 8), 16) % 3 + 1;
    const seats = generateSeatsFromConfig(seed, DEFAULT_SEAT_CONFIG);
    return {
      event,
      seats,
      visualSections: DEFAULT_VENUE_SECTIONS.map((s) => ({ ...s, hidden: false })),
    };
  } catch {
    return getMockSeatmap(eventId);
  }
}

export async function adminGetEvents() {
  const res = await fetch(`${EVENTS_API}/events`);
  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json();
  return data.map(normaliseEvent);
}

export async function adminCreateEvent(data) {
  const res = await fetch(`${EVENTS_API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name:      data.name,
      eventDate: data.dates?.[0]?.dateId ?? data.date ?? new Date().toISOString(),
      status:    (data.status ?? "active").toUpperCase(),
      venueName: data.venueName,
      imageUrl:  data.imageUrl,
      dates:     data.dates,
    }),
  });
  if (!res.ok) throw new Error("Failed to create event");
  return normaliseEvent(await res.json());
}

export async function adminUpdateEvent(eventId, data) {
  const res = await fetch(`${EVENTS_API}/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name:      data.name,
      eventDate: data.dates?.[0]?.dateId ?? data.date,
      status:    (data.status ?? "active").toUpperCase(),
      venueName: data.venueName,
      imageUrl:  data.imageUrl,
      dates:     data.dates,
    }),
  });
  if (!res.ok) throw new Error("Failed to update event");
  return normaliseEvent(await res.json());
}

export async function adminDeleteEvent(eventId) {
  const res = await fetch(`${EVENTS_API}/events/${eventId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete event");
  return { success: true };
}
