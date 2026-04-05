import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getSeatmap } from "../api";
import { ChevronLeft, Check, X, Calendar } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import LoginPromptModal from "../components/LoginPromptModal";
import { DEFAULT_ARENA_SECTIONS, getFixedVenueSections } from "../seatmapLayouts";

// ── Tier config ────────────────────────────────────────────────────────────────
const TIERS = {
  VIP:  { label: "VIP",   hex: "#6a001a", ring: "ring-[#6a001a]" },
  CAT1: { label: "CAT 1", hex: "#0d9488", ring: "ring-teal-600"  },
  CAT2: { label: "CAT 2", hex: "#7c3aed", ring: "ring-violet-600"},
  CAT3: { label: "CAT 3", hex: "#2563eb", ring: "ring-blue-600"  },
};

const FEE = 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSectionBounds(section) {
  if (section.shape === "polygon") {
    const xs = section.pts.map(([x]) => x);
    const ys = section.pts.map(([, y]) => y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  return {
    minX: section.x,
    maxX: section.x + section.w,
    minY: section.y,
    maxY: section.y + section.h,
    width: section.w,
    height: section.h,
  };
}

function getSectionArea(section) {
  if (section.shape === "polygon") {
    const points = section.pts ?? [];
    if (points.length < 3) return 0;

    let sum = 0;
    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[(index + 1) % points.length];
      sum += (x1 * y2) - (x2 * y1);
    }
    return Math.abs(sum) / 2;
  }

  return (section.w ?? 0) * (section.h ?? 0);
}

function allocateCounts(total, weights) {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);

  const safeWeights = weights.map((weight) => Math.max(weight, 0));
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    const base = Math.floor(total / weights.length);
    const remainder = total % weights.length;
    return weights.map((_, index) => base + (index < remainder ? 1 : 0));
  }

  const raw = safeWeights.map((weight) => (weight / totalWeight) * total);
  const counts = raw.map((value) => Math.floor(value));
  let remaining = total - counts.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - counts[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let index = 0; index < order.length && remaining > 0; index += 1) {
    counts[order[index].index] += 1;
    remaining -= 1;
  }

  return counts;
}

function buildSectionSeatPools(sections, seats) {
  const groupedSeats = new Map();
  const groupedSections = new Map();

  seats.forEach((seat) => {
    const key = String(seat.sectionNo);
    const group = groupedSeats.get(key) ?? [];
    group.push(seat);
    groupedSeats.set(key, group);
  });

  sections.forEach((section) => {
    const key = String(section.dataSection);
    const group = groupedSections.get(key) ?? [];
    group.push(section);
    groupedSections.set(key, group);
  });

  const pools = {};

  groupedSections.forEach((groupSections, key) => {
    const sectionSeats = (groupedSeats.get(key) ?? [])
      .slice()
      .sort((a, b) => {
        if (a.rowNo !== b.rowNo) return Number(a.rowNo) - Number(b.rowNo);
        return Number(a.seatNo) - Number(b.seatNo);
      });

    if (groupSections.length === 1) {
      pools[groupSections[0].id] = sectionSeats;
      return;
    }

    const orderedSections = groupSections
      .slice()
      .sort((a, b) => {
        const boundsA = getSectionBounds(a);
        const boundsB = getSectionBounds(b);
        if (boundsA.minY !== boundsB.minY) return boundsA.minY - boundsB.minY;
        return boundsA.minX - boundsB.minX;
      });

    const counts = allocateCounts(
      sectionSeats.length,
      orderedSections.map((section) => getSectionArea(section))
    );

    let cursor = 0;
    orderedSections.forEach((section, index) => {
      const count = counts[index] ?? 0;
      pools[section.id] = sectionSeats.slice(cursor, cursor + count);
      cursor += count;
    });
  });

  sections.forEach((section) => {
    if (!pools[section.id]) pools[section.id] = [];
  });

  return pools;
}

