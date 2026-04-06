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

// ── Mock only (no backend route yet) ─────────────────────────────────────────
export {
  USER_ID,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
} from "./mock/mockApi";

// ── Notifications ─────────────────────────────────────────────────────────────
export async function getMyNotifications(userId) {
  const res = await api.get(`/notifications?userId=${userId}`);
  return Array.isArray(res.data) ? res.data : [];
}

// ── Admin events (real backend) ──────────────────────────────────────────────
export async function adminGetEvents() {
  const res = await api.get("/events");
  return Array.isArray(res.data) ? res.data : [];
}

// ── Admin login (real backend) ───────────────────────────────────────────────
export async function adminLogin(username, password) {
  try {
    const res = await api.post("/users/login", { email: username, password });
    const { token, user } = res.data;
    return {
      userId: user.user_id ?? user.id,
      username: user.username,
      email: user.email,
      role: "admin",
      token,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? err.message ?? "Invalid credentials";
    throw new Error(msg);
  }
}

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
    // res.data = { token, user: { user_id, username, email, role, ... } }
    const { token, user } = res.data;
    return {
      userId: user.user_id ?? user.id,
      username: user.username,
      email: user.email,
      role: user.role ?? "customer",
      token,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? "Invalid credentials";
    throw new Error(msg);
  }
}

// ── Admin seatmap ────────────────────────────────────────────────────────────
export async function adminGetSeats(eventId) {
  const res = await api.get(`/events/${eventId}/seats`);
  return res.data;
}

export async function adminUpdateSeatmap(eventId, removedSeatIds) {
  const res = await api.put(`/events/${eventId}/seatmap`, { removedSeatIds });
  return res.data;
}

export async function adminRestoreSeats(eventId, seatIds) {
  const res = await api.put(`/events/${eventId}/seats/restore`, { seatIds });
  return res.data;
}

// ── Events ──────────────────────────────────────────────────────────────────
export async function getEvents() {
  const res = await api.get("/events");
  return res.data;
}

function normaliseEventDates(event) {
  if (!event || event.dates) return event;
  // Prefer the ISO eventDate field so dateId is always "YYYY-MM-DD"
  const raw = event.eventDate ?? event.date ?? "";
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  const timing = event.eventTiming ?? "19:00";
  event.dates = [{ dateId: isoDate ?? raw, times: [timing] }];
  return event;
}

export async function getEvent(eventId) {
  const res = await api.get(`/events/${eventId}`);
  return normaliseEventDates(res.data);
}

export async function getSeatmap(eventId) {
  const [seatsRes, eventRes] = await Promise.all([
    api.get(`/events/${eventId}/seats`),
    api.get(`/events/${eventId}`),
  ]);
  const event = normaliseEventDates(eventRes.data);
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
  const res = await api.get(`/orders/`, { params: { userId } });
  const orders = Array.isArray(res.data) ? res.data : [];

  // Enrich each order with event + seat details from our events service
  const enriched = await Promise.all(
    orders.map(async (order) => {
      let eventName = null;
      let venueName = null;
      let eventDate = null;
      let eventTiming = null;

      try {
        const eventRes = await api.get(`/events/${order.eventId}`);
        const event = eventRes.data;
        eventName = event.name ?? null;
        venueName = event.venueName ?? null;
        eventDate = event.eventDate ?? event.date ?? null;
        eventTiming = event.eventTiming ?? null;
      } catch {
        // leave as null if event fetch fails
      }

      const items = await Promise.all(
        (order.orderItems ?? []).map(async (item) => {
          let seatLabel = null;
          let tier = item.tier ?? null;
          let sectionNo = item.sectionNo ?? null;
          let rowNo = item.rowNo ?? null;
          let seatNo = item.seatNo ?? null;
          try {
            const seatRes = await api.get(`/events/${order.eventId}/seats/${item.seatId}`);
            const seat = seatRes.data;
            tier = seat.tier ?? tier;
            sectionNo = seat.sectionNo ?? sectionNo;
            rowNo = seat.rowNo ?? rowNo;
            seatNo = seat.seatNo ?? seatNo;
            seatLabel = `${seat.tier} · Section ${seat.sectionNo} · Row ${seat.rowNo} · Seat ${seat.seatNo}`;
          } catch {
            // seat may already be sold/held, use seatId as fallback
          }
          return { ...item, seatLabel, tier, sectionNo, rowNo, seatNo };
        })
      );

      return { ...order, eventName, venueName, date: eventDate, time: eventTiming, items };
    })
  );

  return enriched;
}

// Lightweight version for SwapPage — no per-seat API calls, uses seat_assignments endpoint
export async function getMyTickets(userId) {
  const res = await api.get(`/seat-assignments?userId=${userId}`);
  const assignments = Array.isArray(res.data) ? res.data : [];

  // Group by eventId to batch event name lookups
  const eventIds = [...new Set(assignments.map((a) => a.eventId).filter(Boolean))];
  const eventMap = {};
  await Promise.all(
    eventIds.map(async (eid) => {
      try {
        const r = await api.get(`/events/${eid}`);
        eventMap[eid] = r.data;
      } catch {
        eventMap[eid] = {};
      }
    })
  );

  return assignments
    .filter((a) => a.status === "SOLD" && a.seatId && a.tier)
    .map((a) => {
      const ev = eventMap[a.eventId] || {};
      return {
        orderId: a.orderId,
        eventId: a.eventId,
        eventName: ev.name || a.eventId,
        seatId: a.seatId,
        tier: a.tier,
        seatLabel: a.seatLabel || `Section ${a.sectionNo} · Row ${a.rowNo} · Seat ${a.seatNo}`,
      };
    });
}

// ── Swap ─────────────────────────────────────────────────────────────────────
export async function getMySwapRequests(userId) {
  const res = await api.get(`/swap-requests?userId=${userId}`);
  return res.data;
}

export async function createSwapRequest(payload) {
  const res = await api.post("/swap-requests", {
    userId: payload.userId,
    orderId: payload.orderId,
    eventId: payload.eventId,
    currentSeatId: payload.seatId || payload.currentSeatId,
    currentTier: payload.currentTier,
    desiredTier: payload.desiredTier,
  });
  return res.data;
}

export async function cancelSwapRequest(requestId) {
  const res = await api.delete(`/swap-requests/${requestId}`);
  return res.data;
}

export async function getAvailableSwaps(eventId, tier, excludeUserId) {
  const params = new URLSearchParams({ eventId, tier });
  if (excludeUserId) params.append("excludeUserId", excludeUserId);
  const res = await api.get(`/swap-requests/available?${params}`);
  return res.data;
}

export async function respondToSwapRequest(swapId, userId, response, requestId) {
  const res = await api.post(`/swap-matches/${swapId}/response`, {
    swapId,
    userId,
    response: response.toUpperCase(),
    requestId,
  });
  return res.data;
}