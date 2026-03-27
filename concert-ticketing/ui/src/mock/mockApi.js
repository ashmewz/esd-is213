import {
  storeGetEvents,
  storeGetEvent,
  storeGetSeatmap,
  storeGetTierPrices,
  storeGetSectionConfigs,
  storeGetVisualSections,
  storeSetVisualSections,
  storeCreateEvent,
  storeUpdateEvent,
  storeDeleteEvent,
  storeUpdateTierPrices,
  storeSetSectionConfigs,
  storeCreateOrder,
  storeGetOrdersByUser,
  storeUpdateOrder,
} from "./store";

export const USER_ID = 1;

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ── Public API ─────────────────────────────────────────────────────────────
export async function getEvents() {
  await delay();
  return storeGetEvents();
}

export async function getEvent(eventId) {
  await delay();
  const event = storeGetEvent(eventId);
  if (!event) throw new Error("Event not found");
  return event;
}

export async function getSeatmap(eventId) {
  await delay();
  const data = storeGetSeatmap(eventId);
  if (!data) throw new Error("Event not found");
  // Include per-event visual sections so SeatmapPage uses live admin changes
  return { ...data, visualSections: storeGetVisualSections(eventId) };
}

export async function validateSeat(eventId, seatId) {
  await delay();
  const data = storeGetSeatmap(eventId);
  const seat = data?.seats.find((s) => s.seatId === Number(seatId));
  if (!seat || seat.status !== "available") throw new Error("Seat not available");
  return seat;
}

export async function createBooking(_eventId, _seatId) {
  await delay(800);
  return { orderId: Math.floor(Math.random() * 9000) + 1000, status: "confirmed" };
}

export async function createSwapRequest(_orderId, desiredTier) {
  await delay(600);
  return { requestId: Math.floor(Math.random() * 9000) + 1000, orderId: _orderId, desiredTier, swapStatus: "pending" };
}

export async function cancelSwapRequest(_orderId) {
  await delay(400);
  return { success: true };
}

// ── Admin API ──────────────────────────────────────────────────────────────
export async function adminLogin(username, password) {
  await delay(300);
  if (username === "admin" && password === "admin123") {
    return { userId: 0, username: "admin", role: "admin" };
  }
  throw new Error("Invalid credentials");
}

export async function adminGetEvents() {
  await delay();
  return storeGetEvents();
}

export async function adminCreateEvent(data) {
  await delay(500);
  return storeCreateEvent(data);
}

export async function adminUpdateEvent(eventId, data) {
  await delay(400);
  return storeUpdateEvent(eventId, data);
}

export async function adminDeleteEvent(eventId) {
  await delay(400);
  storeDeleteEvent(eventId);
  return { success: true };
}

export async function adminGetTierPrices(eventId) {
  await delay(200);
  return storeGetTierPrices(eventId);
}

export async function adminUpdateTierPrices(eventId, prices) {
  await delay(400);
  return storeUpdateTierPrices(eventId, prices);
}

export async function adminGetSectionConfigs(eventId) {
  await delay(200);
  return storeGetSectionConfigs(eventId);
}

export async function adminSetSectionConfigs(eventId, configs) {
  await delay(400);
  return storeSetSectionConfigs(eventId, configs);
}

export async function adminGetVisualSections(eventId) {
  await delay(200);
  return storeGetVisualSections(eventId);
}

export async function adminSetVisualSections(eventId, sections) {
  await delay(300);
  return storeSetVisualSections(eventId, sections);
}
