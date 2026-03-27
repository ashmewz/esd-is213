import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock } from "lucide-react";
import { EVENTS } from "../mock/data";

function FeaturedEventCard({ event, onClick }) {
  return (
    <div
      className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-[0_0_20px_4px_rgba(128,0,32,0.35)]"
      onClick={onClick}
    >
      <div className="h-60 overflow-hidden bg-gray-100">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🎵</div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-2">
        <h3 className="font-bold text-gray-900 text-base leading-snug">{event.name}</h3>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Calendar size={14} className="shrink-0" />
          <span>{event.date}</span>
        </div>
        {event.dates?.[0]?.times?.[0] && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock size={14} className="shrink-0" />
            <span>{event.dates[0].times[0]}</span>
          </div>
        )}
        {event.venueName && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <MapPin size={14} className="shrink-0" />
            <span className="underline underline-offset-2">{event.venueName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const featuredEvent = EVENTS[0];

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
            <img
              src={featuredEvent.imageUrl}
              alt={featuredEvent.name}
              className="w-full h-full object-cover grayscale brightness-75"
            />
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="bg-white py-20 px-12 lg:px-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Next Big Events</h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Discover the most exciting upcoming events and secure your tickets now for unforgettable experiences!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {EVENTS.map((event) => (
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
