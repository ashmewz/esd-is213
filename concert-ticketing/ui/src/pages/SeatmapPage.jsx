import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getSeatmap } from "../api";
import { ChevronLeft, RefreshCw } from "lucide-react";

// ── Tier config ───────────────────────────────────────────────────────────────
const TIERS = {
  VIP:  { color: "bg-orange-400",  ring: "ring-orange-600",  dot: "bg-orange-400",  label: "VIP",   price: 288 },
  CAT1: { color: "bg-teal-400",    ring: "ring-teal-600",    dot: "bg-teal-400",    label: "CAT 1", price: 188 },
  CAT2: { color: "bg-violet-400",  ring: "ring-violet-600",  dot: "bg-violet-400",  label: "CAT 2", price: 128 },
  CAT3: { color: "bg-blue-400",    ring: "ring-blue-600",    dot: "bg-blue-400",    label: "CAT 3", price: 68  },
};

// Section → theater position (row 1 = back, row 3 = front; col 1-3)
const LAYOUT = [
  { sectionNo: 6, layoutRow: 1, layoutCol: 1 },
  { sectionNo: 7, layoutRow: 1, layoutCol: 3 },
  { sectionNo: 4, layoutRow: 2, layoutCol: 1 },
  { sectionNo: 5, layoutRow: 2, layoutCol: 3 },
  { sectionNo: 2, layoutRow: 3, layoutCol: 1 },
  { sectionNo: 1, layoutRow: 3, layoutCol: 2 },
  { sectionNo: 3, layoutRow: 3, layoutCol: 3 },
];

