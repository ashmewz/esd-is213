import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

const FALLBACK_SEAT_CONFIGS = {
  1: [
    { tier: "VIP", sectionNo: 1, rowCount: 6, seatsPerRow: 12, basePrice: 350 },
    { tier: "CAT1", sectionNo: 2, rowCount: 8, seatsPerRow: 14, basePrice: 220 },
    { tier: "CAT1", sectionNo: 3, rowCount: 8, seatsPerRow: 14, basePrice: 220 },
    { tier: "CAT2", sectionNo: 4, rowCount: 10, seatsPerRow: 16, basePrice: 148 },
    { tier: "CAT2", sectionNo: 5, rowCount: 10, seatsPerRow: 16, basePrice: 148 },
    { tier: "CAT3", sectionNo: 6, rowCount: 12, seatsPerRow: 18, basePrice: 98 },
    { tier: "CAT3", sectionNo: 7, rowCount: 12, seatsPerRow: 18, basePrice: 98 },
  ],
  2: [
    { tier: "VIP", sectionNo: 1, rowCount: 5, seatsPerRow: 10, basePrice: 288 },
    { tier: "CAT1", sectionNo: 2, rowCount: 7, seatsPerRow: 12, basePrice: 188 },
    { tier: "CAT1", sectionNo: 3, rowCount: 7, seatsPerRow: 12, basePrice: 188 },
    { tier: "CAT2", sectionNo: 4, rowCount: 8, seatsPerRow: 14, basePrice: 128 },
    { tier: "CAT2", sectionNo: 5, rowCount: 8, seatsPerRow: 14, basePrice: 128 },
    { tier: "CAT3", sectionNo: 6, rowCount: 10, seatsPerRow: 16, basePrice: 78 },
    { tier: "CAT3", sectionNo: 7, rowCount: 10, seatsPerRow: 16, basePrice: 78 },
  ],
  3: [
    { tier: "VIP", sectionNo: 1, rowCount: 4, seatsPerRow: 8, basePrice: 248 },
    { tier: "CAT1", sectionNo: 2, rowCount: 6, seatsPerRow: 10, basePrice: 168 },
    { tier: "CAT1", sectionNo: 3, rowCount: 6, seatsPerRow: 10, basePrice: 168 },
    { tier: "CAT2", sectionNo: 4, rowCount: 7, seatsPerRow: 12, basePrice: 118 },
    { tier: "CAT2", sectionNo: 5, rowCount: 7, seatsPerRow: 12, basePrice: 118 },
    { tier: "CAT3", sectionNo: 6, rowCount: 8, seatsPerRow: 14, basePrice: 68 },
    { tier: "CAT3", sectionNo: 7, rowCount: 8, seatsPerRow: 14, basePrice: 68 },
  ],
  4: [
    { tier: "VIP", sectionNo: 1, rowCount: 4, seatsPerRow: 8, basePrice: 258 },
    { tier: "CAT1", sectionNo: 2, rowCount: 6, seatsPerRow: 10, basePrice: 178 },
    { tier: "CAT1", sectionNo: 3, rowCount: 6, seatsPerRow: 10, basePrice: 178 },
    { tier: "CAT2", sectionNo: 4, rowCount: 7, seatsPerRow: 12, basePrice: 128 },
    { tier: "CAT2", sectionNo: 5, rowCount: 7, seatsPerRow: 12, basePrice: 128 },
    { tier: "CAT3", sectionNo: 6, rowCount: 8, seatsPerRow: 14, basePrice: 78 },
    { tier: "CAT3", sectionNo: 7, rowCount: 8, seatsPerRow: 14, basePrice: 78 },
  ],
  5: [
    { tier: "VIP", sectionNo: 1, rowCount: 5, seatsPerRow: 10, basePrice: 298 },
    { tier: "CAT1", sectionNo: 2, rowCount: 7, seatsPerRow: 12, basePrice: 198 },
    { tier: "CAT1", sectionNo: 3, rowCount: 7, seatsPerRow: 12, basePrice: 198 },
    { tier: "CAT2", sectionNo: 4, rowCount: 8, seatsPerRow: 14, basePrice: 138 },
    { tier: "CAT2", sectionNo: 5, rowCount: 8, seatsPerRow: 14, basePrice: 138 },
    { tier: "CAT3", sectionNo: 6, rowCount: 9, seatsPerRow: 16, basePrice: 88 },
    { tier: "CAT3", sectionNo: 7, rowCount: 9, seatsPerRow: 16, basePrice: 88 },
  ],
  6: [
    { tier: "VIP", sectionNo: 1, rowCount: 4, seatsPerRow: 10, basePrice: 238 },
    { tier: "CAT1", sectionNo: 2, rowCount: 6, seatsPerRow: 12, basePrice: 158 },
    { tier: "CAT1", sectionNo: 3, rowCount: 6, seatsPerRow: 12, basePrice: 158 },
    { tier: "CAT2", sectionNo: 4, rowCount: 7, seatsPerRow: 14, basePrice: 108 },
    { tier: "CAT2", sectionNo: 5, rowCount: 7, seatsPerRow: 14, basePrice: 108 },
    { tier: "CAT3", sectionNo: 6, rowCount: 8, seatsPerRow: 16, basePrice: 68 },
    { tier: "CAT3", sectionNo: 7, rowCount: 8, seatsPerRow: 16, basePrice: 68 },
  ],
};

