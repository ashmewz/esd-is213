export const EVENTS = [
  {
    eventId: 1,
    name: "Taylor Swift – The Eras Tour",
    venueName: "Singapore National Stadium",
    date: "Fri 15 – Sat 16 Aug 2026",
    status: "active",
    imageUrl: "/taylor.jpg",
    dates: [
      { dateId: "2026-08-15", label: "Fri 15 Aug 2026", times: ["6:00 PM", "8:30 PM"] },
      { dateId: "2026-08-16", label: "Sat 16 Aug 2026", times: ["6:00 PM", "8:30 PM"] },
    ],
  },
  {
    eventId: 2,
    name: "Coldplay – Music of the Spheres",
    venueName: "Singapore Indoor Stadium",
    date: "Sat 22 – Sun 23 Nov 2026",
    status: "active",
    imageUrl: "/coldplay.jpg",
    dates: [
      { dateId: "2026-11-22", label: "Sat 22 Nov 2026", times: ["7:30 PM"] },
      { dateId: "2026-11-23", label: "Sun 23 Nov 2026", times: ["7:30 PM"] },
    ],
  },
  {
    eventId: 3,
    name: "Bruno Mars Live in Singapore",
    venueName: "Resorts World Theatre",
    date: "Sat 10 Jan 2026",
    status: "active",
    imageUrl: "/bruno.jpg",
    dates: [
      { dateId: "2026-01-10", label: "Sat 10 Jan 2026", times: ["8:00 PM"] },
    ],
  },
];

export const DEFAULT_SEAT_CONFIG = [
  // VIP / PB1 — large centre floor (174×153 on map) → 10 rows × 22 seats
  { tier: "VIP",  sectionNo: 1, rowCount: 10, seatsPerRow: 22, basePrice: 288 },
  // CAT1 / PA1 & PC1 — medium floor (112×153 on map) → 8 rows × 14 seats
  { tier: "CAT1", sectionNo: 2, rowCount: 8,  seatsPerRow: 14, basePrice: 188 },
  { tier: "CAT1", sectionNo: 3, rowCount: 8,  seatsPerRow: 14, basePrice: 188 },
  // CAT2 / Standing Pens — GA capacity pool → 6 rows × 20 spots
  { tier: "CAT2", sectionNo: 4, rowCount: 6,  seatsPerRow: 20, basePrice: 128 },
  { tier: "CAT2", sectionNo: 5, rowCount: 6,  seatsPerRow: 20, basePrice: 128 },
  // CAT3 — numbered outer sections → 8 rows × 25 seats
  { tier: "CAT3", sectionNo: 6, rowCount: 8,  seatsPerRow: 25, basePrice: 68  },
  { tier: "CAT3", sectionNo: 7, rowCount: 8,  seatsPerRow: 25, basePrice: 68  },
];

const ROW_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function generateSeatsFromConfig(eventId, config) {
  const seats = [];
  let seatId = (eventId - 1) * 1000 + 1;
  const soldOffsets = new Set([2, 5, 9, 14, 22, 30, 35, 41, 55, 60, 72, 80, 95]);

  config.forEach(({ tier, sectionNo, rowCount, seatsPerRow, basePrice }) => {
    const rows = ROW_LABELS.slice(0, Math.min(rowCount, 26));
    rows.forEach((rowLabel) => {
      for (let s = 1; s <= seatsPerRow; s++) {
        const offset = seatId - ((eventId - 1) * 1000 + 1);
        seats.push({
          seatId,
          eventId,
          tier,
          sectionNo,
          rowNo: rowLabel,
          seatNo: s,
          basePrice,
          status: soldOffsets.has(offset % 100) ? "sold" : "available",
        });
        seatId++;
      }
    });
  });

  return seats;
}

export function generateSeats(eventId) {
  return generateSeatsFromConfig(eventId, DEFAULT_SEAT_CONFIG);
}

export const SEATMAPS = {
  1: { event: EVENTS[0], seats: generateSeats(1) },
  2: { event: EVENTS[1], seats: generateSeats(2) },
  3: { event: EVENTS[2], seats: generateSeats(3) },
};
