import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getEvent, getSeatmap } from "../api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import LoginPromptModal from "../components/LoginPromptModal";

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

  const availableSet = new Set(
    eventDates.filter((d) => d.isSellable !== false).map((d) => d.dateId)
  );
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const startDay     = new Date(year, month, 1).getDay();

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
        <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-[#800020] transition">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-800">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-[#800020] transition">
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

          return (
            <div key={dateId} className="flex items-center justify-center h-10">
              <button
                disabled={!avail}
                onClick={() => avail && onSelectDate(dateId)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition
                  ${selected
                    ? "bg-[#800020] text-white"
                    : avail
                    ? "border-2 border-[#6a001a] text-gray-800 hover:bg-[#fdf0f8]"
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
          <TimeSlots times={dateObj.availableTimes ?? dateObj.times} />
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
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [event,          setEvent]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [selectedDate,   setSelectedDate]   = useState(null); // dateId string
  const [selectedTime,   setSelectedTime]   = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>;
  }
  if (!event) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Event not found.</div>;
  }

  const selectedDateObj = event.dates.find((d) => d.dateId === selectedDate);
  const selectedTimes = selectedDateObj?.availableTimes ?? selectedDateObj?.times ?? [];

  return (
    <div>
      <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      {/* Back link */}
      <div className="px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-[#800020] transition text-sm font-medium"
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
        <p className="text-[#800020] font-medium">{event.venueName}</p>
        <p className="text-[#800020] text-sm mt-0.5">{event.date}</p>
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
                {selectedTimes.map((t) => {
                  const active = selectedTime === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`w-full py-3 rounded-lg text-sm font-semibold transition ${
                        active
                          ? "bg-[#800020] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
                {selectedTimes.length === 0 && (
                  <p className="text-center text-sm text-gray-400">Tickets unavailable for this date.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Select Tickets CTA */}
        {selectedDate && selectedTime && selectedTimes.includes(selectedTime) && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Select your Tickets
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSelectSeats}
                className="w-full py-4 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition"
              >
                Choose My Own Seats
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Calendar inner (stateful month navigation) ────────────────────────────────
function CalendarInner({ eventDates, selectedDateId, onSelectDate, defaultYear, defaultMonth }) {
  const [year,  setYear]  = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const availableSet = new Set(
    eventDates.filter((d) => d.isSellable !== false).map((d) => d.dateId)
  );
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const startDay     = new Date(year, month, 1).getDay();

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
        <button onClick={prevMonth} className="p-1 text-gray-500 hover:text-[#800020] transition">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-800">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 text-gray-500 hover:text-[#800020] transition">
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

          return (
            <div key={dateId} className="flex items-center justify-center h-10">
              <button
                disabled={!avail}
                onClick={() => avail && onSelectDate(dateId)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition
                  ${selected
                    ? "bg-[#800020] text-white"
                    : avail
                    ? "border-2 border-[#6a001a] text-gray-800 hover:bg-[#fdf0f8]"
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
