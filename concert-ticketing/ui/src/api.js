import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

// ── Auth / Admin / Notifications (mock only — no backend routes yet) ─────────
export {
  USER_ID,
  customerLogin,
  adminLogin,
  getMyNotifications,
  simulateSeatReassignment,
  simulateRefundIssued,
  simulateSwapMatch,
  adminGetEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  adminGetTierPrices,
  adminUpdateTierPrices,
  adminGetSectionConfigs,
  adminSetSectionConfigs,
  adminGetVisualSections,
  adminSetVisualSections,
} from "./mock/mockApi";

// ── Events ──────────────────────────────────────────────────────────────────
export async function getEvents() {
  const res = await api.get("/events");
  return res.data;
}

export async function getEvent(eventId) {
  const res = await api.get(`/events/${eventId}`);
  const event = res.data;
  // Normalise: backend stores a single `date` string; UI expects `dates: [{ dateId, times }]`
  if (event && event.date && !event.dates) {
    event.dates = [{ dateId: event.date, times: ["19:00"] }];
  }
  return event;
}

export async function getSeatmap(eventId) {
  const [seatsRes, eventRes] = await Promise.all([
    api.get(`/events/${eventId}/seats`),
    api.get(`/events/${eventId}`),
  ]);
  const event = eventRes.data;
  if (event && event.date && !event.dates) {
    event.dates = [{ dateId: event.date, times: ["19:00"] }];
  }
  // Normalise to match shape the UI expects: { seats, event, visualSections }
  // Pass null so SeatmapPage falls back to its built-in VENUE_SECTIONS constant
  return { seats: seatsRes.data, event, visualSections: null };
}

export async function validateSeat(eventId, seatId) {
  const res = await api.get(`/events/${eventId}/seats/${seatId}`);
  return res.data;
}

// ── Booking ─────────────────────────────────────────────────────────────────
export async function createBooking(payload) {
  const items = payload?.items ?? [];
  if (items.length === 0) {
    const error = new Error("Your cart is empty.");
    error.code = "EMPTY_CART";
    throw error;
  }

  // Backend only supports one seat per booking currently
  const item = items[0];
  try {
    const res = await api.post("/place-booking", {
      userId: payload.userId,
      eventId: item.eventId,
      seatId: item.seatId,
    });
    return {
      orderId: res.data.orderId,
      status: res.data.status,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? "Payment failed";
    const error = new Error(msg);
    error.code = "PAYMENT_FAILED";
    throw error;
  }
}

// ── Orders ───────────────────────────────────────────────────────────────────
export async function getMyOrders(userId) {
  const res = await api.get(`/orders/${userId}`);
  return res.data;
}

// ── Swap ─────────────────────────────────────────────────────────────────────
export async function getMySwapRequests(userId) {
  const res = await api.get(`/swap-requests?userId=${userId}`);
  return res.data;
}

export async function createSwapRequest(payload) {
  const res = await api.post("/swap-requests", {
    orderId: payload.orderId,
    eventId: payload.eventId,
    currentSeatId: payload.seatId,
    desiredTier: payload.desiredTier,
  });
  return res.data;
}

export async function cancelSwapRequest(requestId) {
  const res = await api.delete(`/swap-requests/${requestId}`);
  return res.data;
}

export async function respondToSwapRequest(swapId, response) {
  const res = await api.post(`/swap-matches/${swapId}/response`, {
    response: response.toUpperCase(), // backend expects ACCEPT / DECLINE
  });
  return res.data;
}
