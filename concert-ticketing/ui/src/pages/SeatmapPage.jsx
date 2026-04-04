import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getSeatmap, holdSeat, releaseHold } from "../api";
import { ChevronLeft, RefreshCw, Check, ChevronDown, ChevronUp, X, Calendar, Ticket } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import LoginPromptModal from "../components/LoginPromptModal";
import { VENUE_SECTIONS_MAP } from "../mock/venueData";

const TIERS = {
  VIP:  { color: "bg-[#6a001a]", ring: "ring-[#6a001a]", dot: "bg-[#6a001a]", label: "VIP",   price: 288, hex: "#6a001a" },
  CAT1: { color: "bg-teal-400",  ring: "ring-teal-600",  dot: "bg-teal-400",  label: "CAT 1", price: 188, hex: "#2dd4bf" },
  CAT2: { color: "bg-violet-400",ring: "ring-violet-600",dot: "bg-violet-400",label: "CAT 2", price: 128, hex: "#a78bfa" },
  CAT3: { color: "bg-blue-400",  ring: "ring-blue-600",  dot: "bg-blue-400",  label: "CAT 3", price: 68,  hex: "#93c5fd" },
};

// ── Venue section definitions are imported from venueData.js ──────────────────


const FEE = 2;

// ── Venue SVG map ──────────────────────────────────────────────────────────────
// Renders the stage decoration appropriate for each venue, then the section blocks.

function VenueStage({ venueName }) {
  switch (venueName) {
    case "Singapore Indoor Stadium":
      // Stage top center, rectangular
      return (
        <>
          <rect x={200} y={5} width={202} height={58} fill="#111" rx={3} />
          <text x={301} y={40} textAnchor="middle" fill="white" fontSize={18} fontWeight="bold" letterSpacing={3}>STAGE</text>
        </>
      );
    case "Arena @ EXPO":
      // Stage on the left side, rotated rect
      return (
        <>
          <rect x={5} y={100} width={82} height={260} fill="#111" rx={3} />
          <text x={46} y={245} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold"
            transform="rotate(-90 46 245)" letterSpacing={2}>STAGE</text>
        </>
      );
    case "Mediacorp Theatre":
      // Stage diagonal top-left
      return (
        <>
          <rect x={18} y={8} width={138} height={36} fill="#111" rx={3}
            transform="rotate(-12 18 8)" />
          <text x={87} y={30} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold"
            transform="rotate(-12 87 30)" letterSpacing={2}>STAGE</text>
        </>
      );
    case "Capitol Theatre":
      // Stage diagonal top-left (same style as Mediacorp)
      return (
        <>
          <rect x={18} y={8} width={138} height={36} fill="#111" rx={3}
            transform="rotate(-12 18 8)" />
          <text x={87} y={30} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold"
            transform="rotate(-12 87 30)" letterSpacing={2}>STAGE</text>
        </>
      );
    // Singapore National Stadium and The Star Theatre: same semicircular arena layout
    default:
      return (
        <>
          {/* Stage main */}
          <rect x={175} y={5} width={350} height={62} fill="#111" rx={3} />
          <text x={350} y={43} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" letterSpacing={4}>
            STAGE
          </text>
          {/* Catwalk */}
          <rect x={263} y={67} width={174} height={126} fill="#111" rx={2} />
        </>
      );
  }
}

