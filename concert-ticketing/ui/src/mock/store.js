import {
  EVENTS as SEED_EVENTS,
  SEATMAPS as SEED_SEATMAPS,
  DEFAULT_SEAT_CONFIG,
  generateSeats,
  generateSeatsFromConfig,
} from "./data";
import { DEFAULT_VENUE_SECTIONS } from "./venueData";

// ── Mutable in-memory store ────────────────────────────────────────────────
let events = SEED_EVENTS.map((e) => ({
  ...e,
  dates: e.dates.map((d) => ({ ...d, times: [...d.times] })),
}));

let seatmaps = Object.fromEntries(
  Object.entries(SEED_SEATMAPS).map(([k, v]) => [k, { ...v, seats: v.seats.map((s) => ({ ...s })) }])
);

let nextEventId = Math.max(...events.map((e) => e.eventId)) + 1;

// Tier prices: eventId → { VIP: n, CAT1: n, ... }
let tierPrices = {};
for (const [eid, { seats }] of Object.entries(seatmaps)) {
  tierPrices[eid] = {};
  for (const seat of seats) {
    tierPrices[eid][seat.tier] = seat.basePrice;
  }
}

// Section configs: eventId → array of { tier, sectionNo, rowCount, seatsPerRow, basePrice }
let sectionConfigs = {};
for (const ev of events) {
  sectionConfigs[ev.eventId] = DEFAULT_SEAT_CONFIG.map((c) => ({ ...c }));
}

// Visual sections: eventId → array of venue section objects (with optional hidden flag)
let visualSections = {};
for (const ev of events) {
  visualSections[ev.eventId] = DEFAULT_VENUE_SECTIONS.map((s) => ({ ...s, hidden: false }));
}

// ── Getters ────────────────────────────────────────────────────────────────
export function storeGetEvents() {
  return events;
}

export function storeGetEvent(eventId) {
  return events.find((e) => e.eventId === Number(eventId)) ?? null;
}

export function storeGetSeatmap(eventId) {
  return seatmaps[Number(eventId)] ?? null;
}

export function storeGetTierPrices(eventId) {
  return tierPrices[Number(eventId)] ?? {};
}

export function storeGetSectionConfigs(eventId) {
  return sectionConfigs[Number(eventId)] ?? [];
}

export function storeGetVisualSections(eventId) {
  return visualSections[Number(eventId)] ?? DEFAULT_VENUE_SECTIONS.map((s) => ({ ...s, hidden: false }));
}

export function storeSetVisualSections(eventId, sections) {
  visualSections[Number(eventId)] = sections;
  return sections;
}

// ── Admin CRUD ─────────────────────────────────────────────────────────────
export function storeCreateEvent(data) {
  const newEvent = {
    eventId: nextEventId++,
    name: data.name,
    venueName: data.venueName,
    date: data.date,
    status: data.status ?? "active",
    imageUrl: data.imageUrl ?? "",
    dates: data.dates ?? [],
  };
  events = [...events, newEvent];

  const seats = generateSeats(newEvent.eventId);
  seatmaps[newEvent.eventId] = { event: newEvent, seats };
  tierPrices[newEvent.eventId] = { VIP: 288, CAT1: 188, CAT2: 128, CAT3: 68 };
  sectionConfigs[newEvent.eventId] = DEFAULT_SEAT_CONFIG.map((c) => ({ ...c }));
  visualSections[newEvent.eventId] = DEFAULT_VENUE_SECTIONS.map((s) => ({ ...s, hidden: false }));

  return newEvent;
}

export function storeUpdateEvent(eventId, data) {
  events = events.map((e) =>
    e.eventId === Number(eventId) ? { ...e, ...data, eventId: Number(eventId) } : e
  );
  if (seatmaps[Number(eventId)]) {
    seatmaps[Number(eventId)].event = storeGetEvent(eventId);
  }
  return storeGetEvent(eventId);
}

export function storeDeleteEvent(eventId) {
  events = events.filter((e) => e.eventId !== Number(eventId));
  delete seatmaps[Number(eventId)];
  delete tierPrices[Number(eventId)];
  delete sectionConfigs[Number(eventId)];
}

export function storeUpdateTierPrices(eventId, prices) {
  const eid = Number(eventId);
  tierPrices[eid] = { ...tierPrices[eid], ...prices };
  // Update basePrice on all seats
  if (seatmaps[eid]) {
    seatmaps[eid].seats = seatmaps[eid].seats.map((s) => ({
      ...s,
      basePrice: tierPrices[eid][s.tier] ?? s.basePrice,
    }));
  }
  // Sync section configs too
  if (sectionConfigs[eid]) {
    sectionConfigs[eid] = sectionConfigs[eid].map((c) => ({
      ...c,
      basePrice: tierPrices[eid][c.tier] ?? c.basePrice,
    }));
  }
  return tierPrices[eid];
}

export function storeSetSectionConfigs(eventId, configs) {
  const eid = Number(eventId);
  // Re-number sectionNos sequentially
  const numbered = configs.map((c, i) => ({ ...c, sectionNo: i + 1 }));
  sectionConfigs[eid] = numbered;

  // Sync tier prices from current price table
  const prices = tierPrices[eid] ?? {};
  const configWithPrices = numbered.map((c) => ({
    ...c,
    basePrice: prices[c.tier] ?? c.basePrice,
  }));

  // Regenerate seats
  if (seatmaps[eid]) {
    seatmaps[eid].seats = generateSeatsFromConfig(eid, configWithPrices);
  }

  return sectionConfigs[eid];
}
