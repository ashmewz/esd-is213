import { EVENTS, SEATMAPS } from "./data";

export const USER_ID = 1;

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function getEvents() {
  await delay();
  return EVENTS;
}

export async function getEvent(eventId) {
  await delay();
  const event = EVENTS.find((e) => e.eventId === Number(eventId));
  if (!event) throw new Error("Event not found");
  return event;
}

export async function getSeatmap(eventId) {
  await delay();
  const data = SEATMAPS[Number(eventId)];
  if (!data) throw new Error("Event not found");
  return data;
}

export async function validateSeat(eventId, seatId) {
  await delay();
  const data = SEATMAPS[Number(eventId)];
  const seat = data?.seats.find((s) => s.seatId === Number(seatId));
  if (!seat || seat.status !== "available") throw new Error("Seat not available");
  return seat;
}

export async function createBooking(eventId, seatId) {
  await delay(800);
  return { orderId: Math.floor(Math.random() * 9000) + 1000, status: "confirmed" };
}

export async function createSwapRequest(orderId, desiredTier) {
  await delay(600);
  return { requestId: Math.floor(Math.random() * 9000) + 1000, orderId, desiredTier, swapStatus: "pending" };
}

export async function cancelSwapRequest(orderId) {
  await delay(400);
  return { success: true };
}
