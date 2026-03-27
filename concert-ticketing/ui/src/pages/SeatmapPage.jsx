import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getSeatmap } from "../api";
import { ChevronLeft, RefreshCw, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useCart } from "../context/CartContext";

const TIERS = {
  VIP:  { color: "bg-[#6a001a]", ring: "ring-[#6a001a]", dot: "bg-[#6a001a]", label: "VIP",   price: 288 },
  CAT1: { color: "bg-teal-400",   ring: "ring-teal-600",   dot: "bg-teal-400",   label: "CAT 1", price: 188 },
  CAT2: { color: "bg-violet-400", ring: "ring-violet-600", dot: "bg-violet-400", label: "CAT 2", price: 128 },
  CAT3: { color: "bg-blue-400",   ring: "ring-blue-600",   dot: "bg-blue-400",   label: "CAT 3", price: 68  },
};

const LAYOUT = [
  { sectionNo: 6, layoutRow: 1, layoutCol: 1 },
  { sectionNo: 7, layoutRow: 1, layoutCol: 3 },
  { sectionNo: 4, layoutRow: 2, layoutCol: 1 },
  { sectionNo: 5, layoutRow: 2, layoutCol: 3 },
  { sectionNo: 2, layoutRow: 3, layoutCol: 1 },
  { sectionNo: 1, layoutRow: 3, layoutCol: 2 },
  { sectionNo: 3, layoutRow: 3, layoutCol: 3 },
];

const FEE = 2; // booking fee per seat

