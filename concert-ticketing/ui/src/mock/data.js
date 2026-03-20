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

function generateSeats(eventId) {
  const seats = [];
  let seatId = (eventId - 1) * 1000 + 1;

  const config = [
    { tier: "VIP",  sectionNo: 1, rows: ["A", "B"],           seatsPerRow: 10, basePrice: 288 },
    { tier: "CAT1", sectionNo: 2, rows: ["A", "B", "C"],      seatsPerRow: 15, basePrice: 188 },
    { tier: "CAT1", sectionNo: 3, rows: ["A", "B", "C"],      seatsPerRow: 15, basePrice: 188 },
    { tier: "CAT2", sectionNo: 4, rows: ["A", "B", "C", "D"], seatsPerRow: 20, basePrice: 128 },
    { tier: "CAT2", sectionNo: 5, rows: ["A", "B", "C", "D"], seatsPerRow: 20, basePrice: 128 },
    { tier: "CAT3", sectionNo: 6, rows: ["A","B","C","D","E"],seatsPerRow: 25, basePrice: 68  },
    { tier: "CAT3", sectionNo: 7, rows: ["A","B","C","D","E"],seatsPerRow: 25, basePrice: 68  },
  ];

  const soldOffsets = new Set([2, 5, 9, 14, 22, 30, 35, 41, 55, 60, 72, 80, 95]);

  config.forEach(({ tier, sectionNo, rows, seatsPerRow, basePrice }) => {
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

export const SEATMAPS = {
  1: { event: EVENTS[0], seats: generateSeats(1) },
  2: { event: EVENTS[1], seats: generateSeats(2) },
  3: { event: EVENTS[2], seats: generateSeats(3) },
};
