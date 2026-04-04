import { DEFAULT_SEAT_CONFIG, generateSeatsFromConfig } from "./mock/data";
import { DEFAULT_VENUE_SECTIONS } from "./mock/venueData";
import {
  USER_ID,
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
  adminLogin,
  adminGetTierPrices,
  adminUpdateTierPrices,
  adminGetSectionConfigs,
  adminSetSectionConfigs,
  adminGetVisualSections,
  adminSetVisualSections,
  getSeatmap as getMockSeatmap,
} from "./mock/mockApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const EVENTS_API = import.meta.env.VITE_EVENTS_API_URL ?? API_BASE;
const USERS_API = import.meta.env.VITE_USERS_API_URL ?? API_BASE;

function normaliseEvent(e) {
  return {
    eventId: e.eventId,
    name: e.name,
    venueName: e.venueName ?? e.venueId ?? "",
    date: e.date ?? e.eventDate ?? "",
    status: (e.status ?? "").toLowerCase(),
    minPrice: e.minPrice ?? null,
    imageUrl: e.imageUrl ?? null,
    dates: e.dates ?? [],
  };
}

async function parseJson(res, fallbackMessage) {
  if (!res.ok) {
    let message = fallbackMessage;
    try {
      const body = await res.json();
      message = body?.error ?? body?.message ?? fallbackMessage;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }
  return res.json();
}

export { USER_ID };
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
  adminLogin,
  adminGetTierPrices,
  adminUpdateTierPrices,
  adminGetSectionConfigs,
  adminSetSectionConfigs,
  adminGetVisualSections,
  adminSetVisualSections,
};

export async function registerUser(username, email, password) {
  const res = await fetch(`${USERS_API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return parseJson(res, "Registration failed");
}

export async function loginUser(email, password) {
  const res = await fetch(`${USERS_API}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(res, "Invalid credentials");
  const { token, user } = data;
  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    role: "customer",
    token,
  };
}

export async function getEvent(eventId) {
  const res = await fetch(`${EVENTS_API}/events/${eventId}`);
  return normaliseEvent(await parseJson(res, "Event not found"));
}

export async function getEvents() {
  const res = await fetch(`${EVENTS_API}/events`);
  const data = await parseJson(res, "Failed to fetch events");
  return data.map(normaliseEvent);
}

export async function getSeatmap(eventId) {
  try {
    const event = await getEvent(eventId);
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
  const data = await parseJson(res, "Failed to fetch events");
  return data.map(normaliseEvent);
}

export async function adminCreateEvent(data) {
  const res = await fetch(`${EVENTS_API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      eventDate: data.dates?.[0]?.dateId ?? data.date ?? new Date().toISOString(),
      status: (data.status ?? "active").toUpperCase(),
      venueName: data.venueName,
      imageUrl: data.imageUrl,
      dates: data.dates,
    }),
  });
  return normaliseEvent(await parseJson(res, "Failed to create event"));
}

export async function adminUpdateEvent(eventId, data) {
  const res = await fetch(`${EVENTS_API}/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      eventDate: data.dates?.[0]?.dateId ?? data.date,
      status: (data.status ?? "active").toUpperCase(),
      venueName: data.venueName,
      imageUrl: data.imageUrl,
      dates: data.dates,
    }),
  });
  return normaliseEvent(await parseJson(res, "Failed to update event"));
}

export async function adminDeleteEvent(eventId) {
  const res = await fetch(`${EVENTS_API}/events/${eventId}`, { method: "DELETE" });
  await parseJson(res, "Failed to delete event");
  return { success: true };
}