export default function SeatmapPage() {
  const { eventId }    = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const date           = searchParams.get("date");
  const time           = searchParams.get("time");

  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [visibleTiers,  setVisibleTiers]  = useState(new Set(Object.keys(TIERS)));
  const [showNumbers,   setShowNumbers]   = useState(true);

  const { addToCart } = useCart();

  // Flow state
  const [selectedSeats,   setSelectedSeats]   = useState([]);  // seats with tick
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [cartSeats,       setCartSeats]       = useState([]);  // confirmed through modal
  const [cartBarExpanded, setCartBarExpanded] = useState(false);

  const inCartBar = cartSeats.length > 0;
  const cartTotal = cartSeats.reduce((s, seat) => s + seat.basePrice + FEE, 0);

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
    if (seat.status !== "available" || inCartBar) return;
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.seatId === seat.seatId);
      return exists ? prev.filter((s) => s.seatId !== seat.seatId) : [...prev, seat];
    });
  }

  function handleModalContinue() {
    if (selectedSeats.length === 0) return;
    setCartSeats(selectedSeats);
    setShowTicketModal(false);
  }

  function handleRemoveFromModal(seatId) {
    setSelectedSeats((prev) => prev.filter((s) => s.seatId !== seatId));
  }

  function handleRemoveFromCart(seatId) {
    const next = cartSeats.filter((s) => s.seatId !== seatId);
    if (next.length === 0) handleClearAll();
    else setCartSeats(next);
  }

  function handleClearAll() {
    setSelectedSeats([]);
    setCartSeats([]);
    setCartBarExpanded(false);
  }

  function handleAddToCart() {
    addToCart(cartSeats.map((seat) => ({ seat, event: data.event, date, time })));
    handleClearAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading seatmap...</div>;
  if (error)   return <div className="flex justify-center items-center h-64 text-red-400">{error}</div>;

  const { event, seats } = data;

  const bySection = seats.reduce((acc, s) => {
    if (!acc[s.sectionNo]) acc[s.sectionNo] = {};
    if (!acc[s.sectionNo][s.rowNo]) acc[s.sectionNo][s.rowNo] = [];
    acc[s.sectionNo][s.rowNo].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white pb-28">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#800020] transition mb-2"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">{event.name}</h1>
        {(date || time) && (
          <p className="text-sm text-gray-500 mt-0.5">{date}{time && ` · ${time}`}</p>
        )}
      </div>

      <div className="flex">

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="w-52 shrink-0 border-r px-4 py-6 hidden md:block">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-gray-700">Filter price</span>
            <button
              onClick={() => setVisibleTiers(new Set(Object.keys(TIERS)))}
              className="text-gray-400 hover:text-[#800020] transition"
              title="Reset"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            {Object.entries(TIERS).map(([tier, cfg]) => (
              <label key={tier} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleTiers.has(tier)}
                  onChange={() => toggleTier(tier)}
                  className="accent-[#800020] w-4 h-4"
                />
                <span className={`w-4 h-4 rounded-full ${cfg.dot} shrink-0`} />
                <span className="text-sm text-gray-700 flex-1">${cfg.price}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 text-xs mb-6">
            <button onClick={() => setVisibleTiers(new Set(Object.keys(TIERS)))} className="text-[#800020] hover:underline">Select All</button>
            <button onClick={() => setVisibleTiers(new Set())} className="text-[#800020] hover:underline">Clear All</button>
          </div>

          <div className="border-t pt-4 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">Map Key</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded-full bg-teal-400" /> Available
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center">
                  <Check size={8} strokeWidth={3} className="text-white" />
                </div> Selected
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white" /> Unavailable
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={() => setShowNumbers((v) => !v)}
              className="accent-[#800020] w-4 h-4"
            />
            <span className="text-xs text-gray-600">Display Seat Numbering</span>
          </label>
        </aside>

        {/* ── Seatmap ──────────────────────────────────────── */}
        <main className="flex-1 px-4 py-6 overflow-x-auto">
          <div className="min-w-fit mx-auto" style={{ maxWidth: 820 }}>
            {[1, 2, 3].map((layoutRow) => (
              <div key={layoutRow} className="flex justify-center gap-8 mb-6">
                {[1, 2, 3].map((layoutCol) => {
                  const def = LAYOUT.find((l) => l.layoutRow === layoutRow && l.layoutCol === layoutCol);
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
                            <span className="text-xs text-gray-400 w-4 text-right shrink-0">{rowLabel}</span>
                            <div className="flex gap-0.5">
                              {rowSeats.map((seat) => {
                                const avail      = seat.status === "available";
                                const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId)
                                                || cartSeats.some((s) => s.seatId === seat.seatId);
                                return (
                                  <button
                                    key={seat.seatId}
                                    disabled={!avail}
                                    onClick={() => handleSeatClick(seat)}
                                    title={avail ? `Row ${seat.rowNo} Seat ${seat.seatNo} · $${seat.basePrice}` : "Unavailable"}
                                    className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition
                                      ${!avail
                                        ? "border-2 border-gray-300 bg-white cursor-not-allowed"
                                        : isSelected
                                        ? `bg-gray-900 text-white ring-2 ${cfg?.ring ?? ""} ring-offset-1 scale-110`
                                        : `${cfg?.color ?? "bg-gray-300"} text-white hover:scale-110 hover:brightness-110`
                                      }`}
                                  >
                                    {isSelected
                                      ? <Check size={10} strokeWidth={3} />
                                      : (showNumbers && avail ? seat.seatNo : "")
                                    }
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-xs text-gray-400 w-4 shrink-0">{rowLabel}</span>
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
              <div className="bg-gray-200 text-gray-500 font-bold tracking-widest uppercase px-24 py-6 rounded text-lg">
                STAGE
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Ticket Types Modal ───────────────────────────────── */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gray-800 text-white text-center py-4 px-6">
              <p className="font-semibold text-sm">Select an option below and click 'Continue'</p>
            </div>
            <div className="p-6">
              {selectedSeats.map((seat) => (
                <div key={seat.seatId} className="mb-5">
                  <p className="text-sm text-gray-500 mb-2">
                    Info: <span className="font-semibold text-gray-800">${seat.basePrice}, {seat.rowNo}, {seat.seatNo}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <select className="flex-1 border rounded px-3 py-2 text-sm text-gray-700 bg-white">
                      <option>Adult  (Min: 1 Max: 99) – ${seat.basePrice}.00</option>
                    </select>
                    <button
                      onClick={() => handleRemoveFromModal(seat.seatId)}
                      className="text-sm text-gray-500 hover:text-red-500 underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4 mb-6">
                <p className="text-center text-sm font-semibold text-gray-700 mb-3">ALL</p>
                <select className="w-full border rounded px-3 py-2 text-sm text-gray-700 bg-white">
                  <option>Adult  (Min: 1 Max: 99) – ${selectedSeats[0]?.basePrice ?? 0}.00</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowTicketModal(false)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft size={14} /> Go Back
                </button>
                <button
                  onClick={handleModalContinue}
                  disabled={selectedSeats.length === 0}
                  className="px-8 py-2.5 bg-[#800020] hover:bg-[#6a001a] disabled:opacity-40 text-white font-semibold rounded-lg transition"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky bottom: "Click Here to Select Ticket Types" ── */}
      {!inCartBar && selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-end p-4">
          <button
            onClick={() => setShowTicketModal(true)}
            className="bg-[#800020] hover:bg-[#6a001a] text-white font-semibold px-8 py-4 rounded-lg shadow-xl transition text-sm"
          >
            Click Here to Select Ticket Types
          </button>
        </div>
      )}

      {/* ── Sticky bottom: cart bar ─────────────────────────── */}
      {inCartBar && (
        <div className="fixed bottom-0 left-0 right-0 z-30 shadow-2xl">
          {/* Expand/collapse bar */}
          <button
            onClick={() => setCartBarExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 bg-gray-100 border-t text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            <span>
              {cartSeats.length} Item{cartSeats.length > 1 ? "s" : ""} for ${cartTotal}.00{" "}
              <span className="font-normal text-gray-400">(Click to show/hide)</span>
            </span>
            {cartBarExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          {/* Expanded seat details */}
          {cartBarExpanded && (
            <div className="bg-white border-t px-6 py-2">
              <div className="flex justify-between text-xs font-bold text-gray-500 py-2 border-b">
                <span>Seat Info.</span>
                <span>Total</span>
              </div>
              {cartSeats.map((seat) => (
                <div key={seat.seatId} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="text-sm text-gray-700">1x ${seat.basePrice + FEE}</p>
                    <p className="text-xs text-gray-400">
                      Adult, Seat: {seat.rowNo}, {seat.seatNo}, ${seat.basePrice}.00 +${FEE}.00
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">${seat.basePrice + FEE}.00</span>
                    <button onClick={() => handleRemoveFromCart(seat.seatId)} className="text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-600 hover:text-[#800020] underline"
            >
              Continue shopping
            </button>
            <div className="flex items-center gap-4">
              <button onClick={handleClearAll} className="text-sm text-gray-600 hover:text-gray-800 underline">
                Clear Selection
              </button>
              <button
                onClick={handleAddToCart}
                className="px-8 py-2.5 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition text-sm"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
