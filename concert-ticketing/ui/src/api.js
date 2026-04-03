import axios from "axios";

// ── Toggle ──────────────────────────────────────────────────────────────────
// Set VITE_USE_MOCK=true in ui/.env to force mock mode (e.g. when backend is down)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const KONG = "http://localhost:8000";

const api = axios.create({ baseURL: KONG });

// ── Mock fallbacks (auth, notifications, admin, simulate) ───────────────────
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
  if (USE_MOCK) {
    const { getEvents: mock } = await import("./mock/mockApi");
    return mock();
  }
  const res = await api.get("/events");
  return res.data;
}

export async function getEvent(eventId) {
  if (USE_MOCK) {
    const { getEvent: mock } = await import("./mock/mockApi");
    return mock(eventId);
  }
  const res = await api.get(`/events/${eventId}`);
  return res.data;
}

export async function getSeatmap(eventId) {
  if (USE_MOCK) {
    const { getSeatmap: mock } = await import("./mock/mockApi");
    return mock(eventId);
  }
  const res = await api.get(`/events/${eventId}/seats`);
  // Normalise to match shape the UI expects: { seats: [...], visualSections: [] }
  return { seats: res.data, visualSections: [] };
}

export async function validateSeat(eventId, seatId) {
  if (USE_MOCK) {
    const { validateSeat: mock } = await import("./mock/mockApi");
    return mock(eventId, seatId);
  }
  const res = await api.get(`/events/${eventId}/seats/${seatId}`);
  return res.data;
}

// ── Booking ─────────────────────────────────────────────────────────────────
export async function createBooking(payload) {
  if (USE_MOCK) {
    const { createBooking: mock } = await import("./mock/mockApi");
    return mock(payload);
  }

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
  if (USE_MOCK) {
    const { getMyOrders: mock } = await import("./mock/mockApi");
    return mock(userId);
  }
  const res = await api.get(`/orders/${userId}`);
  return res.data;
}

// ── Swap ─────────────────────────────────────────────────────────────────────
export async function getMySwapRequests(userId) {
  if (USE_MOCK) {
    const { getMySwapRequests: mock } = await import("./mock/mockApi");
    return mock(userId);
  }
  const res = await api.get(`/swap-requests?userId=${userId}`);
  return res.data;
}

export async function createSwapRequest(payload) {
  if (USE_MOCK) {
    const { createSwapRequest: mock } = await import("./mock/mockApi");
    return mock(payload);
  }
  const res = await api.post("/swap-requests", {
    orderId: payload.orderId,
    eventId: payload.eventId,
    currentSeatId: payload.seatId,
    desiredTier: payload.desiredTier,
  });
  return res.data;
}

export async function cancelSwapRequest(requestId) {
  if (USE_MOCK) {
    const { cancelSwapRequest: mock } = await import("./mock/mockApi");
    return mock(requestId);
  }
  const res = await api.delete(`/swap-requests/${requestId}`);
  return res.data;
}

export async function respondToSwapRequest(swapId, response) {
  if (USE_MOCK) {
    const { respondToSwapRequest: mock } = await import("./mock/mockApi");
    return mock(swapId, response);
  }
  const res = await api.post(`/swap-matches/${swapId}/response`, {
    response: response.toUpperCase(), // backend expects ACCEPT / DECLINE
  });
  return res.data;
}