export default function SeatmapPage() {
  const { eventId }    = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const date           = searchParams.get("date");
  const time           = searchParams.get("time");

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [selected,     setSelected]     = useState(null);   // seat object
  const [popup,        setPopup]        = useState(null);   // seat object for popup
  const [visibleTiers, setVisibleTiers] = useState(new Set(Object.keys(TIERS)));
  const [showNumbers,  setShowNumbers]  = useState(true);

  useEffect(() => {
    getSeatmap(eventId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  function toggleTier(tier) {
    setVisibleTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  }

  function handleSeatClick(seat) {
    if (seat.status !== "available") return;
    if (popup?.seatId === seat.seatId) { setPopup(null); return; }
    setPopup(seat);
  }

  function handleConfirm() {
    setSelected(popup);
    setPopup(null);
    navigate(`/checkout/${eventId}/${popup.seatId}`, {
      state: { seat: popup, event: data.event, date, time },
    });
  }

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading seatmap...</div>;
  if (error)   return <div className="flex justify-center items-center h-64 text-red-400">{error}</div>;

  const { event, seats } = data;

  // Group seats by sectionNo → rowNo
  const bySection = seats.reduce((acc, s) => {
    if (!acc[s.sectionNo]) acc[s.sectionNo] = {};
    if (!acc[s.sectionNo][s.rowNo]) acc[s.sectionNo][s.rowNo] = [];
    acc[s.sectionNo][s.rowNo].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 transition mb-2"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">{event.name}</h1>
        {(date || time) && (
          <p className="text-sm text-gray-500 mt-0.5">
            {date} {time && `· ${time}`}
          </p>
        )}
      </div>

      <div className="flex">
        {/* ── Left: price filter ─────────────────────────────────── */}
        <aside className="w-52 shrink-0 border-r px-4 py-6 hidden md:block">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-gray-700">Filter price</span>
            <button
              onClick={() => setVisibleTiers(new Set(Object.keys(TIERS)))}
              className="text-gray-400 hover:text-orange-500 transition"
              title="Reset filters"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tier rows */}
          <div className="space-y-3 mb-4">
            {Object.entries(TIERS).map(([tier, cfg]) => (
              <label key={tier} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleTiers.has(tier)}
                  onChange={() => toggleTier(tier)}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className={`w-4 h-4 rounded-full ${cfg.dot} shrink-0`} />
                <span className="text-sm text-gray-700 flex-1">${cfg.price}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 text-xs">
            <button
              onClick={() => setVisibleTiers(new Set(Object.keys(TIERS)))}
              className="text-orange-500 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={() => setVisibleTiers(new Set())}
              className="text-orange-500 hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="mt-6 border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">Map Key</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded-full bg-teal-400" />
                Available
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded-full bg-gray-900" />
                Selected
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white" />
                Unavailable
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-6 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={() => setShowNumbers((v) => !v)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-xs text-gray-600">Display Seat Numbering</span>
          </label>
        </aside>

        {/* ── Right: seatmap ────────────────────────────────────── */}
        <main className="flex-1 px-4 py-6 overflow-x-auto">
          {/* Theater grid */}
          <div className="min-w-fit mx-auto" style={{ maxWidth: 820 }}>
            {[1, 2, 3].map((layoutRow) => (
              <div key={layoutRow} className="flex justify-center gap-8 mb-6">
                {[1, 2, 3].map((layoutCol) => {
                  const def = LAYOUT.find(
                    (l) => l.layoutRow === layoutRow && l.layoutCol === layoutCol
                  );
                  if (!def) return <div key={layoutCol} className="w-40" />;

                  const sectionData = bySection[def.sectionNo] ?? {};
                  const sampleSeat  = Object.values(sectionData)[0]?.[0];
                  const tier        = sampleSeat?.tier;
                  const cfg         = TIERS[tier];
                  const hidden      = tier && !visibleTiers.has(tier);

                  return (
                    <div key={layoutCol} className={`transition-opacity ${hidden ? "opacity-20" : "opacity-100"}`}>
                      <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {cfg ? `${cfg.label} · $${cfg.price}` : `Sec ${def.sectionNo}`}
                      </p>
                      <div className="space-y-1">
                        {Object.entries(sectionData).map(([rowLabel, rowSeats]) => (
                          <div key={rowLabel} className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 w-4 text-right shrink-0">
                              {rowLabel}
                            </span>
                            <div className="flex gap-0.5 flex-wrap">
                              {rowSeats.map((seat) => {
                                const avail      = seat.status === "available";
                                const isSelected = selected?.seatId === seat.seatId;
                                const isPopup    = popup?.seatId    === seat.seatId;

                                return (
                                  <button
                                    key={seat.seatId}
                                    disabled={!avail}
                                    onClick={() => handleSeatClick(seat)}
                                    title={avail ? `Row ${seat.rowNo} Seat ${seat.seatNo} · $${seat.basePrice}` : "Unavailable"}
                                    className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition
                                      ${!avail
                                        ? "border-2 border-gray-300 bg-white cursor-not-allowed"
                                        : isSelected || isPopup
                                        ? `bg-gray-900 text-white ring-2 ${cfg?.ring ?? ""} ring-offset-1 scale-110`
                                        : `${cfg?.color ?? "bg-gray-300"} text-white hover:scale-110 hover:brightness-110`
                                      }`}
                                  >
                                    {showNumbers && avail ? seat.seatNo : ""}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-xs text-gray-400 w-4 shrink-0">
                              {rowLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Stage */}
            <div className="flex justify-center mt-4 mb-10">
              <div className="bg-gray-200 text-gray-500 text-xs font-bold tracking-widest uppercase px-24 py-3 rounded">
                STAGE
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Seat popup ──────────────────────────────────────────── */}
      {popup && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/20"
          onClick={() => setPopup(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-sm p-6 mx-4 mb-0 md:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-xs font-bold tracking-widest text-gray-500 uppercase mb-3">
              Click to Purchase
            </p>
            <p className="text-center text-sm font-semibold text-gray-700 mb-4">
              Price Level: <span className="text-orange-500">${popup.basePrice}</span>
            </p>
            <div className="grid grid-cols-2 divide-x border rounded-lg mb-4">
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Row</p>
                <p className="font-bold text-gray-800">{popup.rowNo}</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Seat</p>
                <p className="font-bold text-gray-800">{popup.seatNo}</p>
              </div>
            </div>
            <div className="flex justify-between items-center border-t pt-4 mb-5">
              <span className="text-sm font-medium text-gray-700">Adult</span>
              <span className="text-sm font-semibold text-gray-800">${popup.basePrice}.00</span>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition"
            >
              Continue to Checkout →
            </button>
            <button
              onClick={() => setPopup(null)}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
