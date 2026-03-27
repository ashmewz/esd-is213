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
  storeCreateSwapRequest,
  storeGetSwapRequestsByUser,
  storeCancelSwapRequest,
  storeUpdateSwapRequest,
} from "./store";

export const USER_ID = 1;
const CUSTOMER_ACCOUNT_KEY = "stagepass_customer_account";
const DEFAULT_CUSTOMER_ACCOUNT = {
  userId: 1,
  username: "jia7832",
  name: "Jia",
  email: "user@stagepass.com",
  phone: "+65 9123 4567",
  password: "user123",
  role: "customer",
  profileImage: "",
};

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

function loadCustomerAccount() {
  if (typeof window === "undefined") return DEFAULT_CUSTOMER_ACCOUNT;
  try {
    const raw = localStorage.getItem(CUSTOMER_ACCOUNT_KEY);
    if (!raw) return DEFAULT_CUSTOMER_ACCOUNT;
    return { ...DEFAULT_CUSTOMER_ACCOUNT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CUSTOMER_ACCOUNT;
  }
}

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

export async function customerLogin(email, password) {
  await delay(300);
  const account = loadCustomerAccount();
  if (email === account.email && password === account.password) {
    return { ...account };
  }
  throw new Error("Invalid customer credentials");
}

export async function createBooking(payload) {
  await delay(800);
  const items = payload?.items ?? [];
  if (items.length === 0) {
    const error = new Error("Your cart is empty.");
    error.code = "EMPTY_CART";
    throw error;
  }

  const normalizedCard = String(payload?.payment?.cardNumber ?? "").replace(/\s+/g, "");
  const failureSuffix = normalizedCard.slice(-4);
  if (failureSuffix === "0002") {
    const error = new Error("Payment failed.");
    error.code = "PAYMENT_FAILED";
    throw error;
  }
  if (failureSuffix === "0003") {
    const error = new Error("Seat unavailable.");
    error.code = "SEAT_UNAVAILABLE";
    throw error;
  }
  if (failureSuffix === "0004") {
    const error = new Error("Hold expired.");
    error.code = "HOLD_EXPIRED";
    throw error;
  }
  if (failureSuffix === "0005") {
    const error = new Error("Refund required.");
    error.code = "REFUND_REQUIRED";
    throw error;
  }

  const orderSeed = items.reduce((sum, item) => sum + Number(item.seatId ?? 0), 0);
  const orderId = `SP-${String(orderSeed || Math.floor(Math.random() * 9000) + 1000).padStart(6, "0")}`;
  const order = {
    orderId,
    userId: payload?.userId ?? USER_ID,
    status: "confirmed",
    itemCount: items.length,
    eventId: items[0]?.eventId ?? null,
    eventName: payload?.eventName ?? null,
    venueName: payload?.venueName ?? null,
    date: items[0]?.date ?? null,
    time: items[0]?.time ?? null,
    deliveryMethod: payload?.deliveryMethod ?? "eticket",
    email: payload?.patron?.email ?? "",
    totalAmount: items.reduce((sum, item) => sum + Number(item.price ?? 0), 0) + items.length * 2,
    items: items.map((item) => ({
      seatId: item.seatId,
      seatLabel: item.seatLabel ?? null,
      tier: item.tier ?? null,
      sectionNo: item.sectionNo ?? null,
      rowNo: item.rowNo ?? null,
      seatNo: item.seatNo ?? null,
      price: item.price ?? 0,
    })),
    createdAt: new Date().toISOString(),
  };
  storeCreateOrder(order);
  return order;
}

export async function getMyOrders(userId = USER_ID) {
  await delay(300);
  return storeGetOrdersByUser(userId);
}

export async function getMyNotifications(userId = USER_ID) {
  await delay(250);

  const orders = storeGetOrdersByUser(userId);
  const swaps = storeGetSwapRequestsByUser(userId);

  const orderNotifications = orders.flatMap((order) => {
    const notifications = [
      {
        notificationId: `notif-order-${order.orderId}`,
        type: "PURCHASE_CONFIRMED",
        title: "Purchase confirmed",
        message: `Your booking for ${order.eventName || "your event"} is confirmed and your e-ticket is available.`,
        createdAt: order.createdAt,
        status: "unread",
        route: "/tickets",
      },
    ];

    if (order.scenarioBOutcome === "reassigned") {
      notifications.push({
        notificationId: `notif-reassigned-${order.orderId}`,
        type: "SEAT_REASSIGNED",
        title: "Seat reassigned",
        message: order.seatmapMessage || "Your seat has been reassigned after a seat map change.",
        createdAt: order.seatmapUpdatedAt || order.updatedAt || order.createdAt,
        status: "unread",
        route: "/tickets",
      });
    }

    if (order.scenarioBOutcome === "refunded") {
      notifications.push({
        notificationId: `notif-refund-${order.orderId}`,
        type: "REFUND_ISSUED",
        title: "Refund issued",
        message: order.seatmapMessage || "Your order has been refunded after a seat map change.",
        createdAt: order.seatmapUpdatedAt || order.updatedAt || order.createdAt,
        status: "unread",
        route: "/tickets",
      });
    }

    return notifications;
  });

  const swapNotifications = swaps.flatMap((request) => {
    const notifications = [
      {
        notificationId: `notif-swap-request-${request.requestId}`,
        type: "SWAP_REQUESTED",
        title: "Swap request submitted",
        message: `Your request to swap ${request.currentSeatLabel} into ${request.desiredTier} has been submitted.`,
        createdAt: request.createdAt,
        status: "unread",
        route: "/swap",
      },
    ];

    if (request.swapStatus === "awaiting_confirmation") {
      notifications.push({
        notificationId: `notif-swap-match-${request.requestId}`,
        type: "SWAP_MATCHED",
        title: "Swap match found",
        message: `A swap offer is ready for ${request.eventName}. Review and accept or decline before it expires.`,
        createdAt: request.updatedAt || request.createdAt,
        status: "unread",
        route: "/swap",
      });
    }

    if (request.swapStatus === "completed") {
      notifications.push({
        notificationId: `notif-swap-complete-${request.requestId}`,
        type: "SWAP_COMPLETED",
        title: "Swap completed",
        message: request.outcomeMessage || "Your seat swap has been completed successfully.",
        createdAt: request.respondedAt || request.updatedAt || request.createdAt,
        status: "unread",
        route: "/swap",
      });
    }

    if (request.swapStatus === "failed" || request.swapStatus === "cancelled") {
      notifications.push({
        notificationId: `notif-swap-failed-${request.requestId}`,
        type: request.swapStatus === "cancelled" ? "SWAP_CANCELLED" : "SWAP_FAILED",
        title: request.swapStatus === "cancelled" ? "Swap cancelled" : "Swap failed",
        message:
          request.outcomeMessage ||
          (request.swapStatus === "cancelled"
            ? "Your swap request has been cancelled."
            : "Your swap request did not complete."),
        createdAt: request.respondedAt || request.updatedAt || request.createdAt,
        status: "unread",
        route: "/swap",
      });
    }

    return notifications;
  });

  return [...orderNotifications, ...swapNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function simulateSeatReassignment(orderId) {
  await delay(350);
  const orders = storeGetOrdersByUser(USER_ID);
  const order = orders.find((item) => String(item.orderId) === String(orderId));
  if (!order) {
    throw new Error("Order not found.");
  }

  const reassignedItems = order.items.map((item, index) => ({
    ...item,
    originalSeatLabel: item.originalSeatLabel ?? item.seatLabel,
    seatLabel: `Section ${Math.max(1, (item.sectionNo ?? 1) + 1)} · Row ${String.fromCharCode(66 + index)} · Seat ${Math.max(1, (item.seatNo ?? 1) + 2)}`,
    sectionNo: Math.max(1, (item.sectionNo ?? 1) + 1),
    rowNo: String.fromCharCode(66 + index),
    seatNo: Math.max(1, (item.seatNo ?? 1) + 2),
  }));

  return storeUpdateOrder(orderId, {
    status: "reassigned",
    scenarioBOutcome: "reassigned",
    seatmapMessage: "Your original seat was affected by a seat map change. We have successfully assigned you a replacement seat.",
    seatmapUpdatedAt: new Date().toISOString(),
    items: reassignedItems,
  });
}

export async function simulateRefundIssued(orderId) {
  await delay(350);
  const orders = storeGetOrdersByUser(USER_ID);
  const order = orders.find((item) => String(item.orderId) === String(orderId));
  if (!order) {
    throw new Error("Order not found.");
  }

  return storeUpdateOrder(orderId, {
    status: "refunded",
    scenarioBOutcome: "refunded",
    seatmapMessage: "Your original seat could not be reallocated after the seat map change. A full refund has been issued to your original payment method.",
    refundAmount: order.totalAmount,
    seatmapUpdatedAt: new Date().toISOString(),
  });
}

export async function getMySwapRequests(userId = USER_ID) {
  await delay(250);
  return storeGetSwapRequestsByUser(userId);
}

export async function createSwapRequest(payload) {
  await delay(600);
  if (!payload?.orderId || !payload?.seatId || !payload?.desiredTier) {
    throw new Error("Missing swap request details.");
  }

  const existingRequests = storeGetSwapRequestsByUser(payload.userId ?? USER_ID);
  const hasActiveRequest = existingRequests.some(
    (request) =>
      request.orderId === payload.orderId &&
      request.seatId === payload.seatId &&
      ["pending", "matched", "awaiting_confirmation"].includes(request.swapStatus)
  );

  if (hasActiveRequest) {
    throw new Error("This ticket already has an active swap request.");
  }

  const request = {
    requestId: `SW-${Math.floor(Math.random() * 900000) + 100000}`,
    userId: payload.userId ?? USER_ID,
    orderId: payload.orderId,
    eventId: payload.eventId ?? null,
    eventName: payload.eventName ?? "",
    currentSeatLabel: payload.currentSeatLabel ?? "",
    currentTier: payload.currentTier ?? "",
    desiredTier: payload.desiredTier,
    seatId: payload.seatId,
    swapStatus: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return storeCreateSwapRequest(request);
}

export async function cancelSwapRequest(requestId) {
  await delay(400);
  const cancelled = storeCancelSwapRequest(requestId);
  if (!cancelled) {
    throw new Error("Swap request not found.");
  }
  return cancelled;
}

export async function simulateSwapMatch(requestId) {
  await delay(350);
  const requests = storeGetSwapRequestsByUser(USER_ID);
  const request = requests.find((item) => String(item.requestId) === String(requestId));
  if (!request) {
    throw new Error("Swap request not found.");
  }
  if (request.swapStatus !== "pending") {
    throw new Error("Only pending requests can be matched.");
  }

  return storeUpdateSwapRequest(requestId, {
    swapStatus: "awaiting_confirmation",
    matchedSeatLabel: `Section ${Math.max(1, (request.seatId % 7) + 1)} · Row B · Seat ${Math.max(1, (request.seatId % 20) + 1)}`,
    matchedTier: request.desiredTier,
    priceDelta: request.currentTier === request.desiredTier ? 0 : request.desiredTier === "VIP" ? 100 : request.desiredTier === "CAT1" ? 40 : -20,
    offerExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}

export async function respondToSwapRequest(requestId, response) {
  await delay(350);
  const requests = storeGetSwapRequestsByUser(USER_ID);
  const request = requests.find((item) => String(item.requestId) === String(requestId));
  if (!request) {
    throw new Error("Swap request not found.");
  }
  if (request.swapStatus !== "awaiting_confirmation") {
    throw new Error("This swap request is not awaiting confirmation.");
  }

  if (response === "accept") {
    return storeUpdateSwapRequest(requestId, {
      swapStatus: "completed",
      outcomeMessage: "Your swap has been completed successfully.",
      respondedAt: new Date().toISOString(),
    });
  }

  if (response === "decline") {
    return storeUpdateSwapRequest(requestId, {
      swapStatus: "failed",
      outcomeMessage: "You declined the matched swap offer.",
      respondedAt: new Date().toISOString(),
    });
  }

  throw new Error("Unsupported swap response.");
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