function buildSeatRowsForSection(section, seats) {
  const orderedSeats = seats
    .slice()
    .sort((a, b) => {
      if (a.rowNo !== b.rowNo) return Number(a.rowNo) - Number(b.rowNo);
      return Number(a.seatNo) - Number(b.seatNo);
    });

  if (orderedSeats.length === 0) return [];
  const rowMap = new Map();

  orderedSeats.forEach((seat) => {
    const rowKey = String(seat.rowNo);
    const rowSeats = rowMap.get(rowKey) ?? [];
    rowSeats.push(seat);
    rowMap.set(rowKey, rowSeats);
  });

  const rowLabels = [...rowMap.keys()].sort((a, b) => Number(a) - Number(b));
  const numericRowLabels = rowLabels.map((label) => Number(label));
  const isConsecutiveRows = numericRowLabels.every(
    (label, index) => index === 0 || label === numericRowLabels[index - 1] + 1
  );
  const hasSparseSeatNumbers = rowLabels.some((rowLabel) => {
    const seatNumbers = (rowMap.get(rowLabel) ?? [])
      .map((seat) => Number(seat.seatNo) || 0)
      .sort((a, b) => a - b);
    return seatNumbers.some((seatNo, index) => seatNo !== index + 1);
  });

  const shouldCompact = !isConsecutiveRows || hasSparseSeatNumbers;

  if (shouldCompact) {
    return rowLabels.map((rowLabel, rowIndex) => {
      const rowSeats = (rowMap.get(rowLabel) ?? []).slice().sort(
        (a, b) => Number(a.seatNo) - Number(b.seatNo)
      );

      return {
        label: rowIndex + 1,
        seats: rowSeats.map((seat, seatIndex) => ({
          ...seat,
          displayRowNo: rowIndex + 1,
          displaySeatNo: seatIndex + 1,
        })),
      };
    });
  }

  const maxSeatNo = orderedSeats.reduce((max, seat) => Math.max(max, Number(seat.seatNo) || 0), 0);

  return rowLabels.map((rowLabel) => {
    const seatsByNo = new Map(
      (rowMap.get(rowLabel) ?? []).map((seat) => [Number(seat.seatNo), seat])
    );
    const rowSeats = [];

    for (let seatNo = 1; seatNo <= maxSeatNo; seatNo += 1) {
      const seat = seatsByNo.get(seatNo);
      if (!seat) {
        rowSeats.push(null);
        continue;
      }

      rowSeats.push({
        ...seat,
        displayRowNo: Number(rowLabel),
        displaySeatNo: seatNo,
      });
    }

    return {
      label: rowLabel,
      seats: rowSeats,
    };
  });
}

// ── Arena @ EXPO (Hall 7) sections ─────────────────────────────────────────────
const EXPO_SECTIONS = [
  // Center floor 101-105 → VIP (dataSection 1)
  { id:"EXPO_101", label:"101", dataSection:1, x:134, y:78,  w:80, h:210 },
  { id:"EXPO_102", label:"102", dataSection:1, x:222, y:78,  w:80, h:210 },
  { id:"EXPO_103", label:"103", dataSection:1, x:310, y:78,  w:80, h:210 },
  { id:"EXPO_104", label:"104", dataSection:1, x:398, y:78,  w:80, h:210 },
  { id:"EXPO_105", label:"105", dataSection:1, x:486, y:78,  w:80, h:210 },
  // Bottom row 205-211 → CAT1 (dataSection 2)
  { id:"EXPO_205", label:"205", dataSection:2, x:134, y:324, w:59, h:70 },
  { id:"EXPO_206", label:"206", dataSection:2, x:196, y:324, w:59, h:70 },
  { id:"EXPO_207", label:"207", dataSection:2, x:258, y:324, w:59, h:70 },
  { id:"EXPO_208", label:"208", dataSection:2, x:320, y:324, w:59, h:70 },
  { id:"EXPO_209", label:"209", dataSection:2, x:382, y:324, w:59, h:70 },
  { id:"EXPO_210", label:"210", dataSection:2, x:444, y:324, w:59, h:70 },
  { id:"EXPO_211", label:"211", dataSection:2, x:506, y:324, w:59, h:70 },
  // Left angled 201-204 → CAT2 (dataSection 4)
  { id:"EXPO_201", label:"201", dataSection:4, shape:"polygon", pts:[[4,206],[130,188],[130,238],[4,256]] },
  { id:"EXPO_202", label:"202", dataSection:4, shape:"polygon", pts:[[4,261],[130,243],[130,293],[4,311]] },
  { id:"EXPO_203", label:"203", dataSection:4, shape:"polygon", pts:[[4,316],[130,298],[130,348],[4,366]] },
  { id:"EXPO_204", label:"204", dataSection:4, shape:"polygon", pts:[[4,371],[130,353],[130,403],[4,421]] },
  // Right angled 212-215 → CAT3 (dataSection 6)
  { id:"EXPO_215", label:"215", dataSection:6, shape:"polygon", pts:[[570,188],[696,206],[696,256],[570,238]] },
  { id:"EXPO_214", label:"214", dataSection:6, shape:"polygon", pts:[[570,243],[696,261],[696,311],[570,293]] },
  { id:"EXPO_213", label:"213", dataSection:6, shape:"polygon", pts:[[570,298],[696,316],[696,366],[570,348]] },
  { id:"EXPO_212", label:"212", dataSection:6, shape:"polygon", pts:[[570,353],[696,371],[696,421],[570,403]] },
];

