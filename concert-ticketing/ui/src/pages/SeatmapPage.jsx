import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getSeatmap } from "../api";
import { ChevronLeft, Check, X, Calendar } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import LoginPromptModal from "../components/LoginPromptModal";

// ── Tier config ────────────────────────────────────────────────────────────────
const TIERS = {
  VIP:  { label: "VIP",   hex: "#6a001a", ring: "ring-[#6a001a]" },
  CAT1: { label: "CAT 1", hex: "#0d9488", ring: "ring-teal-600"  },
  CAT2: { label: "CAT 2", hex: "#7c3aed", ring: "ring-violet-600"},
  CAT3: { label: "CAT 3", hex: "#2563eb", ring: "ring-blue-600"  },
};

const FEE = 2;

// ── Venue sections ─────────────────────────────────────────────────────────────
const VENUE_SECTIONS = [
  { id:"308", label:"308", dataSection:6, x:2,   y:48,  w:64, h:50 },
  { id:"309", label:"309", dataSection:6, x:2,   y:100, w:64, h:50 },
  { id:"310", label:"310", dataSection:6, x:2,   y:152, w:64, h:50 },
  { id:"311", label:"311", dataSection:6, x:2,   y:204, w:64, h:50 },
  { id:"312", label:"312", dataSection:6, x:2,   y:256, w:64, h:50 },
  { id:"313", label:"313", dataSection:6, x:2,   y:308, w:64, h:50 },
  { id:"314", label:"314", dataSection:6, x:2,   y:360, w:64, h:50 },
  { id:"208", label:"208", dataSection:6, x:70,  y:5,   w:72, h:43 },
  { id:"209", label:"209", dataSection:6, x:70,  y:50,  w:72, h:43 },
  { id:"210", label:"210", dataSection:6, x:70,  y:95,  w:72, h:43 },
  { id:"211", label:"211", dataSection:6, x:70,  y:140, w:72, h:43 },
  { id:"212", label:"212", dataSection:6, x:70,  y:185, w:72, h:43 },
  { id:"213", label:"213", dataSection:6, x:70,  y:230, w:72, h:43 },
  { id:"214", label:"214", dataSection:6, x:70,  y:275, w:72, h:43 },
  { id:"215", label:"215", dataSection:6, x:70,  y:320, w:72, h:43 },
  { id:"216", label:"216", dataSection:6, x:70,  y:365, w:72, h:43 },
  { id:"217", label:"217", dataSection:6, x:70,  y:410, w:72, h:43 },
  { id:"STD_A", label:"STANDING\nPEN A", dataSection:4, x:147, y:67,  w:112, h:125, multiline:true },
  { id:"PA1",   label:"PA1",             dataSection:2, x:147, y:197, w:112, h:153 },
  { id:"PB1",   label:"PB1",             dataSection:1, x:263, y:197, w:174, h:153 },
  { id:"PC1",   label:"PC1",             dataSection:3, x:441, y:197, w:112, h:153 },
  { id:"STD_B", label:"STANDING\nPEN B", dataSection:5, x:441, y:67,  w:112, h:125, multiline:true },
  { id:"234", label:"234", dataSection:7, x:558, y:5,   w:72, h:43 },
  { id:"233", label:"233", dataSection:7, x:558, y:50,  w:72, h:43 },
  { id:"232", label:"232", dataSection:7, x:558, y:95,  w:72, h:43 },
  { id:"231", label:"231", dataSection:7, x:558, y:140, w:72, h:43 },
  { id:"230", label:"230", dataSection:7, x:558, y:185, w:72, h:43 },
  { id:"229", label:"229", dataSection:7, x:558, y:230, w:72, h:43 },
  { id:"228", label:"228", dataSection:7, x:558, y:275, w:72, h:43 },
  { id:"227", label:"227", dataSection:7, x:558, y:320, w:72, h:43 },
  { id:"226", label:"226", dataSection:7, x:558, y:365, w:72, h:43 },
  { id:"225", label:"225", dataSection:7, x:558, y:410, w:72, h:43 },
  { id:"334", label:"334", dataSection:7, x:634, y:48,  w:64, h:50 },
  { id:"333", label:"333", dataSection:7, x:634, y:100, w:64, h:50 },
  { id:"332", label:"332", dataSection:7, x:634, y:152, w:64, h:50 },
  { id:"331", label:"331", dataSection:7, x:634, y:204, w:64, h:50 },
  { id:"330", label:"330", dataSection:7, x:634, y:256, w:64, h:50 },
  { id:"329", label:"329", dataSection:7, x:634, y:308, w:64, h:50 },
  { id:"328", label:"328", dataSection:7, x:634, y:360, w:64, h:50 },
  { id:"218", label:"218", dataSection:6, x:152, y:457, w:55, h:52 },
  { id:"219", label:"219", dataSection:6, x:209, y:457, w:55, h:52 },
  { id:"220", label:"220", dataSection:6, x:266, y:457, w:55, h:52 },
  { id:"221", label:"221", dataSection:6, x:323, y:457, w:55, h:52 },
  { id:"222", label:"222", dataSection:7, x:380, y:457, w:55, h:52 },
  { id:"223", label:"223", dataSection:7, x:437, y:457, w:55, h:52 },
  { id:"224", label:"224", dataSection:7, x:494, y:457, w:55, h:52 },
  { id:"318", label:"318", dataSection:6, x:152, y:514, w:55, h:50 },
  { id:"319", label:"319", dataSection:6, x:209, y:514, w:55, h:50 },
  { id:"320", label:"320", dataSection:6, x:271, y:511, w:57, h:55 },
  { id:"322", label:"322", dataSection:7, x:372, y:511, w:57, h:55 },
  { id:"323", label:"323", dataSection:7, x:436, y:514, w:55, h:50 },
  { id:"324", label:"324", dataSection:7, x:493, y:514, w:55, h:50 },
];