function generateFallbackSeats(eventId, seatmapTemplateId) {
  const config = FALLBACK_SEAT_CONFIGS[seatmapTemplateId] ?? FALLBACK_SEAT_CONFIGS[2];
  const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const seats = [];

  config.forEach(({ tier, sectionNo, rowCount, seatsPerRow, basePrice }) => {
    rowLabels.slice(0, Math.min(rowCount, 26)).forEach((rowLabel) => {
      for (let seatNo = 1; seatNo <= seatsPerRow; seatNo += 1) {
        seats.push({
          seatId: `${eventId}-${tier}-${sectionNo}-${rowLabel}-${seatNo}`,
          eventId,
          tier,
          sectionNo,
          rowNo: rowLabel,
          seatNo,
          basePrice,
          status: "available",
        });
      }
    });
  });

  return seats;
}

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
  getMyNotifications,
  simulateSeatReassignment,
  simulateRefundIssued,
  simulateSwapMatch,
  adminGetSectionConfigs,
  adminSetSectionConfigs,
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
      role: user.role ?? "customer",
      token,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? "Invalid credentials";
    throw new Error(msg);
  }
}

export async function adminLogin(username, password) {
  try {
    const res = await api.post("/admin/login", { username, password });
    const { token, user } = res.data;
    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role ?? "admin",
      token,
    };
  } catch (err) {
    const msg = err.response?.data?.error ?? "Invalid admin credentials";
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
  const [seatsRes, eventRes, visualSectionsRes] = await Promise.all([
    api.get(`/events/${eventId}/seats`),
    api.get(`/events/${eventId}`),
    api.get(`/events/${eventId}/visual-sections`).catch((err) => {
      if (err.response?.status === 404) {
        return { data: [] };
      }
      throw err;
    }),
  ]);
  const event = eventRes.data;
  if (event && event.date && !event.dates) {
    event.dates = [{ dateId: event.date, times: ["19:00"] }];
  }
  const visualSections = (visualSectionsRes.data ?? []).map((section) => ({
    id: section.sectionCode,
    label: section.label,
    dataSection: section.dataSection,
    x: section.x,
    y: section.y,
    w: section.w,
    h: section.h,
    multiline: section.multiline,
    hidden: section.hidden,
    ...(section.shape ? { shape: section.shape } : {}),
    ...(section.pts   ? { pts: section.pts }     : {}),
  }));
  const seats = Array.isArray(seatsRes.data) && seatsRes.data.length > 0
    ? seatsRes.data
    : generateFallbackSeats(eventId, Number(event?.seatmap) || 2);

  return { seats, event, visualSections };
}

export async function validateSeat(eventId, seatId) {
  const res = await api.get(`/events/${eventId}/seats/${seatId}`);
  return res.data;
}

export async function createSeatHold(eventId, seatId, ttlSeconds = 15 * 60) {
  const orderId = Date.now() + Math.floor(Math.random() * 1000);
  const res = await api.post("/holds", {
    orderId,
    eventId,
    seatId,
    ttlSeconds,
  });
  return res.data?.data ?? res.data;
}

export async function cancelSeatHold(holdId) {
  if (!holdId) return null;
  const res = await api.delete(`/holds/${holdId}`);
  return res.data?.data ?? res.data;
}

export async function updateSeatStatus(eventId, seatId, status) {
  const res = await api.put(`/events/${eventId}/seats/${seatId}/status`, { status });
  return res.data?.data ?? res.data;
}

export async function adminGetEvents() {
  const res = await api.get("/events", { params: { includeDeleted: true, includeFinished: true } });
  return res.data;
}

export async function adminCreateEvent(payload) {
  const res = await api.post("/events", payload);
  return res.data;
}

export async function adminUpdateEvent(eventId, payload) {
  const res = await api.put(`/events/${eventId}`, payload);
  return res.data;
}

export async function adminDeleteEvent(eventId) {
  const res = await api.delete(`/events/${eventId}`);
  return res.data;
}

export async function adminGetTierPrices(eventId) {
  const res = await api.get(`/events/${eventId}/tier-prices`);
  return res.data;
}

export async function adminUpdateTierPrices(eventId, prices) {
  const res = await api.put(`/events/${eventId}/tier-prices`, prices);
  return res.data;
}

function mapVisualSection(section) {
  return {
    id: section.sectionCode,
    label: section.label,
    dataSection: section.dataSection,
    x: section.x,
    y: section.y,
    w: section.w,
    h: section.h,
    multiline: section.multiline,
    hidden: section.hidden,
    ...(section.shape ? { shape: section.shape } : {}),
    ...(section.pts   ? { pts: section.pts }     : {}),
  };
}

export async function adminGetVisualSections(eventId) {
  const res = await api.get(`/events/${eventId}/visual-sections`);
  return (res.data ?? []).map(mapVisualSection);
}

export async function adminSetVisualSections(eventId, sections) {
  const payload = sections.map((section) => ({
    sectionCode: section.id,
    label: section.label,
    dataSection: section.dataSection,
    tier: section.tier ?? null,
    x: section.x ?? null,
    y: section.y ?? null,
    w: section.w ?? null,
    h: section.h ?? null,
    multiline: section.multiline ?? false,
    hidden: section.hidden ?? false,
    shape: section.shape ?? null,
    pts: section.pts ?? null,
  }));
  const res = await api.put(`/events/${eventId}/visual-sections`, payload);
  return (res.data ?? []).map(mapVisualSection);
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
    await Promise.all(
      items.map(({ holdId }) =>
        cancelSeatHold(holdId).catch(() => null)
      )
    );

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
