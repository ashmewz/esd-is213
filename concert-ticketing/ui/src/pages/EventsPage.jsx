import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents } from "../api";
import { SlidersHorizontal, X, ChevronUp, ChevronDown } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = ["Concert", "Sport", "Festival", "Theater"];

const ALL_VENUES = [
  "Singapore National Stadium",
  "Singapore Indoor Stadium",
  "Mediacorp Theatre",
  "Capitol Theatre",
  "The Star Theatre",
  "Arena @ EXPO"
];

// ── FilterSection (collapsible) ────────────────────────────────────────────
function FilterSection({ title, icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        className="flex items-center justify-between w-full text-left mb-3"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {icon} {title}
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  );
}

// ── FilterDrawer ───────────────────────────────────────────────────────────
function FilterDrawer({ open, onClose, filters, onChange, onClear, eventVenues }) {
  const { dateFrom, dateTo, categories, venues } = filters;

  function toggleSet(key, value) {
    onChange((prev) => {
      const next = new Set(prev[key]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [key]: next };
    });
  }

  const venueList = useMemo(() => {
    const extra = eventVenues.filter((v) => !ALL_VENUES.includes(v));
    return [...ALL_VENUES, ...extra];
  }, [eventVenues]);

  const hasFilters =
    dateFrom || dateTo || categories.size > 0 || venues.size > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[268px] bg-white z-40 flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="flex items-center gap-2 font-bold text-gray-900 text-base">
            <SlidersHorizontal size={17} /> Filter
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto px-5">
          {/* Date Range */}
          <FilterSection title="Date Range" icon={<span className="text-base">📅</span>}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onChange((p) => ({ ...p, dateFrom: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onChange((p) => ({ ...p, dateTo: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </FilterSection>

          {/* Category */}
          <FilterSection title="Category" icon={<span className="text-base">🎭</span>}>
            <div className="flex flex-col gap-2.5">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={categories.has(cat)}
                    onChange={() => toggleSet("categories", cat)}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{cat}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Venues */}
          <FilterSection title="Venues" icon={<span className="text-base">📍</span>}>
            <div className="flex flex-col gap-2.5">
              {venueList.map((venue) => (
                <label key={venue} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={venues.has(venue)}
                    onChange={() => toggleSet("venues", venue)}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{venue}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Clear all */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClear}
            disabled={!hasFilters}
            className="w-full py-2.5 text-sm font-semibold text-[#800020] hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear all
          </button>
        </div>
      </div>
    </>
  );
}

// ── EventCard ──────────────────────────────────────────────────────────────
function EventCard({ event, onClick }) {
  const hasTickets = event.status?.toLowerCase() === "active";

  return (
    <div
      onClick={onClick}
      className="flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer outline outline-1 outline-gray-300 hover:outline-[#800020] hover:shadow-[0_0_20px_4px_rgba(128,0,32,0.35)]"
    >
      <div className="bg-gray-100 aspect-[3/2] overflow-hidden">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl select-none">🎵</div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white">
          Concert
        </span>
        <h2 className="font-bold text-gray-900 text-sm leading-snug mt-0.5">{event.name}</h2>
        <p className="text-xs text-gray-500">{event.date}</p>
        <p className="text-xs text-gray-500">{event.venueName}</p>
        <p className={`text-xs font-medium mt-0.5 ${hasTickets ? "text-blue-600" : "text-gray-400"}`}>
          {hasTickets
            ? event.minPrice != null ? `From S$${event.minPrice}` : "Tickets Available"
            : "No Tickets Available"}
        </p>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
const BLANK_FILTERS = {
  dateFrom: "",
  dateTo: "",
  categories: new Set(),
  venues: new Set(),
};

function parseFirstDate(event) {
  // Use the first dateId (YYYY-MM-DD) if available, otherwise null
  return event.dates?.[0]?.dateId ?? null;
}

// ── EventsPage ─────────────────────────────────────────────────────────────
export default function EventsPage() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState(BLANK_FILTERS);
  const navigate = useNavigate();

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const eventVenues = useMemo(() => [...new Set(events.map((e) => e.venueName).filter(Boolean))], [events]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      // Date range
      if (filters.dateFrom || filters.dateTo) {
        const d = parseFirstDate(event);
        if (d) {
          if (filters.dateFrom && d < filters.dateFrom) return false;
          if (filters.dateTo   && d > filters.dateTo)   return false;
        }
      }
      // Category — all our events are "Concert"
      if (filters.categories.size > 0 && !filters.categories.has("Concert")) return false;
      // Venue
      if (filters.venues.size > 0 && !filters.venues.has(event.venueName)) return false;
      return true;
    });
  }, [events, filters]);

  const activeFilterCount =
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo   ? 1 : 0) +
    filters.categories.size +
    filters.venues.size;

  function clearFilters() {
    setFilters(BLANK_FILTERS);
  }

  return (
    <main className="px-8 py-8 min-h-screen bg-white">
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        eventVenues={eventVenues}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <SlidersHorizontal size={15} /> Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#800020] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading events...</p>}
      {error   && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-gray-500 text-sm">
          {activeFilterCount > 0
            ? "No events match your filters."
            : "Sorry, there are no events available for sale. Please check back again soon."}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((event) => (
          <EventCard
            key={event.eventId}
            event={event}
            onClick={() => navigate(`/events/${event.eventId}`)}
          />
        ))}
      </div>
    </main>
  );
}
