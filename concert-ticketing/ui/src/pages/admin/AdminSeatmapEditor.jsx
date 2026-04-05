import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, AlertTriangle, RefreshCw, Check, X, Mail, RotateCcw, BadgeCheck, Undo2 } from "lucide-react";
import { adminGetSeats, adminUpdateSeatmap, adminRestoreSeats, adminGetEvents } from "../../api";
import { DEFAULT_ARENA_SECTIONS, getFixedVenueSections } from "../../seatmapLayouts";

// ── Tier config ────────────────────────────────────────────────────────────────
const TIERS = {
  VIP:  { label: "VIP",   hex: "#6a001a" },
  CAT1: { label: "CAT 1", hex: "#0d9488" },
  CAT2: { label: "CAT 2", hex: "#7c3aed" },
  CAT3: { label: "CAT 3", hex: "#2563eb" },
};

// ── Arena map ──────────────────────────────────────────────────────────────────
function ArenaMap({ sections, bySection, selectedSectionId, onSectionClick }) {
  const [hoverId, setHoverId] = useState(null);

  return (
    <div className="flex justify-center px-4 py-6 bg-white">
      <svg viewBox="0 0 700 572" className="w-full" style={{ maxWidth: 700 }}>
        <rect x={175} y={5} width={350} height={62} fill="#111" rx={3} />
        <text x={350} y={43} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" letterSpacing={4}>STAGE</text>
        <rect x={263} y={67} width={174} height={126} fill="#111" rx={2} />

        {sections.map((sec) => {
          const allSeats   = Object.values(bySection[sec.dataSection] ?? {}).flat();
          const tier       = allSeats[0]?.tier;
          const cfg        = TIERS[tier];
          const hasData    = allSeats.length > 0;
          const isActive   = selectedSectionId === sec.id;
          const isHover    = hoverId === sec.id;

          const soldCount    = allSeats.filter(s => s.status === "sold" || s.status === "held").length;
          const blockedCount = allSeats.filter(s => s.status === "blocked").length;
          const availCount   = allSeats.filter(s => s.status === "available").length;
          const removedCount = allSeats.filter(s => s.status === "removed").length;

          // Dim only when every seat is removed or blocked (admin has nothing to act on)
          const allInactive = hasData && availCount === 0 && soldCount === 0 && removedCount + blockedCount === allSeats.length;
          const fill   = !hasData ? "#e5e7eb" : cfg?.hex ?? "#e5e7eb";
          const opac   = !hasData ? 0.4 : allInactive ? 0.35 : isActive ? 1 : isHover ? 0.95 : 0.82;
          const stroke = isActive ? "white" : isHover ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)";
          const sw     = isActive ? 3 : isHover ? 2 : 1;
          const cx = sec.x + sec.w / 2;
          const cy = sec.y + sec.h / 2;
          const showDetail = hasData && cfg && sec.w >= 80 && sec.h >= 60;

          return (
            <g
              key={sec.id}
              style={{ cursor: hasData ? "pointer" : "default" }}
              onClick={() => hasData && onSectionClick(sec)}
              onMouseEnter={() => hasData && setHoverId(sec.id)}
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
              ) : showDetail ? (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize={11} fontWeight="700">{cfg.label}</text>
                  <text x={cx} y={cy + 6} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={9}>
                    {availCount} avail · {soldCount} sold{blockedCount > 0 ? ` · ${blockedCount} blocked` : ""}{removedCount > 0 ? ` · ${removedCount} removed` : ""}
                  </text>
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

// ── Admin seat grid panel ──────────────────────────────────────────────────────
function AdminSeatGrid({ venueSection, sectionData, selected, onToggleSeat, onToggleAll }) {
  const allSeats    = Object.values(sectionData).flat();
  const tier        = allSeats[0]?.tier;
  const cfg         = TIERS[tier];
  const displayRows = Object.entries(sectionData).sort(([a], [b]) => Number(a) - Number(b));
  // Admin can select available, sold/held seats for removal, and removed seats for restore; blocked are not selectable
  const selectableSeats = allSeats.filter(s => s.status !== "blocked");
  const allSelected = selectableSeats.length > 0 && selectableSeats.every(s => selected.has(s.seatId));

  if (allSeats.length === 0) {
    return <div className="px-5 py-6 text-center"><p className="text-sm text-gray-400">No seats in this section.</p></div>;
  }

  return (
    <div className="px-4 py-5">
      {/* Stage direction */}
      <div className="flex flex-col items-center mb-4">
        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Stage</div>
        <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: cfg?.hex ?? "#9ca3af", opacity: 0.4 }} />
        <div className="text-[10px] text-gray-400">▼ closer to stage</div>
      </div>

      {/* Section header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg?.hex ?? "#9ca3af" }} />
            <span className="text-sm font-bold text-gray-900">Section {venueSection.label}</span>
          </div>
          {selectableSeats.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(selectableSeats)}
                className="rounded border-gray-300 accent-[#800020]"
              />
              Select all
            </label>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 ml-4">{cfg?.label} · ${allSeats[0]?.basePrice}</p>
      </div>

      {/* Seat status legend */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { color: cfg?.hex ?? "#9ca3af", label: "Available" },
          { color: "#ef4444",             label: "Sold" },
          { color: "#f97316",             label: "Blocked" },
          { color: "#d1d5db",             label: "Removed", border: true },
        ].map(({ color, label, border }) => (
          <div key={label} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color, border: border ? "1px solid #9ca3af" : "none" }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-gray-900 shrink-0 flex items-center justify-center">
            <Check size={7} strokeWidth={3} className="text-white" />
          </span>
          Selected
        </div>
      </div>

      {/* Seat grid */}
      <div>
        <div className="inline-block space-y-1.5">
          {displayRows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 w-5 text-right shrink-0">{rowLabel}</span>
              <div className="flex gap-1">
                {rowSeats.map((seat) => {
                  const isSelected = selected.has(seat.seatId);
                  const status     = seat.status ?? "available";
                  const isSold     = status === "sold" || status === "held";
                  const isRemoved  = status === "removed";
                  const isBlocked  = status === "blocked";

                  let bgColor = cfg?.hex ?? "#9ca3af";
                  if (isSold)    bgColor = "#ef4444";
                  if (isBlocked) bgColor = "#f97316"; // orange for blocked
                  if (isRemoved) bgColor = "#d1d5db";

                  return (
                    <button
                      key={seat.seatId}
                      onClick={() => !isBlocked && onToggleSeat(seat.seatId)}
                      title={`Row ${seat.rowNo}, Seat ${seat.seatNo} · ${status}${isSold ? " (selecting will trigger reassignment/refund)" : ""}${isRemoved ? " (click to restore)" : ""}`}
                      className={`w-8 h-8 rounded-sm text-[10px] font-bold flex items-center justify-center transition-all
                        border-2 ${isSelected ? "border-gray-900 scale-110 shadow-md" : isRemoved ? "border-dashed border-gray-400" : "border-transparent"}
                        ${isBlocked ? "cursor-not-allowed opacity-60" : "hover:scale-110 cursor-pointer"}`}
                      style={{ backgroundColor: isSelected ? "#111" : bgColor }}
                    >
                      {isSelected
                        ? <Check size={10} strokeWidth={3} className="text-white" />
                        : <span style={{ color: isRemoved ? "#6b7280" : "white" }}>{seat.seatNo}</span>
                      }
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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminSeatmapEditor() {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [event,          setEvent]          = useState(null);
  const [seats,          setSeats]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selected,       setSelected]       = useState(new Set());
  const [confirmAction,  setConfirmAction]  = useState(null); // "remove" | "restore"
  const [processing,     setProcessing]     = useState(false);
  const [actionResult,   setActionResult]   = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [sidebarWidth, setSidebarWidth] = useState(200);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);
  const seatGridRef = useRef(null);

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
      setSidebarWidth(Math.min(320, Math.max(140, dragStartW.current + e.clientX - dragStartX.current)));
    }
    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function load() {
    setLoading(true);
    setSelected(new Set());
    Promise.all([
      adminGetEvents().then((evts) => evts.find((e) => String(e.eventId) === String(eventId))),
      adminGetSeats(eventId),
    ]).then(([ev, s]) => {
      setEvent(ev ?? null);
      setSeats(Array.isArray(s) ? s : []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [eventId]);

  // Silent background poll — updates seat statuses without resetting UI state
  useEffect(() => {
    if (!eventId) return;
    const intervalId = window.setInterval(() => {
      if (processing) return; // don't poll while an action is in progress
      adminGetSeats(eventId).then((s) => {
        if (Array.isArray(s)) setSeats(s);
      }).catch(() => {});
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [eventId, processing]);

  const stats = useMemo(() => {
    const counts = { total: seats.length, available: 0, sold: 0, held: 0, blocked: 0, removed: 0 };
    seats.forEach((s) => {
      if (s.status === "available") counts.available++;
      else if (s.status === "sold") counts.sold++;
      else if (s.status === "held") counts.held++;
      else if (s.status === "blocked") counts.blocked++;
      else if (s.status === "removed") counts.removed++;
    });
    return counts;
  }, [seats]);

  const mapSections = useMemo(
    () => getFixedVenueSections(event?.venueName) ?? DEFAULT_ARENA_SECTIONS,
    [event?.venueName]
  );

  const bySection = useMemo(() => {
    const acc = seats.reduce((acc, s) => {
      if (!acc[s.sectionNo]) acc[s.sectionNo] = {};
      if (!acc[s.sectionNo][s.rowNo]) acc[s.sectionNo][s.rowNo] = [];
      acc[s.sectionNo][s.rowNo].push(s);
      return acc;
    }, {});
    // Sort seats within each row by seatNo so grid positions match customer UI
    Object.values(acc).forEach((rows) => {
      Object.keys(rows).forEach((rowKey) => {
        rows[rowKey].sort((a, b) => Number(a.seatNo) - Number(b.seatNo));
      });
    });
    return acc;
  }, [seats]);

  function toggleSeat(seatId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(seatId) ? next.delete(seatId) : next.add(seatId);
      return next;
    });
  }

  function toggleAll(sectionSeats) {
    const allSel = sectionSeats.every(s => selected.has(s.seatId));
    setSelected(prev => {
      const next = new Set(prev);
      sectionSeats.forEach(s => allSel ? next.delete(s.seatId) : next.add(s.seatId));
      return next;
    });
  }

  function handleSectionClick(sec) {
    setSelectedSection(sec);
    setTimeout(() => seatGridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  // Derived selection info
  const selectedList   = Array.from(selected);
  const soldSelected   = selectedList.filter(id => seats.find(s => s.seatId === id && (s.status === "sold" || s.status === "held"))).length;
  const removedSelected = selectedList.filter(id => seats.find(s => s.seatId === id && s.status === "removed")).length;
  const availSelected  = selectedList.length - soldSelected - removedSelected;

  // Action bar shows if any non-sold seats selected (remove) or any removed seats selected (restore)
  const canRemove  = selectedList.length > 0 && (availSelected > 0 || soldSelected > 0);
  const canRestore = removedSelected > 0;

  async function handleConfirm() {
    setConfirmAction(null);
    setProcessing(true);
    try {
      if (confirmAction === "remove") {
        const removeIds = selectedList.filter(id => {
          const s = seats.find(s => s.seatId === id);
          return s && s.status !== "removed";
        });
        const result = await adminUpdateSeatmap(eventId, removeIds);
        setActionResult({
          success: true,
          action: "remove",
          count: result.removedSeats?.length ?? removeIds.length,
          soldCount: soldSelected,
          unsoldCount: availSelected,
        });
      } else {
        const restoreIds = selectedList.filter(id => seats.find(s => s.seatId === id && s.status === "removed"));
        const result = await adminRestoreSeats(eventId, restoreIds);
        setActionResult({
          success: true,
          action: "restore",
          count: result.restoredSeats?.length ?? restoreIds.length,
        });
      }
      setSelected(new Set());
      setProcessing(false);
      load();
    } catch (e) {
      setActionResult({ success: false, error: e.response?.data?.error ?? "Action failed. Please try again." });
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#800020] transition mb-3">
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seat Inventory</h1>
            {event && <p className="text-sm text-gray-500 mt-0.5">{event.name} · {event.venueName} · {event.date}</p>}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 transition">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {!loading && (
          <div className="flex gap-3 mt-5 flex-wrap">
            {[
              { label: "Total",     value: stats.total,     color: "text-gray-800"   },
              { label: "Available", value: stats.available, color: "text-green-600"  },
              { label: "Sold",      value: stats.sold,      color: "text-red-600"    },
              { label: "Held",      value: stats.held,      color: "text-yellow-600" },
              { label: "Blocked",   value: stats.blocked,   color: "text-orange-500" },
              { label: "Removed",   value: stats.removed,   color: "text-gray-400"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Loading seats…</div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <aside style={{ width: sidebarWidth }} className="relative shrink-0 border-r bg-white hidden md:block overflow-y-auto">
            <div onMouseDown={onDragStart} className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#800020]/20 z-10" />
            <div className="px-4 py-5 space-y-6">

              {/* Tier legend */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tier Legend</p>
                <div className="space-y-2.5">
                  {Object.entries(TIERS).map(([tier, cfg]) => {
                    const price = seats.find(s => s.tier === tier)?.basePrice;
                    return (
                      <div key={tier} className="flex items-center gap-2.5 text-xs text-gray-600">
                        <div className="w-5 h-5 rounded-sm shrink-0" style={{ backgroundColor: cfg.hex }} />
                        {cfg.label}{price != null ? ` — $${price}` : ""}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </aside>

          {/* Arena map */}
          <main className="flex-1 flex overflow-auto bg-white">
            <div className="flex-1 min-w-0">
              <ArenaMap
                sections={mapSections}
                bySection={bySection}
                selectedSectionId={selectedSection?.id ?? null}
                onSectionClick={handleSectionClick}
              />
            </div>

            {/* Seat grid panel */}
            <div
              ref={seatGridRef}
              className={`shrink-0 border-l bg-gray-50 overflow-y-auto transition-all duration-300 ${selectedSection ? "w-[520px]" : "w-0 overflow-hidden border-0"}`}
            >
              {selectedSection && (
                <AdminSeatGrid
                  venueSection={selectedSection}
                  sectionData={bySection[selectedSection.dataSection] ?? {}}
                  selected={selected}
                  onToggleSeat={toggleSeat}
                  onToggleAll={toggleAll}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex items-center gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{selected.size} seat{selected.size !== 1 ? "s" : ""} selected</p>
            {soldSelected > 0 && (
              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                <AlertTriangle size={12} /> {soldSelected} sold seat{soldSelected !== 1 ? "s" : ""} — holders will be automatically reassigned or refunded
              </p>
            )}
          </div>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 transition px-3 py-2">
            Clear
          </button>
          {canRestore && (
            <button
              onClick={() => setConfirmAction("restore")}
              disabled={processing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm disabled:opacity-50"
            >
              <Undo2 size={15} /> Restore {removedSelected} Seat{removedSelected !== 1 ? "s" : ""}
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => setConfirmAction("remove")}
              disabled={processing}
              className="flex items-center gap-2 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm disabled:opacity-50"
            >
              {processing ? "Processing…" : `Remove ${availSelected + soldSelected} Seat${availSelected + soldSelected !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}

      {/* ── Confirmation modal ─────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[360px] mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmAction === "restore" ? "bg-green-100" : "bg-red-100"}`}>
                {confirmAction === "restore"
                  ? <Undo2 size={18} className="text-green-600" />
                  : <AlertTriangle size={18} className="text-red-600" />
                }
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {confirmAction === "restore" ? `Restore ${removedSelected} Seat${removedSelected !== 1 ? "s" : ""}?` : `Remove ${availSelected + soldSelected} Seat${availSelected + soldSelected !== 1 ? "s" : ""}?`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {confirmAction === "restore" ? "Seats will be returned to available inventory." : "This action cannot be undone."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-5">
              {confirmAction === "restore" && (
                <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700">
                  <span className="font-bold">{removedSelected}</span> seat{removedSelected !== 1 ? "s" : ""} will be restored to <strong>available</strong> and visible to customers again.
                </div>
              )}
              {confirmAction === "remove" && soldSelected > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
                  <span className="font-bold">{soldSelected}</span> sold seat{soldSelected !== 1 ? "s" : ""} — ticket holders will be <strong>automatically reassigned</strong> or <strong>refunded</strong>.
                </div>
              )}
              {confirmAction === "remove" && availSelected > 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-600">
                  <span className="font-bold">{availSelected}</span> unsold seat{availSelected !== 1 ? "s" : ""} removed from inventory immediately.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold transition ${confirmAction === "restore" ? "bg-green-600 hover:bg-green-700" : "bg-[#800020] hover:bg-[#6a001a]"}`}
              >
                {confirmAction === "restore" ? "Confirm Restore" : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action result modal ───────────────────────────────────────────── */}
      {actionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[420px] mx-4">
            {actionResult.success ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${actionResult.action === "restore" ? "bg-green-100" : "bg-green-100"}`}>
                    <BadgeCheck size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {actionResult.action === "restore" ? "Seats Restored" : "Seatmap Updated"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {actionResult.action === "restore"
                        ? `${actionResult.count} seat${actionResult.count !== 1 ? "s" : ""} returned to available inventory`
                        : `${actionResult.count} seat${actionResult.count !== 1 ? "s" : ""} removed from inventory`
                      }
                    </p>
                  </div>
                  <button onClick={() => setActionResult(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="space-y-3 mb-5">
                  {actionResult.action === "restore" && (
                    <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={13} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-800">Seats now available for purchase</p>
                        <p className="text-xs text-green-600 mt-0.5">Customers can now see and book these seats.</p>
                      </div>
                    </div>
                  )}
                  {actionResult.action === "remove" && actionResult.unsoldCount > 0 && (
                    <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={13} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{actionResult.unsoldCount} unsold seat{actionResult.unsoldCount !== 1 ? "s" : ""} removed</p>
                        <p className="text-xs text-gray-500 mt-0.5">No customers affected.</p>
                      </div>
                    </div>
                  )}
                  {actionResult.action === "remove" && actionResult.soldCount > 0 && (
                    <>
                      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <RotateCcw size={13} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-800">{actionResult.soldCount} sold seat{actionResult.soldCount !== 1 ? "s" : ""} — reassignment in progress</p>
                          <p className="text-xs text-blue-600 mt-0.5">The system is automatically finding alternative seats for affected ticket holders.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle size={13} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-800">If no seats are available</p>
                          <p className="text-xs text-amber-600 mt-0.5">Customers will receive an automatic refund to their original payment method.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Mail size={13} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-800">Customers will be notified by email</p>
                          <p className="text-xs text-green-600 mt-0.5">Notifications are being sent automatically with new seat or refund details.</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => setActionResult(null)} className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition">Done</button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Action Failed</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Please try again.</p>
                  </div>
                  <button onClick={() => setActionResult(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{actionResult.error}</p>
                <button onClick={() => setActionResult(null)} className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