function VenueMap({ venueName, sections, bySection, visibleTiers, selectedId, onSectionClick }) {
  const [hoverId, setHoverId] = useState(null);

  // Pick the section list: prefer the explicit `sections` prop (from dynSections),
  // otherwise fall back to the static map keyed by venueName.
  const resolvedSections = sections ?? VENUE_SECTIONS_MAP[venueName] ?? VENUE_SECTIONS_MAP["Singapore National Stadium"];

  return (
    <div className="flex justify-center px-4 py-4 bg-white">
      <svg
        viewBox="0 0 700 572"
        className="w-full"
        style={{ maxWidth: 700, maxHeight: 560 }}
      >
        <VenueStage venueName={venueName} />

        {/* Section blocks */}
        {resolvedSections.map((sec) => {
          const rows       = bySection[sec.dataSection] ?? {};
          const allSeats   = Object.values(rows).flat();
          const tier       = allSeats[0]?.tier;
          const cfg        = TIERS[tier];
          const adminHidden = sec.hidden === true;
          const tierHidden  = tier && !visibleTiers.has(tier);
          const hidden      = adminHidden || tierHidden;
          const isActive    = selectedId === sec.id;
          const isHover     = hoverId === sec.id;

          const fill   = adminHidden ? "#9ca3af" : (cfg?.hex ?? "#93c5fd");
          const stroke = isActive ? "#1e40af" : isHover ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)";
          const sw     = isActive ? 2.5 : 1;
          const opac   = adminHidden ? 0.4 : tierHidden ? 0.25 : isActive ? 1 : isHover ? 0.95 : 0.78;

          const cx = sec.x + sec.w / 2;
          const cy = sec.y + sec.h / 2;

          return (
            <g
              key={sec.id}
              style={{ cursor: hidden ? "default" : "pointer" }}
              onClick={() => !hidden && onSectionClick(sec)}
              onMouseEnter={() => !hidden && setHoverId(sec.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h}
                fill={fill} rx={4} stroke={stroke} strokeWidth={sw} opacity={opac} />
              {sec.multiline ? (
                <>
                  {sec.label.split("\n").map((line, i, arr) => (
                    <text
                      key={i}
                      x={cx}
                      y={cy + (i - (arr.length - 1) / 2) * 12}
                      textAnchor="middle"
                      fill="white"
                      fontSize={9}
                      fontWeight="600"
                    >{line}</text>
                  ))}
                </>
              ) : (
                <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={11} fontWeight="600">
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

// ── Standing Pen (GA) panel ───────────────────────────────────────────────────
function StandingPenPanel({ venueSection, sectionData, cartSeats, onGAAddToCart }) {
  const [qty, setQty] = useState(1);

  const cfg     = TIERS["CAT2"];
  const penName = venueSection.id === "STD_A" ? "Standing Pen A" : "Standing Pen B";

  const alreadyInCart = cartSeats.filter(
    (c) => Object.values(sectionData).flat().some((s) => s.seatId === c.seatId)
  ).length;

  const available = Object.values(sectionData).flat().filter(
    (s) => s.status === "available" && !cartSeats.some((c) => c.seatId === s.seatId)
  );

  function handleAdd() {
    const picks = available.slice(0, qty);
    if (picks.length > 0) onGAAddToCart(picks);
  }

  return (
    <div className="border-t bg-gray-50 px-6 py-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
        <span className="text-sm font-bold text-gray-900">{penName}</span>
        <span className="text-xs text-gray-500">General Admission · ${cfg.price} / person · {available.length} spots left</span>
        {alreadyInCart > 0 && (
          <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
            {alreadyInCart} in cart
          </span>
        )}
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-violet-800 mb-1 text-center">General Admission — No Fixed Seating</p>
        <p className="text-xs text-violet-500 mb-4 text-center">Unreserved. Entry is first-come, first-served.</p>

        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <select
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="appearance-none border border-violet-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-7 focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              {Array.from({ length: Math.min(10, available.length) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "ticket" : "tickets"}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <span className="text-sm font-semibold text-violet-900">${cfg.price * qty}.00 total</span>
          <button
            onClick={handleAdd}
            disabled={available.length === 0}
            className="px-5 py-2 bg-[#800020] hover:bg-[#6a001a] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Seat detail panel (shown below map) ──────────────────────────────────────
function SectionDetail({ venueSection, sectionData, selectedSeats, cartSeats, inCartBar, showNumbers, onSeatClick }) {
  const allSeats  = Object.values(sectionData).flat();
  const tier      = allSeats[0]?.tier;
  const cfg       = TIERS[tier];
  const available = allSeats.filter((s) => s.status === "available").length;

  // Proportional row/col limits based on section's pixel size on the map (min 5 rows)
  const targetCols = Math.max(3, Math.round(venueSection.w / 8));
  const targetRows = Math.max(5, Math.round(venueSection.h / 16));

  const displayRows = Object.entries(sectionData).slice(0, targetRows);

  return (
    <div className="border-t bg-gray-50 px-6 py-5">
      {/* Panel header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg?.hex ?? "#93c5fd" }} />
        <div>
          <span className="text-sm font-bold text-gray-900">
            Section {venueSection.label.replace(/\n/, " ")}
          </span>
          {cfg && (
            <span className="ml-2 text-xs text-gray-500">
              {cfg.label} · ${cfg.price} / seat · {available} available
            </span>
          )}
        </div>
      </div>

      {/* Seat grid — proportional to section size */}
      <div className="overflow-x-auto pt-2 pb-7">
        <div className="inline-block">
          {displayRows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-1 mb-1.5">
              <span className="text-[10px] text-gray-400 w-5 text-right shrink-0 font-medium">{rowLabel}</span>
              <div className="flex gap-1">
                {rowSeats.slice(0, targetCols).map((seat) => {
                  const avail      = seat.status === "available";
                  const onHold     = seat.status === "on_hold";
                  const isSelected =
                    selectedSeats.some((s) => s.seatId === seat.seatId) ||
                    cartSeats.some((s) => s.seatId === seat.seatId);
                  const tooltipLabel = isSelected ? "Selected" : avail ? "Available" : onHold ? "On Hold" : "Unavailable";
                  return (
                    <div key={seat.seatId} className="relative group">
                      <button
                        disabled={!avail || (inCartBar && !isSelected)}
                        onClick={() => onSeatClick(seat)}
                        className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center transition-all
                          ${isSelected
                            ? `bg-gray-900 text-white ring-2 ${cfg?.ring ?? ""} ring-offset-1 scale-110`
                            : avail
                            ? "bg-green-400 text-white hover:scale-110 hover:brightness-110 cursor-pointer"
                            : onHold
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "bg-red-400 text-white cursor-not-allowed"
                          }`}
                      >
                        {isSelected
                          ? <Check size={10} strokeWidth={3} />
                          : (showNumbers || !avail) ? seat.seatNo : ""}
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 transition-opacity">
                        {tooltipLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] text-gray-400 w-5 shrink-0 font-medium">{rowLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SeatmapPage() {
  const { eventId }                     = useParams();
  const navigate                        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const date                            = searchParams.get("date");
  const time                            = searchParams.get("time");

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [visibleTiers, setVisibleTiers] = useState(new Set(Object.keys(TIERS)));
  const [showNumbers,  setShowNumbers]  = useState(true);

  // Sidebar filters
  const [sidebarDate,  setSidebarDate]  = useState(date || "");
  const [sidebarTime,  setSidebarTime]  = useState(time || "");
  const [quantity,     setQuantity]     = useState(1);
  const [dateTimeOpen, setDateTimeOpen] = useState(true);
  const [quantityOpen, setQuantityOpen] = useState(true);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const onDragStart = useCallback((e) => {
    isDragging.current  = true;
    dragStartX.current  = e.clientX;
    dragStartW.current  = sidebarWidth;
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      setSidebarWidth(Math.min(400, Math.max(160, dragStartW.current + delta)));
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current            = false;
      document.body.style.cursor    = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  // Currently selected visual section (null = none selected yet)
  const [selectedVenueSection, setSelectedVenueSection] = useState(null);
  const seatPanelRef = useRef(null);

  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [selectedSeats,   setSelectedSeats]   = useState([]);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [modalError,      setModalError]      = useState(null);
  const [cartSeats,       setCartSeats]       = useState([]);
  const [cartBarExpanded, setCartBarExpanded] = useState(false);

  const inCartBar = cartSeats.length > 0;
  const cartTotal = cartSeats.reduce((s, seat) => s + seat.basePrice + FEE, 0);

  const refreshSeatmap = useCallback(() => {
    getSeatmap(eventId).then(setData).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    getSeatmap(eventId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const interval = setInterval(refreshSeatmap, 30_000);
    return () => clearInterval(interval);
  }, [eventId, refreshSeatmap]);

  function handleDateChange(newDate) {
    setSidebarDate(newDate);
    setSidebarTime("");
    setSearchParams({ date: newDate });
  }

  function handleTimeChange(newTime) {
    setSidebarTime(newTime);
    setSearchParams({ date: sidebarDate, time: newTime });
  }

  function toggleTier(tier) {
    setVisibleTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  }

  function handleSectionClick(venueSection) {
    setSelectedVenueSection((prev) => prev?.id === venueSection.id ? null : venueSection);
    setTimeout(() => seatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function handleSeatClick(seat) {
    if (seat.status !== "available" || inCartBar) return;
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.seatId === seat.seatId);
      return exists ? prev.filter((s) => s.seatId !== seat.seatId) : [...prev, seat];
    });
  }

  async function handleModalContinue() {
    if (selectedSeats.length === 0) return;
    const fresh = await getSeatmap(eventId);
    setData(fresh);
    const freshById = new Map(fresh.seats.map((s) => [s.seatId, s]));
    const taken = selectedSeats.filter((s) => freshById.get(s.seatId)?.status !== "available");
    if (taken.length > 0) {
      setSelectedSeats((prev) => prev.filter((s) => !taken.some((t) => t.seatId === s.seatId)));
      setModalError(
        `${taken.length} seat${taken.length > 1 ? "s have" : " has"} just been taken by another user and removed from your selection. Please choose different seats.`
      );
      return;
    }
    setModalError(null);
    selectedSeats.forEach((s) => holdSeat(eventId, s.seatId));
    setCartSeats(selectedSeats);
    setShowTicketModal(false);
    refreshSeatmap();
  }

  function handleRemoveFromModal(seatId) {
    setSelectedSeats((prev) => prev.filter((s) => s.seatId !== seatId));
  }

  function handleRemoveFromCart(seatId) {
    releaseHold(eventId, seatId);
    const next = cartSeats.filter((s) => s.seatId !== seatId);
    if (next.length === 0) handleClearAll();
    else { setCartSeats(next); refreshSeatmap(); }
  }

  function handleClearAll() {
    cartSeats.forEach((s) => releaseHold(eventId, s.seatId));
    setSelectedSeats([]);
    setCartSeats([]);
    setCartBarExpanded(false);
    refreshSeatmap();
  }

  function handleAddToCart() {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    addToCart(cartSeats.map((seat) => ({ seat, event: data.event, date, time })));
    handleClearAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleGAAddToCart(seats) {
    // GA: auto-picked seats go straight into the cart bar (skip ticket modal)
    setCartSeats((prev) => {
      const existingIds = new Set(prev.map((s) => s.seatId));
      const fresh = seats.filter((s) => !existingIds.has(s.seatId));
      fresh.forEach((s) => holdSeat(eventId, s.seatId));
      if (fresh.length > 0) refreshSeatmap();
      return [...prev, ...fresh];
    });
  }

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading seatmap...</div>;
  if (error)   return <div className="flex justify-center items-center h-64 text-red-400">{error}</div>;

  const { event, seats, visualSections: dynSections } = data;
  // dynSections comes from the backend for admin-overridden layouts;
  // if absent, VenueMap resolves the right layout from VENUE_SECTIONS_MAP via venueName.
  const activeVenueSections = dynSections ?? null;

  const bySection = seats.reduce((acc, s) => {
    if (!acc[s.sectionNo]) acc[s.sectionNo] = {};
    if (!acc[s.sectionNo][s.rowNo]) acc[s.sectionNo][s.rowNo] = [];
    acc[s.sectionNo][s.rowNo].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white pb-28">
      <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* ── Header ─────────────────────────────────────────────── */}
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

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside style={{ width: sidebarWidth }} className="relative shrink-0 border-r hidden md:block">
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#800020]/20 transition-colors z-10"
          />

          {/* Date & Time */}
          <div className="border-b">
            <button
              onClick={() => setDateTimeOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="flex items-center gap-2"><Calendar size={14} /> Date &amp; Time</span>
              {dateTimeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {dateTimeOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div className="relative">
                  <select
                    value={sidebarDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  >
                    <option value="">All Dates</option>
                    {event.dates.map((d) => (
                      <option key={d.dateId} value={d.dateId}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {sidebarDate && (() => {
                  const dateObj = event.dates.find((d) => d.dateId === sidebarDate);
                  return dateObj ? (
                    <div className="relative">
                      <select
                        value={sidebarTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-[#800020]"
                      >
                        <option value="">Any Time</option>
                        {dateObj.times.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="border-b">
            <button
              onClick={() => setQuantityOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="flex items-center gap-2"><Ticket size={14} /> Quantity</span>
              {quantityOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {quantityOpen && (
              <div className="px-4 pb-4">
                <div className="relative">
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  >
                    <option value={0}>Any Quantity</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "Ticket" : "Tickets"}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Filter Price */}
          <div className="px-4 py-4">
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
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                  <span className="text-sm text-gray-700 flex-1">{cfg.label} · ${cfg.price}</span>
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
                  <div className="w-4 h-4 rounded-full bg-green-400" /> Available
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-gray-400" /> On Hold
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-red-400" /> Unavailable
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center">
                    <Check size={8} strokeWidth={3} className="text-white" />
                  </div> Selected
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
          </div>
        </aside>

        {/* ── Main area ────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          <VenueMap
            venueName={event.venueName}
            sections={activeVenueSections}
            bySection={bySection}
            visibleTiers={visibleTiers}
            selectedId={selectedVenueSection?.id ?? null}
            onSectionClick={handleSectionClick}
          />

          {/* Seat detail panel — appears below the map when a section is selected */}
          <div ref={seatPanelRef}>
            {selectedVenueSection && (
              selectedVenueSection.id === "STD_A" || selectedVenueSection.id === "STD_B"
                ? <StandingPenPanel
                    venueSection={selectedVenueSection}
                    sectionData={bySection[selectedVenueSection.dataSection] ?? {}}
                    cartSeats={cartSeats}
                    onGAAddToCart={handleGAAddToCart}
                  />
                : <SectionDetail
                    venueSection={selectedVenueSection}
                    sectionData={bySection[selectedVenueSection.dataSection] ?? {}}
                    selectedSeats={selectedSeats}
                    cartSeats={cartSeats}
                    inCartBar={inCartBar}
                    showNumbers={showNumbers}
                    onSeatClick={handleSeatClick}
                  />
            )}
          </div>
        </main>
      </div>

      {/* ── Ticket Types Modal ───────────────────────────────────── */}
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
                      <option>Adult (Min: 1 Max: 99) – ${seat.basePrice}.00</option>
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
                  <option>Adult (Min: 1 Max: 99) – ${selectedSeats[0]?.basePrice ?? 0}.00</option>
                </select>
              </div>
              {modalError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {modalError}
                </div>
              )}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => { setShowTicketModal(false); setModalError(null); }}
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

      {/* ── "Select Ticket Types" sticky button ─────────────────── */}
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

      {/* ── Cart bar ────────────────────────────────────────────── */}
      {inCartBar && (
        <div className="fixed bottom-0 left-0 right-0 z-30 shadow-2xl">
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
          {cartBarExpanded && (
            <div className="bg-white border-t px-6 py-2">
              <div className="flex justify-between text-xs font-bold text-gray-500 py-2 border-b">
                <span>Seat Info.</span><span>Total</span>
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
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t">
            <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-[#800020] underline">
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
