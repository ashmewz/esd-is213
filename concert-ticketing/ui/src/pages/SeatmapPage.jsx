import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSeatmap } from "../api";
import { MapPin, Calendar, ChevronLeft } from "lucide-react";

const TIER_STYLES = {
  VIP:  { bg: "bg-yellow-400",  selected: "bg-yellow-500",  legend: "bg-yellow-400",  label: "VIP"  },
  CAT1: { bg: "bg-blue-400",    selected: "bg-blue-600",    legend: "bg-blue-400",    label: "CAT 1" },
  CAT2: { bg: "bg-green-400",   selected: "bg-green-600",   legend: "bg-green-400",   label: "CAT 2" },
  CAT3: { bg: "bg-purple-400",  selected: "bg-purple-600",  legend: "bg-purple-400",  label: "CAT 3" },
};

export default function SeatmapPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getSeatmap(eventId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64 text-gray-400">Loading seatmap...</div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-64 text-red-400">{error}</div>
  );

  const { event, seats } = data;

  // Group seats by tier → section → row
  const grouped = seats.reduce((acc, seat) => {
    const tier = seat.tier;
    const section = `Section ${seat.sectionNo}`;
    const row = `Row ${seat.rowNo}`;
    if (!acc[tier]) acc[tier] = {};
    if (!acc[tier][section]) acc[tier][section] = {};
    if (!acc[tier][section][row]) acc[tier][section][row] = [];
    acc[tier][section][row].push(seat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Event header */}
      <div className="bg-gray-50 border-b px-8 py-6">
        <button
          onClick={() => navigate("/events")}
          className="flex items-center gap-1 text-sm text-orange-500 hover:underline mb-4"
        >
          <ChevronLeft size={16} /> Back to Events
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {event.venueName && (
            <span className="flex items-center gap-1"><MapPin size={14} />{event.venueName}</span>
          )}
          <span className="flex items-center gap-1"><Calendar size={14} />{event.date}</span>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Stage */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-200 text-gray-500 text-xs font-semibold tracking-widest uppercase px-16 py-2 rounded">
            STAGE
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8">
          {Object.entries(TIER_STYLES).map(([tier, style]) => (
            <div key={tier} className="flex items-center gap-2 text-sm text-gray-600">
              <div className={`w-4 h-4 rounded-sm ${style.legend}`} />
              <span>{style.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded-sm bg-gray-200" />
            <span>Sold</span>
          </div>
        </div>

        {/* Tiers */}
        {Object.entries(grouped).map(([tier, sections]) => (
          <div key={tier} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-sm ${TIER_STYLES[tier]?.legend}`} />
              <h2 className="font-semibold text-gray-700">
                {TIER_STYLES[tier]?.label ?? tier} — ${sections[Object.keys(sections)[0]][Object.keys(sections[Object.keys(sections)[0]])[0]][0]?.basePrice}
              </h2>
            </div>

            <div className="flex flex-wrap gap-6">
              {Object.entries(sections).map(([section, rows]) => (
                <div key={section} className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{section}</p>
                  <div className="space-y-2">
                    {Object.entries(rows).map(([row, rowSeats]) => (
                      <div key={row} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-10">{row}</span>
                        <div className="flex gap-1 flex-wrap">
                          {rowSeats.map((seat) => {
                            const taken = seat.status !== "available";
                            const isSelected = selected?.seatId === seat.seatId;
                            const style = TIER_STYLES[seat.tier];
                            return (
                              <button
                                key={seat.seatId}
                                disabled={taken}
                                onClick={() => setSelected(isSelected ? null : seat)}
                                title={taken ? "Sold" : `Seat ${seat.seatNo} — $${seat.basePrice}`}
                                className={`w-7 h-7 rounded-sm text-xs font-bold transition
                                  ${taken ? "bg-gray-200 text-gray-400 cursor-not-allowed" : ""}
                                  ${!taken && !isSelected ? `${style?.bg} text-white hover:opacity-80` : ""}
                                  ${isSelected ? `${style?.selected} text-white ring-2 ring-offset-1 ring-gray-800 scale-110` : ""}
                                `}
                              >
                                {seat.seatNo}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky bottom bar when seat selected */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl px-8 py-4 flex justify-between items-center">
          <div>
            <p className="font-semibold text-gray-900">
              {TIER_STYLES[selected.tier]?.label} · Section {selected.sectionNo} · Row {selected.rowNo} · Seat {selected.seatNo}
            </p>
            <p className="text-orange-500 font-bold text-lg">${selected.basePrice}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelected(null)}
              className="px-5 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Clear
            </button>
            <button
              onClick={() => navigate(`/checkout/${eventId}/${selected.seatId}`, { state: { seat: selected, event } })}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition"
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
