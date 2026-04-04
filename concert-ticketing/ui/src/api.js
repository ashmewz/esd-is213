import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("stagepass_user");
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

// ── Auth / Admin / Notifications (mock only — no backend routes yet) ─────────
export {
  USER_ID,
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

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function registerUser(username, email, password) {
  try {
    const res = await api.post("/users", { username, email, password });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.error ?? "Registration failed";
    throw new Error(msg);
  }
}

export async function loginUser(email, password) {
  try {
    const res = await api.post("/users/login", { email, password });
    // res.data = { token, user: { user_id, username, email, ... } }
    const { token, user } = res.data;
    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: "customer",
      token,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? "Invalid credentials";
    throw new Error(msg);
  }
}

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
    const cardNumber = payload.payment?.cardNumber?.replace(/\s+/g, "") ?? "";
    const cardLast4 = cardNumber.slice(-4);
    const res = await api.post("/place-booking", {
      userId: payload.userId,
      eventId: item.eventId,
      seatId: item.seatId,
      cardLast4,
    });
    return {
      orderId: res.data.orderId,
      status: res.data.status,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? "Payment failed";
    const error = new Error(msg);
    const lower = msg.toLowerCase();
    if (lower.includes("unavailable seat") || lower.includes("invalid or unavailable")) {
      error.code = "SEAT_UNAVAILABLE";
    } else if (lower.includes("payment failed")) {
      error.code = "PAYMENT_FAILED";
    } else if (lower.includes("hold expired")) {
      error.code = "HOLD_EXPIRED";
    } else if (lower.includes("refund")) {
      error.code = "REFUND_REQUIRED";
    } else {
      error.code = "UNKNOWN_ERROR";
    }
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
