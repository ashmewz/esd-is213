import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents } from "../api";
import { MapPin, Calendar } from "lucide-react";

function EventCard({ event, onClick }) {
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded overflow-hidden hover:shadow-md transition cursor-pointer w-56">
      {/* Poster */}
      <div className="bg-gray-100 h-64 flex items-center justify-center overflow-hidden">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-300 text-5xl select-none">🎵</div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h2 className="font-bold text-gray-900 text-sm leading-snug">{event.name}</h2>
        {event.venueName && (
          <div className="flex items-start gap-1 text-gray-500 text-xs">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span>{event.venueName}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <Calendar size={12} className="shrink-0" />
          <span>{event.date}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={onClick}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded transition"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="px-8 py-8 min-h-screen bg-white">
      {loading && (
        <p className="text-gray-400 text-sm">Loading events...</p>
      )}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="text-gray-500 text-sm">Sorry, there are no events available for sale. Please check back again soon.</p>
      )}
      <div className="flex flex-wrap gap-6">
        {events.map((event) => (
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
