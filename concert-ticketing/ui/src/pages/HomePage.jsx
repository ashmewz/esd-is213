import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents } from "../api";

function formatEventDate(event) {
  const raw = event.eventDate ?? event.date ?? "";
  const iso = new Date(raw);
  if (!isNaN(iso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return iso.toLocaleDateString("en-SG", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });
  }
  return raw;
}

function FeaturedEventCard({ event, onClick }) {
  const status = event.status?.toLowerCase() ?? "";
  const hasTickets = status === "active" || status === "upcoming";
  return (
    <div
      className="flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer outline outline-1 outline-gray-300 hover:outline-[#800020] hover:shadow-[0_0_20px_4px_rgba(128,0,32,0.35)]"
      onClick={onClick}
    >
      <div className="aspect-[3/2] overflow-hidden bg-gray-100">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🎵</div>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white">
          Concert
        </span>
        <h3 className="font-bold text-gray-900 text-sm leading-snug mt-0.5">{event.name}</h3>
        <p className="text-xs text-gray-500">{formatEventDate(event)}</p>
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

export default function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    getEvents().then((data) => setEvents(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((e) => {
        const status = e.status?.toLowerCase() ?? "";
        if (status === "deleted" || status === "finished") return false;
        const raw = e.eventDate ?? e.date ?? "";
        const d = new Date(raw);
        return !isNaN(d.getTime()) && d >= today;
      })
      .sort((a, b) => new Date(a.eventDate ?? a.date) - new Date(b.eventDate ?? b.date));
  }, [events]);

  const featuredEvent = upcomingEvents[0] ?? null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-[#1a0533] min-h-[85vh] flex items-center px-12 lg:px-24 relative overflow-hidden">
        {/* Background circles decoration */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-purple-900 opacity-30"
              style={{
                width: `${(i + 1) * 200}px`,
                height: `${(i + 1) * 200}px`,
                left: `${-100 + i * 20}px`,
                top: `50%`,
                transform: "translateY(-50%)",
              }}
            />
          ))}
        </div>

        {/* Left content */}
        <div className="relative z-10 flex-1 max-w-xl">
          <h1 className="text-white font-extrabold text-5xl lg:text-6xl leading-tight mb-8">
            THE BEST WAY<br />TO EXPERIENCE<br />LIVE EVENTS
          </h1>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/events")}
              className="bg-[#800020] hover:bg-[#6a001a] text-white font-semibold px-8 py-3 rounded-lg transition flex items-center gap-2"
            >
              Explore ↗
            </button>
          </div>
        </div>

        {/* Right image */}
        <div className="hidden lg:flex flex-1 justify-end items-center relative z-10">
          <div className="w-[480px] h-[480px] overflow-hidden rounded-tl-3xl rounded-br-3xl">
            {featuredEvent?.imageUrl ? (
              <img
                src={featuredEvent.imageUrl}
                alt={featuredEvent.name}
                className="w-full h-full object-cover grayscale brightness-75"
              />
            ) : (
              <div className="w-full h-full bg-purple-900/30 flex items-center justify-center text-white/30 text-6xl">🎵</div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="bg-white py-16 px-8 lg:px-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Next Big Events</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Discover the most exciting upcoming events and secure your tickets now.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {upcomingEvents.map((event) => (
            <FeaturedEventCard
              key={event.eventId}
              event={event}
              onClick={() => navigate(`/events/${event.eventId}`)}
            />
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <button
            onClick={() => navigate("/events")}
            className="bg-[#800020] hover:bg-[#6a001a] text-white font-semibold px-10 py-3 rounded-lg transition flex items-center gap-2"
          >
            View All ↗
          </button>
        </div>
      </section>
    </div>
  );
}
