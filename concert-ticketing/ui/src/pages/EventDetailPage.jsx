import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { getEvent, getSeatmap } from "../api";

// ── Calendar helpers ──────────────────────────────────────────────────────────
const DAYS   = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function Calendar({ eventDates, selectedDateId, onSelectDate }) {
  const first     = eventDates.length > 0 ? new Date(eventDates[0].dateId) : new Date();
  const [year, setYear]   = useState(first.getFullYear());
  const [month, setMonth] = useState(first.getMonth());

  const availableSet = new Set(eventDates.map((d) => d.dateId));
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const startDay     = new Date(year, month, 1).getDay();
  const today        = new Date();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const cells = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden w-full max-w-md mx-auto">
      {/* Month header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-orange-500 transition">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-800">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-orange-500 transition">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1 p-4">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const dateId  = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const avail   = availableSet.has(dateId);
          const selected = selectedDateId === dateId;
          const isToday =
            today.getFullYear() === year &&
            today.getMonth()    === month &&
            today.getDate()     === day;

          return (
            <div key={dateId} className="flex items-center justify-center h-10">
              <button
                disabled={!avail}
                onClick={() => avail && onSelectDate(dateId)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition
                  ${selected
                    ? "bg-orange-500 text-white"
                    : avail
                    ? "border-2 border-orange-400 text-gray-800 hover:bg-orange-50"
                    : isToday
                    ? "border-2 border-gray-800 text-gray-800"
                    : "text-gray-400 cursor-default"
                  }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* Time slots — shown inside same box once date is selected */}
      {selectedDateId && (() => {
        const dateObj = eventDates.find((d) => d.dateId === selectedDateId);
        return dateObj ? (
          <TimeSlots times={dateObj.times} />
        ) : null;
      })()}
    </div>
  );
}

function TimeSlots({ times }) {
  // Lifted state is handled by parent; we keep local selection here
  // and bubble up via the onSelectTime prop injected by parent
  return null; // placeholder — see integration below
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [event,        setEvent]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // dateId string
  const [selectedTime, setSelectedTime] = useState(null);
  const [autoPicked,   setAutoPicked]   = useState(null); // seat for "pick for me" modal
  const [picking,      setPicking]      = useState(false);

  useEffect(() => {
    getEvent(eventId)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [eventId]);

  function handleDateSelect(dateId) {
    setSelectedDate(dateId);
    setSelectedTime(null);
  }

  function handleSelectSeats() {
    navigate(
      `/events/${eventId}/seats?date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`
    );
  }

  async function handlePickForMe() {
    setPicking(true);
    try {
      const { seats } = await getSeatmap(eventId);
      const available = seats.filter((s) => s.status === "available");
      if (available.length === 0) return;
      const pick = available[Math.floor(Math.random() * available.length)];
      setAutoPicked(pick);
    } finally {
      setPicking(false);
    }
  }

  function handleRepick() {
    setAutoPicked(null);
    handlePickForMe();
  }

  function handleConfirmAutoPick() {
    navigate(`/checkout/${eventId}/${autoPicked.seatId}`, {
      state: { seat: autoPicked, event, date: selectedDate, time: selectedTime },
    });
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>;
  }
  if (!event) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Event not found.</div>;
  }

  const selectedDateObj = event.dates.find((d) => d.dateId === selectedDate);

  return (
    <div>
      {/* Back link */}
      <div className="px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-orange-500 transition text-sm font-medium"
        >
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {/* Poster banner */}
      <div className="bg-gray-100 flex justify-center items-center py-8 px-4">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.name}
            className="max-h-72 max-w-xs object-contain rounded-lg shadow"
          />
        ) : (
          <div className="w-48 h-64 bg-gray-200 rounded-lg flex items-center justify-center text-5xl">
            🎵
          </div>
        )}
      </div>

      {/* Event info */}
      <div className="text-center px-6 py-8 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h1>
        <p className="text-orange-500 font-medium">{event.venueName}</p>
        <p className="text-orange-500 text-sm mt-0.5">{event.date}</p>
      </div>

      {/* Date picker */}
      <div className="px-6 py-10 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Choose a Date</h2>

        {/* Calendar + inline time slots */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Month header */}
          {(() => {
            const first = event.dates.length > 0 ? new Date(event.dates[0].dateId) : new Date();
            return (
              <CalendarInner
                eventDates={event.dates}
                selectedDateId={selectedDate}
                onSelectDate={handleDateSelect}
                defaultYear={first.getFullYear()}
                defaultMonth={first.getMonth()}
              />
            );
          })()}

          {/* Time slots inside the same box */}
          {selectedDateObj && (
            <div className="border-t border-gray-200 px-6 py-5">
              <p className="text-center font-semibold text-gray-800 mb-4">At what time?</p>
              <div className="flex flex-col gap-3">
                {selectedDateObj.times.map((t) => {
                  const active = selectedTime === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`w-full py-3 rounded-lg text-sm font-semibold transition ${
                        active
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Select Tickets CTA */}
        {selectedDate && selectedTime && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Select your Tickets
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSelectSeats}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition"
              >
                Choose My Own Seats
              </button>
              <button
                onClick={handlePickForMe}
                disabled={picking}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition disabled:opacity-50"
              >
                {picking ? "Finding best seat..." : "Pick Seats For Me"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Auto-pick modal ─────────────────────────────────────── */}
      {autoPicked && (
        <div
          className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/20"
          onClick={() => setAutoPicked(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-sm p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
              We picked a seat for you
            </p>
            <div className="grid grid-cols-3 divide-x border rounded-lg mb-4">
              <div className="px-3 py-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Tier</p>
                <p className="font-bold text-gray-800">{autoPicked.tier}</p>
              </div>
              <div className="px-3 py-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Row</p>
                <p className="font-bold text-gray-800">{autoPicked.rowNo}</p>
              </div>
              <div className="px-3 py-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Seat</p>
                <p className="font-bold text-gray-800">{autoPicked.seatNo}</p>
              </div>
            </div>
            <p className="text-center text-orange-500 font-bold text-xl mb-5">
              ${autoPicked.basePrice}
            </p>
            <button
              onClick={handleConfirmAutoPick}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition mb-2"
            >
              Continue to Checkout →
            </button>
            <button
              onClick={handleRepick}
              className="w-full py-2 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <Shuffle size={14} /> Pick another seat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calendar inner (stateful month navigation) ────────────────────────────────
function CalendarInner({ eventDates, selectedDateId, onSelectDate, defaultYear, defaultMonth }) {
  const [year,  setYear]  = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const availableSet = new Set(eventDates.map((d) => d.dateId));
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const startDay     = new Date(year, month, 1).getDay();
  const today        = new Date();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const cells = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      {/* Month header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-orange-500 transition">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-800">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-orange-500 transition">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-1 p-4">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const dateId   = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const avail    = availableSet.has(dateId);
          const selected = selectedDateId === dateId;
          const isToday  =
            today.getFullYear() === year &&
            today.getMonth()    === month &&
            today.getDate()     === day;

          return (
            <div key={dateId} className="flex items-center justify-center h-10">
              <button
                disabled={!avail}
                onClick={() => avail && onSelectDate(dateId)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition
                  ${selected
                    ? "bg-orange-500 text-white"
                    : avail
                    ? "border-2 border-orange-400 text-gray-800 hover:bg-orange-50"
                    : isToday
                    ? "border-2 border-gray-800 text-gray-800"
                    : "text-gray-400 cursor-default"
                  }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
