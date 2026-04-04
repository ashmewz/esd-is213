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

// ── Auth / Admin / Notifications (mock only) ────────────────────────────────
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

// ── Auth ───────────────────────────────────────────────────────────────────
export async function registerUser(username, email, password) {
  try {
    const res = await api.post("/users", { username, email, password });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error ?? "Registration failed");
  }
}

export async function loginUser(email, password) {
  try {
    const res = await api.post("/users/login", { email, password });
    const { token, user } = res.data;
    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: "customer",
      token,
    };
  } catch (err) {
    throw new Error(err.response?.data?.error ?? "Invalid credentials");
  }
}

// ── Events ─────────────────────────────────────────────────────────────────
export async function getEvents() {
  const res = await api.get("/events");
  return res.data;
}

export async function getEvent(eventId) {
  const res = await api.get(`/events/${eventId}`);
  const event = res.data;

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

  return { seats: seatsRes.data, event, visualSections: null };
}

export async function validateSeat(eventId, seatId) {
  const res = await api.get(`/events/${eventId}/seats/${seatId}`);
  return res.data;
}

// ── Booking ────────────────────────────────────────────────────────────────
export async function createBooking(payload) {
  const items = payload?.items ?? [];
  if (items.length === 0) {
    const error = new Error("Your cart is empty.");
    error.code = "EMPTY_CART";
    throw error;
  }

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

// ── Orders ─────────────────────────────────────────────────────────────────
export async function getMyOrders(userId) {
  const res = await api.get(`/orders/${userId}`);
  return res.data;
}

// ── Swap (ORCHESTRATION SERVICE) ───────────────────────────────────────────

// Get user's swap requests
export async function getMySwapRequests(userId) {
  const res = await api.get(`/swap-requests?userId=${userId}`);
  return res.data;
}

// Create swap request (Step C2)
export async function createSwapRequest(payload) {
  const res = await api.post("/swap-requests", {
    orderId: payload.orderId,
    eventId: payload.eventId,
    currentSeatId: payload.seatId,
    desiredTier: payload.desiredTier,
    currentTier: payload.currentTier, // important for matching
  });
  return res.data;
}

// Cancel swap request
export async function cancelSwapRequest(requestId) {
  const res = await api.delete(`/swap-requests/${requestId}`);
  return res.data;
}

// Respond to swap (ACCEPT / DECLINE) — FIXED (needs userId)
export async function respondToSwapRequest(swapId, userId, response) {
  const res = await api.post(`/swap-matches/${swapId}/response`, {
    userId,
    response: response.toUpperCase(),
  });
  return res.data;
}

// Get swap status
export async function getSwapStatus(swapId) {
  const res = await api.get(`/swap-matches/${swapId}`);
  return res.data;
}

// ── Seat Allocation (HOLDS + EXECUTION) ───────────────────────────────────

// Create hold (Step C20)
export async function createHold(orderId, eventId, seatId, ttlSeconds) {
  const res = await api.post("/holds", {
    orderId,
    eventId,
    seatId,
    ttlSeconds,
  });
  return res.data;
}

// Cancel hold (compensation)
export async function cancelHold(holdId) {
  const res = await api.delete(`/holds/${holdId}`);
  return res.data;
}

// Confirm hold (Step C22)
export async function confirmHold(holdId, transactionId) {
  const res = await api.post(`/holds/${holdId}/confirm`, {
    transactionId,
  });
  return res.data;
}

// Execute swap (Step C23 → C24)
export async function executeSwap(matchId, orderA, orderB, seatA, seatB) {
  const res = await api.post(`/swaps/${matchId}/execute`, {
    orderA,
    orderB,
    seatA,
    seatB,
  });
  return res.data;
}