import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Ticket } from "lucide-react";
import { adminGetEvents, adminDeleteEvent } from "../../api";

const STATUS_LABELS = { active: "Live", upcoming: "Upcoming", finished: "Finished" };
const STATUS_COLORS = {
  active:   "bg-green-100 text-green-700",
  upcoming: "bg-blue-100  text-blue-700",
  finished: "bg-gray-200  text-gray-500",
};

const TABS = ["All", "Live", "Upcoming", "Finished"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [events,  setEvents]  = useState([]);
  const [tab,     setTab]     = useState("All");
  const [search,  setSearch]  = useState("");
  const [deleting, setDeleting] = useState(null); // eventId being confirmed

  function load() {
    adminGetEvents().then(setEvents);
  }

  useEffect(load, []);

  const filtered = events.filter((e) => {
    const matchTab =
      tab === "All" ||
      (tab === "Live"     && e.status === "active")   ||
      (tab === "Upcoming" && e.status === "upcoming") ||
      (tab === "Finished" && e.status === "finished");
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  async function handleDelete(eventId) {
    await adminDeleteEvent(eventId);
    setDeleting(null);
    load();
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} total events</p>
        </div>
        <button
          onClick={() => navigate("/admin/events/new")}
          className="flex items-center gap-2 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold px-4 py-2.5 rounded-lg transition text-sm"
        >
          <Plus size={16} /> Create Event
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                tab === t
                  ? "bg-[#800020] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] w-56"
          />
        </div>
      </div>

      {/* Event cards */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20 text-sm">No events found.</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((event) => (
            <div key={event.eventId} className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-[0_0_20px_4px_rgba(128,0,32,0.35)]">
              {/* Image */}
              <div className="bg-gray-100 aspect-[3/2] overflow-hidden">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🎵</div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-1.5 flex-1">
                {/* Category + status row */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                    Concert
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[event.status] ?? STATUS_COLORS.finished}`}>
                    {STATUS_LABELS[event.status] ?? event.status}
                  </span>
                </div>

                <h2 className="font-bold text-gray-900 text-sm leading-snug mt-1 line-clamp-2">{event.name}</h2>
                <p className="text-xs text-gray-500">{event.date}</p>
                <p className="text-xs text-gray-500">{event.venueName}</p>

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-3">
                  <button
                    onClick={() => navigate(`/admin/events/${event.eventId}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => navigate(`/admin/events/${event.eventId}/seatmap`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    <Ticket size={12} /> Seatmap
                  </button>
                  <button
                    onClick={() => setDeleting(event.eventId)}
                    className="flex items-center justify-center px-3 py-2 border border-red-100 rounded-lg text-xs text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setDeleting(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900 mb-2">Delete Event?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently remove the event and all its seat data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleting)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