// ── Arena SVG map ──────────────────────────────────────────────────────────────
function ArenaMap({ sections, bySection, activeTiers, selectedSectionId, onSectionClick }) {
  const [hoverId, setHoverId] = useState(null);

  return (
    <div className="flex justify-center px-4 py-6 bg-white">
      <svg viewBox="0 0 700 572" className="w-full" style={{ maxWidth: 700 }}>
        {/* Stage */}
        <rect x={175} y={5} width={350} height={62} fill="#111" rx={3} />
        <text x={350} y={43} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" letterSpacing={4}>STAGE</text>
        {/* Catwalk */}
        <rect x={263} y={67} width={174} height={126} fill="#111" rx={2} />

        {sections.map((sec) => {
          const allSeats  = Object.values(bySection[sec.dataSection] ?? {}).flat();
          const tier      = allSeats[0]?.tier;
          const cfg       = TIERS[tier];
          const hasData   = allSeats.length > 0;
          const filtered  = hasData && tier && !activeTiers.has(tier);
          const isActive  = selectedSectionId === sec.id;
          const isHover   = hoverId === sec.id;
          const clickable = hasData && !filtered;

          const fill   = !hasData ? "#e5e7eb" : filtered ? "#e5e7eb" : cfg?.hex ?? "#e5e7eb";
          const opac   = !hasData ? 0.5 : filtered ? 0.3 : isActive ? 1 : isHover ? 1 : 0.78;
          const stroke = isActive ? "white" : isHover ? "white" : "rgba(255,255,255,0.3)";
          const sw     = isActive ? 3 : isHover ? 2 : 1;
          const cx = sec.x + sec.w / 2;
          const cy = sec.y + sec.h / 2;
          const showPriceLabel = hasData && cfg && sec.w >= 80 && sec.h >= 60;

          return (
            <g
              key={sec.id}
              style={{ cursor: clickable ? "pointer" : "default" }}
              onClick={() => clickable && onSectionClick(sec)}
              onMouseEnter={() => clickable && setHoverId(sec.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h}
                fill={fill} rx={4} stroke={stroke} strokeWidth={sw} opacity={opac} />
              {sec.multiline ? (
                <>
                  <text x={cx} y={cy - 7} textAnchor="middle" fill="white" fontSize={9} fontWeight="600">STANDING</text>
                  <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={9} fontWeight="600">
                    PEN {sec.id === "STD_A" ? "A" : "B"}
                  </text>
                </>
              ) : showPriceLabel ? (
                <>
                  <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize={11} fontWeight="700">{cfg.label}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" fill="white" fontSize={10} fontWeight="400">${allSeats[0]?.price ?? allSeats[0]?.basePrice}</text>
                </>
              ) : (
                <text x={cx} y={cy + 4} textAnchor="middle" fill={hasData ? "white" : "#9ca3af"} fontSize={11} fontWeight="600">
                  {sec.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Seat grid panel (below map) ───────────────────────────────────────────────
function SeatGrid({ venueSection, sectionData, selectedSeat, onSeatClick }) {
  const allSeats  = Object.values(sectionData).flat();
  const tier      = allSeats[0]?.tier;
  const cfg       = TIERS[tier];
  const available = allSeats.filter((s) => s.status === "AVAILABLE" || s.status === "available").length;

  if (allSeats.length === 0) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-sm text-gray-400">No seats available in this section.</p>
      </div>
    );
  }

  const displayRows = Object.entries(sectionData);

  return (
    <div className="px-5 py-5">
      {/* Stage direction */}
      <div className="flex flex-col items-center mb-4">
        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Stage</div>
        <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: cfg?.hex ?? "#9ca3af", opacity: 0.4 }} />
        <div className="text-[10px] text-gray-400">▼ closer to stage</div>
      </div>

      {/* Section header */}
      <div className="mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg?.hex ?? "#9ca3af" }} />
          <span className="text-sm font-bold text-gray-900">Section {venueSection.label}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{cfg?.label} · ${allSeats[0]?.price ?? allSeats[0]?.basePrice} / seat · {available} available</p>
      </div>
      <p className="text-xs text-gray-400 mb-4">Select 1 seat to continue</p>

      {/* Seat grid */}
      <div className="overflow-x-auto">
        <div className="inline-block space-y-1.5">
          {displayRows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-5 text-right shrink-0">{rowLabel}</span>
              <div className="flex gap-1">
                {rowSeats.map((seat) => {
                  const avail      = seat.status === "AVAILABLE" || seat.status === "available";
                  const isSelected = selectedSeat?.seatId === seat.seatId;
                  return (
                    <button
                      key={seat.seatId}
                      disabled={!avail}
                      onClick={() => onSeatClick(seat)}
                      title={`Row ${seat.rowNo}, Seat ${seat.seatNo} · $${seat.price ?? seat.basePrice}`}
                      className={`w-7 h-7 rounded-sm text-[9px] font-bold flex items-center justify-center transition-all
                        ${!avail
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : isSelected
                          ? "bg-gray-900 text-white scale-110 shadow-md"
                          : "text-white hover:scale-110 hover:brightness-110 cursor-pointer"
                        }`}
                      style={avail && !isSelected ? { backgroundColor: cfg?.hex ?? "#9ca3af" } : {}}
                    >
                      {isSelected ? <Check size={10} strokeWidth={3} /> : seat.seatNo}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-gray-400 w-5 shrink-0">{rowLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bottom sheet (appears when a seat is selected) ────────────────────────────
function SeatBottomSheet({ seat, tierCfg, onClear, onCheckout }) {
  const total = (seat.price ?? seat.basePrice) + FEE;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl">
      {/* Summary bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tierCfg?.hex ?? "#9ca3af" }} />
            <span className="text-sm font-bold text-gray-900">
              {tierCfg?.label} · Row {seat.rowNo}, Seat {seat.seatNo}
            </span>
          </div>
          <p className="text-xs text-gray-500 ml-4">
            ${seat.price ?? seat.basePrice} + ${FEE} booking fee = <span className="font-semibold text-gray-800">${total}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <X size={14} /> Clear
          </button>
          <button
            onClick={onCheckout}
            className="px-6 py-2.5 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition text-sm"
          >
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SeatmapPage() {
  const { eventId }        = useParams();
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const date               = searchParams.get("date");
  const time               = searchParams.get("time");

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeTiers,  setActiveTiers]  = useState(new Set(Object.keys(TIERS)));
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showLoginModal, setShowLoginModal]   = useState(false);
  const seatGridRef = useRef(null);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(0);

  const onDragStart = useCallback((e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidth;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current) return;
      setSidebarWidth(Math.min(360, Math.max(160, dragStartW.current + e.clientX - dragStartX.current)));
    }
    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    getSeatmap(eventId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  function handleSectionClick(sec) {
    setSelectedSection(sec);
    setSelectedSeat(null);
    setTimeout(() => seatGridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function handleSeatClick(seat) {
    // Clicking the same seat deselects; clicking a new seat replaces selection
    setSelectedSeat((prev) => prev?.seatId === seat.seatId ? null : seat);
  }

  function handleClear() {
    setSelectedSeat(null);
  }

  function handleProceedToCheckout() {
    if (!isAuthenticated) {
      // Persist the selected seat so we can restore it after login
      sessionStorage.setItem("pendingSeat", JSON.stringify(selectedSeat));
      setShowLoginModal(true);
      return;
    }
    addToCart([{ seat: selectedSeat, event: data.event, date, time }]);
    navigate("/checkout");
  }

  // After returning from login, auto-proceed if there's a pending seat
  useEffect(() => {
    if (!isAuthenticated || !data) return;
    const raw = sessionStorage.getItem("pendingSeat");
    if (!raw) return;
    sessionStorage.removeItem("pendingSeat");
    try {
      const seat = JSON.parse(raw);
      addToCart([{ seat, event: data.event, date, time }]);
      navigate("/checkout");
    } catch {
      // ignore malformed data
    }
  }, [isAuthenticated, data]);

  function toggleTier(tier) {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  }

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading seat map...</div>;
  if (error)   return <div className="flex justify-center items-center h-64 text-red-400">{error}</div>;

  const { event, seats } = data;

  const bySection = seats.reduce((acc, s) => {
    if (!acc[s.sectionNo]) acc[s.sectionNo] = {};
    if (!acc[s.sectionNo][s.rowNo]) acc[s.sectionNo][s.rowNo] = [];
    acc[s.sectionNo][s.rowNo].push(s);
    return acc;
  }, {});

  // Determine which tiers actually have data (for the filter buttons)
  const tiersWithData = new Set(seats.map((s) => s.tier).filter(Boolean));

  // Selected seat's tier config
  const selectedTierCfg = selectedSeat ? TIERS[selectedSeat.tier] : null;

  return (
    <div className="min-h-screen bg-white pb-20">
      <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#800020] transition mb-1"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <h1 className="text-base font-bold text-gray-900">{event.name}</h1>
        {(date || time) && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Calendar size={11} /> {date}{time && ` · ${time}`}
          </p>
        )}
      </div>

      <div className="flex">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside style={{ width: sidebarWidth }} className="relative shrink-0 border-r hidden md:block">
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#800020]/20 z-10"
          />

          <div className="px-4 py-5 space-y-6">

            {/* Date & Time — read only */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date &amp; Time</p>
              {date && <p className="text-sm text-gray-800">{date}</p>}
              {time && <p className="text-sm text-gray-500">{time}</p>}
            </div>

            {/* Category filter — pill buttons */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by Category</p>
              <div className="flex flex-col gap-2">
                {Object.entries(TIERS).map(([tier, cfg]) => {
                  const hasData = tiersWithData.has(tier);
                  const active  = activeTiers.has(tier);
                  return (
                    <button
                      key={tier}
                      disabled={!hasData}
                      onClick={() => toggleTier(tier)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition
                        ${!hasData
                          ? "border-gray-200 text-gray-300 cursor-not-allowed bg-white"
                          : active
                          ? "border-transparent text-white"
                          : "border-gray-300 text-gray-500 bg-white hover:border-gray-400"
                        }`}
                      style={hasData && active ? { backgroundColor: cfg.hex, borderColor: cfg.hex } : {}}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hasData ? cfg.hex : "#e5e7eb" }} />
                      {cfg.label}
                      {hasData && (
                        <span className="ml-auto text-xs opacity-80">
                          ${seats.find((s) => s.tier === tier)?.price ?? seats.find((s) => s.tier === tier)?.basePrice}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map key */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Map Key</p>
              <div className="space-y-2.5">
                {/* Tier colours */}
                {Object.entries(TIERS).map(([tier, cfg]) => (
                  <div key={tier} className="flex items-center gap-2.5 text-xs text-gray-600">
                    <div className="w-5 h-5 rounded-sm shrink-0" style={{ backgroundColor: cfg.hex }} />
                    {cfg.label} — ${seats?.find((s) => s.tier === tier)?.price ?? seats?.find((s) => s.tier === tier)?.basePrice ?? cfg.price ?? ""}
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <div className="w-5 h-5 rounded-sm bg-gray-900 shrink-0 flex items-center justify-center">
                      <Check size={9} strokeWidth={3} className="text-white" />
                    </div>
                    Selected
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <div className="w-5 h-5 rounded-sm bg-gray-200 border border-gray-300 shrink-0" />
                    Unavailable / Sold out
                  </div>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* ── Main area ─────────────────────────────────────────────── */}
        <main className="flex-1 flex overflow-auto">
          {/* Arena map — takes remaining space */}
          <div className="flex-1 min-w-0">
            <ArenaMap
              sections={VENUE_SECTIONS}
              bySection={bySection}
              activeTiers={activeTiers}
              selectedSectionId={selectedSection?.id ?? null}
              onSectionClick={handleSectionClick}
            />
          </div>

          {/* Seat grid panel — fixed width, beside the map */}
          <div
            ref={seatGridRef}
            className={`shrink-0 border-l bg-gray-50 overflow-y-auto transition-all duration-300 ${selectedSection ? "w-80" : "w-0 overflow-hidden border-0"}`}
          >
            {selectedSection && (
              <SeatGrid
                venueSection={selectedSection}
                sectionData={bySection[selectedSection.dataSection] ?? {}}
                selectedSeat={selectedSeat}
                onSeatClick={handleSeatClick}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── Bottom sheet — appears when seat is selected ─────────── */}
      {selectedSeat && (
        <SeatBottomSheet
          seat={selectedSeat}
          tierCfg={selectedTierCfg}
          onClear={handleClear}
          onCheckout={handleProceedToCheckout}
        />
      )}
    </div>
  );
}