// ── Arena SVG map ──────────────────────────────────────────────────────────────
function ArenaMap({ venueName, sections, sectionSeatsById, activeTiers, selectedSectionId, onSectionClick }) {
  const [hoverId, setHoverId] = useState(null);

  return (
    <div className="flex justify-center px-4 py-6 bg-white">
      <svg viewBox="0 0 700 572" className="w-full" style={{ maxWidth: 700 }}>
        {/* Stage */}
        {venueName === "Singapore Indoor Stadium" || venueName === "Capitol Theatre" || venueName === "Arena @ EXPO (Hall 7)" || venueName === "Mediacorp Theatre" || venueName === "The Star Theatre" ? (
          <>
            <rect x={190} y={5} width={320} height={55} fill="#111" rx={3} />
            <text x={350} y={39} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold" letterSpacing={4}>STAGE</text>
          </>
        ) : (
          <>
            <rect x={175} y={5} width={350} height={62} fill="#111" rx={3} />
            <text x={350} y={43} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" letterSpacing={4}>STAGE</text>
            {/* Catwalk */}
            <rect x={263} y={67} width={174} height={126} fill="#111" rx={2} />
          </>
        )}

        {sections.map((sec) => {
          const allSeats  = sectionSeatsById[sec.id] ?? [];
          const tier      = allSeats[0]?.tier;
          const cfg       = TIERS[tier];
          const hasData   = allSeats.length > 0;
          const filtered  = hasData && tier && !activeTiers.has(tier);
          const isStanding = sec.label?.toUpperCase().includes("STANDING");
          const isActive  = selectedSectionId === sec.id;
          const isHover   = hoverId === sec.id;
          const clickable = hasData && !filtered;

          const fill   = !hasData ? "#e5e7eb" : filtered ? "#e5e7eb" : cfg?.hex ?? "#e5e7eb";
          const opac   = !hasData ? 0.5 : filtered ? 0.3 : isStanding ? 0.55 : isActive ? 1 : isHover ? 1 : 0.78;
          const stroke = isActive ? "white" : isHover ? "white" : "rgba(255,255,255,0.3)";
          const sw     = isActive ? 3 : isHover ? 2 : 1;

          // Centroid: polygon uses average of pts; rect uses center
          const cx = sec.shape === "polygon"
            ? sec.pts.reduce((s, p) => s + p[0], 0) / sec.pts.length
            : sec.x + sec.w / 2;
          const cy = sec.shape === "polygon"
            ? sec.pts.reduce((s, p) => s + p[1], 0) / sec.pts.length
            : sec.y + sec.h / 2;

          const secW  = sec.shape === "polygon"
            ? Math.max(...sec.pts.map(p => p[0])) - Math.min(...sec.pts.map(p => p[0]))
            : sec.w;
          const secH  = sec.shape === "polygon"
            ? Math.max(...sec.pts.map(p => p[1])) - Math.min(...sec.pts.map(p => p[1]))
            : sec.h;
          const showPriceLabel = hasData && cfg && secW >= 80 && secH >= 60;

          return (
            <g
              key={sec.id}
              style={{ cursor: clickable ? "pointer" : "default" }}
              onClick={() => clickable && onSectionClick(sec)}
              onMouseEnter={() => clickable && setHoverId(sec.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {sec.shape === "polygon" ? (
                <polygon
                  points={sec.pts.map(p => p.join(",")).join(" ")}
                  fill={fill} stroke={stroke} strokeWidth={sw} opacity={opac} />
              ) : (
                <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h}
                  fill={fill} rx={4} stroke={stroke} strokeWidth={sw} opacity={opac} />
              )}
              {sec.multiline ? (
                <>
                  {sec.label.split("\n").map((line, i, arr) => (
                    <text key={i} x={cx} y={cy + (i - (arr.length - 1) / 2) * 14 - (isStanding ? 7 : 0)}
                      textAnchor="middle" fill="white" fontSize={Math.min(13, secW / (line.length * 0.65))} fontWeight="700">
                      {line}
                    </text>
                  ))}
                  {isStanding && (
                    <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={9} fontWeight="400">
                      General Admission
                    </text>
                  )}
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
function SeatGrid({ venueSection, sectionSeats, selectedSeat, onSeatClick }) {
  const allSeats  = sectionSeats;
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

  const displayRows = buildSeatRowsForSection(venueSection, allSeats);

  return (
    <div className="px-6 py-5">
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
        <div className="inline-block min-w-max space-y-1.5">
          {displayRows.map(({ label: rowLabel, seats: rowSeats }) => (
            <div key={rowLabel} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-5 text-right shrink-0">{rowLabel}</span>
              <div className="flex gap-1.5">
                {rowSeats.map((seat, seatIndex) => {
                  if (!seat) {
                    return (
                      <div
                        key={`empty-${rowLabel}-${seatIndex}`}
                        className="w-9 h-9 shrink-0 rounded-md border border-gray-200 bg-gray-100"
                      />
                    );
                  }

                  const normalizedStatus = String(seat.status ?? "available").toLowerCase();
                  const avail      = normalizedStatus === "available";
                  const onHold     = normalizedStatus === "held";
                  const unavailable = !avail && !onHold;
                  const isSelected = selectedSeat?.seatId === seat.seatId;
                  return (
                    <button
                      key={seat.seatId}
                      disabled={!avail}
                      onClick={() => avail && onSeatClick(seat)}
                      title={`Row ${seat.displayRowNo ?? seat.rowNo}, Seat ${seat.displaySeatNo ?? seat.seatNo} · $${seat.price ?? seat.basePrice}`}
                      className={`w-9 h-9 rounded-md text-[10px] font-bold flex items-center justify-center transition-all
                        ${onHold
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : unavailable
                          ? "bg-gray-700 text-white cursor-not-allowed"
                          : isSelected
                          ? "bg-gray-900 text-white scale-110 shadow-md"
                          : "text-white hover:scale-110 hover:brightness-110 cursor-pointer"
                        }`}
                      style={avail && !isSelected ? { backgroundColor: cfg?.hex ?? "#9ca3af" } : {}}
                    >
                      {isSelected ? <Check size={10} strokeWidth={3} /> : seat.displaySeatNo ?? seat.seatNo}
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

// ── General Admission panel (standing pen sections) ────────────────────────────
function GAPanel({ venueSection, sectionSeats, onAddToCart }) {
  const allSeats  = sectionSeats;
  const tier      = allSeats[0]?.tier;
  const cfg       = TIERS[tier];
  const available = allSeats.filter((s) => s.status === "AVAILABLE" || s.status === "available");
  const price     = allSeats[0]?.price ?? allSeats[0]?.basePrice;

  const sectionLabel = venueSection.label.replace(/\n/g, " ");

  return (
    <div className="px-6 py-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg?.hex ?? "#9ca3af" }} />
          <span className="text-sm font-bold text-gray-900">{sectionLabel}</span>
        </div>
        <p className="text-xs text-gray-500">{cfg?.label} · General Admission · {available.length} available</p>
      </div>

      {/* GA info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Ticket price</span>
          <span className="font-semibold text-gray-900">${price}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Booking fee</span>
          <span className="font-semibold text-gray-900">${FEE}</span>
        </div>
        <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
          <span className="font-semibold text-gray-800">Total</span>
          <span className="font-bold text-gray-900">${(price ?? 0) + FEE}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        A seat will be automatically assigned for you in this section.
      </p>

      {available.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-4">Sold out</div>
      ) : (
        <button
          onClick={() => onAddToCart(available[0])}
          className="w-full py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-xl text-sm transition"
        >
          Add GA Ticket →
        </button>
      )}
    </div>
  );
}

// ── Bottom sheet (appears when a seat is selected) ────────────────────────────
function SeatBottomSheet({ seat, tierCfg, isGA, sectionLabel, onClear, onAddToCart }) {
  const total = (seat.price ?? seat.basePrice) + FEE;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl">
      {/* Summary bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tierCfg?.hex ?? "#9ca3af" }} />
            <span className="text-sm font-bold text-gray-900">
              {isGA
                ? `${tierCfg?.label} · ${sectionLabel} (GA)`
                : `${tierCfg?.label} · Row ${seat.displayRowNo ?? seat.rowNo}, Seat ${seat.displaySeatNo ?? seat.seatNo}`}
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
            onClick={onAddToCart}
            className="px-6 py-2.5 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition text-sm"
          >
            Add to Cart
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
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [seatPanelWidth, setSeatPanelWidth] = useState(390);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(0);
  const isDraggingSeatPanel = useRef(false);
  const seatPanelDragStartX = useRef(0);
  const seatPanelDragStartW = useRef(0);

  const onDragStart = useCallback((e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidth;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  const onSeatPanelDragStart = useCallback((e) => {
    isDraggingSeatPanel.current = true;
    seatPanelDragStartX.current = e.clientX;
    seatPanelDragStartW.current = seatPanelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [seatPanelWidth]);

  useEffect(() => {
    function onMouseMove(e) {
      if (isDragging.current) {
        setSidebarWidth(Math.min(420, Math.max(220, dragStartW.current + e.clientX - dragStartX.current)));
      }
      if (isDraggingSeatPanel.current) {
        setSeatPanelWidth(Math.min(520, Math.max(300, seatPanelDragStartW.current - (e.clientX - seatPanelDragStartX.current))));
      }
    }
    function onMouseUp() {
      isDragging.current = false;
      isDraggingSeatPanel.current = false;
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

  function loadSeatmap({ showLoading = false } = {}) {
    if (showLoading) setLoading(true);
    return getSeatmap(eventId)
      .then((next) => setData(next))
      .catch((e) => setError(e.message))
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  }

  useEffect(() => {
    loadSeatmap({ showLoading: true });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return undefined;

    const intervalId = window.setInterval(() => {
      loadSeatmap();
    }, 4000);

    function handleFocus() {
      loadSeatmap();
    }

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
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

  async function handleAddToCart() {
    if (!isAuthenticated) {
      // Persist the selected seat so we can restore it after login
      sessionStorage.setItem("pendingSeat", JSON.stringify(selectedSeat));
      setShowLoginModal(true);
      return;
    }
    await addToCart([{ seat: selectedSeat, event: data.event, date, time }]);
    await loadSeatmap();
    setSelectedSeat(null);
    setSelectedSection(null);
    setShowLoginModal(false);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  // After returning from login, add the pending seat to cart and show the cart popup
  useEffect(() => {
    if (!isAuthenticated || !data) return;
    const raw = sessionStorage.getItem("pendingSeat");
    if (!raw) return;
    sessionStorage.removeItem("pendingSeat");
    try {
      const seat = JSON.parse(raw);
      addToCart([{ seat, event: data.event, date, time }]).then(() => {
        loadSeatmap();
        setSelectedSeat(null);
        setSelectedSection(null);
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
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

  const event = data?.event ?? {};
  const seats = data?.seats ?? [];
  const venueName = event?.venueName ?? "";
  const fixedVenueSections = getFixedVenueSections(venueName);
  const rawBackend = Array.isArray(data?.visualSections) && data.visualSections.length > 0
    ? data.visualSections.filter((s) => !s.hidden)
    : null;

  // Prefer backend-saved sections; fall back to fixed layout when:
  // 1. backend is empty, or
  // 2. venue needs polygons but saved data has none (stale pre-polygon save), or
  // 3. fixed layout exists but no backend IDs match it (stale sections from a different venue)
  let mapSections;
  if (rawBackend && rawBackend.length > 0) {
    const savedHasPolygons   = rawBackend.some((s) => s.shape === "polygon");
    const fixedNeedsPolygons = fixedVenueSections?.some((s) => s.shape === "polygon");
    const fixedIds           = fixedVenueSections ? new Set(fixedVenueSections.map((s) => s.id)) : null;
    const backendMatchesFix  = fixedIds ? rawBackend.some((s) => fixedIds.has(s.id)) : true;
    const isStale = (fixedNeedsPolygons && !savedHasPolygons) || (fixedIds && !backendMatchesFix);
    mapSections = isStale ? (fixedVenueSections ?? DEFAULT_ARENA_SECTIONS) : rawBackend;
  } else {
    mapSections = fixedVenueSections ?? DEFAULT_ARENA_SECTIONS;
  }

  const sectionSeatsById = useMemo(
    () => buildSectionSeatPools(mapSections, seats),
    [mapSections, seats]
  );

  // Determine which tiers actually have data (for the filter buttons)
  const tierSamples = Object.values(sectionSeatsById).flat();
  const tiersWithData = new Set(tierSamples.map((seat) => seat.tier).filter(Boolean));

  // Selected seat's tier config
  const selectedTierCfg = selectedSeat ? TIERS[selectedSeat.tier] : null;

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading seat map...</div>;
  if (error)   return <div className="flex justify-center items-center h-64 text-red-400">{error}</div>;

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
        {venueName && (
          <p className="text-xs text-gray-500 mt-0.5">{venueName}</p>
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

          <div className="px-5 py-5 space-y-6">

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
                          ${tierSamples.find((s) => s.tier === tier)?.price ?? tierSamples.find((s) => s.tier === tier)?.basePrice}
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
                    {cfg.label} — ${tierSamples.find((s) => s.tier === tier)?.price ?? tierSamples.find((s) => s.tier === tier)?.basePrice ?? cfg.price ?? ""}
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
                    On hold
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <div className="w-5 h-5 rounded-sm bg-gray-700 shrink-0" />
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
              venueName={venueName}
              sections={mapSections}
              sectionSeatsById={sectionSeatsById}
              activeTiers={activeTiers}
              selectedSectionId={selectedSection?.id ?? null}
              onSectionClick={handleSectionClick}
            />
          </div>

          {/* Seat grid panel — fixed width, beside the map */}
          <div
            ref={seatGridRef}
            style={selectedSection ? { width: seatPanelWidth } : { width: 0 }}
            className={`relative shrink-0 border-l bg-gray-50 overflow-y-auto transition-all duration-300 ${selectedSection ? "" : "overflow-hidden border-0"}`}
          >
            {selectedSection && (
              <div
                onMouseDown={onSeatPanelDragStart}
                className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-[#800020]/20 z-10"
              />
            )}
            {selectedSection && (() => {
              const sectionSeats = sectionSeatsById[selectedSection.id] ?? [];
              const isStandingSec = selectedSection.label?.toUpperCase().includes("STANDING");
              if (isStandingSec) {
                return (
                  <GAPanel
                    venueSection={selectedSection}
                    sectionSeats={sectionSeats}
                    onAddToCart={(seat) => setSelectedSeat(seat)}
                  />
                );
              }
              return (
                <SeatGrid
                  venueSection={selectedSection}
                  sectionSeats={sectionSeats}
                  selectedSeat={selectedSeat}
                  onSeatClick={handleSeatClick}
                />
              );
            })()}
          </div>
        </main>
      </div>

      {/* ── Bottom sheet — appears when seat is selected ─────────── */}
      {selectedSeat && (
        <SeatBottomSheet
          seat={selectedSeat}
          tierCfg={selectedTierCfg}
          isGA={selectedSection?.label?.toUpperCase().includes("STANDING") ?? false}
          sectionLabel={selectedSection?.label?.replace(/\n/g, " ") ?? ""}
          onClear={handleClear}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
