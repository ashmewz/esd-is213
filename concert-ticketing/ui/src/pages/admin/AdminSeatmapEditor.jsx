import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Eye, EyeOff, Undo2, Move } from "lucide-react";
import {
  adminGetEvents,
  adminGetTierPrices,
  adminUpdateTierPrices,
  adminGetVisualSections,
  adminSetVisualSections,
} from "../../api";
import { dataSectionToTier, TIER_TO_DATA_SECTION } from "../../mock/venueData";

// ── Tier config ────────────────────────────────────────────────────────────
const TIERS = [
  { key: "VIP",  label: "VIP",        hex: "#6a001a", colorClass: "bg-yellow-400" },
  { key: "CAT1", label: "Category 1", hex: "#2dd4bf", colorClass: "bg-teal-400"   },
  { key: "CAT2", label: "Category 2", hex: "#a78bfa", colorClass: "bg-violet-400" },
  { key: "CAT3", label: "Category 3", hex: "#93c5fd", colorClass: "bg-blue-400"   },
];
const TIER_HEX = Object.fromEntries(TIERS.map((t) => [t.key, t.hex]));

const ACTION_META = {
  added:   { label: "Added",   bg: "bg-green-100",  text: "text-green-700"  },
  deleted: { label: "Deleted", bg: "bg-red-100",    text: "text-red-700"    },
  hidden:  { label: "Hidden",  bg: "bg-gray-200",   text: "text-gray-600"   },
  shown:   { label: "Shown",   bg: "bg-blue-100",   text: "text-blue-700"   },
  moved:   { label: "Moved",   bg: "bg-yellow-100", text: "text-yellow-700" },
};

function formatAge(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 5)    return "just now";
  if (s < 60)   return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Interactive SVG Preview ────────────────────────────────────────────────
function SeatmapPreview({ visualSecs, onDragStart, onSectionMove, onDragEnd }) {
  const svgRef   = useRef(null);
  const dragging = useRef(null); // { id, startSVGX, startSVGY, origX, origY }
  const [dragId, setDragId] = useState(null); // for cursor CSS only

  function getSVGCoords(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  function handleMouseDown(e, sec) {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getSVGCoords(e.clientX, e.clientY);
    dragging.current = { id: sec.id, startSVGX: x, startSVGY: y, origX: sec.x, origY: sec.y };
    setDragId(sec.id);
    onDragStart(sec.id);
  }

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const { x, y } = getSVGCoords(e.clientX, e.clientY);
    const dx = x - dragging.current.startSVGX;
    const dy = y - dragging.current.startSVGY;
    const newX = Math.max(0, Math.min(698, Math.round(dragging.current.origX + dx)));
    const newY = Math.max(0, Math.min(570, Math.round(dragging.current.origY + dy)));
    onSectionMove(dragging.current.id, newX, newY);
  }, [onSectionMove]);

  const handleMouseUp = useCallback(() => {
    if (!dragging.current) return;
    onDragEnd(dragging.current.id);
    dragging.current = null;
    setDragId(null);
  }, [onDragEnd]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 700 572"
      className="w-full select-none"
      style={{ maxWidth: 700, cursor: dragId ? "grabbing" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Stage */}
      <rect x={175} y={5} width={350} height={62} fill="#111" rx={3} />
      <text x={350} y={43} textAnchor="middle" fill="white" fontSize={22} fontWeight="bold" letterSpacing={4}>
        STAGE
      </text>
      {/* Catwalk */}
      <rect x={263} y={67} width={174} height={126} fill="#111" rx={2} />

      {visualSecs.map((sec) => {
        const tier     = dataSectionToTier(sec.dataSection);
        const isHidden = sec.hidden === true;
        const isDragging = dragId === sec.id;
        const fill   = isHidden ? "#9ca3af" : (TIER_HEX[tier] ?? "#93c5fd");
        const opac   = isHidden ? 0.4 : isDragging ? 1 : 0.85;
        const stroke = isDragging ? "white" : "rgba(255,255,255,0.5)";
        const sw     = isDragging ? 2 : 1;
        const cx = sec.x + sec.w / 2;
        const cy = sec.y + sec.h / 2;
        const lines = (sec.label ?? sec.id).split("\n");

        return (
          <g key={sec.id}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={(e) => handleMouseDown(e, sec)}
          >
            <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h}
              fill={fill} fillOpacity={opac}
              stroke={stroke} strokeWidth={sw} rx={2} />
            {lines.map((line, li) => (
              <text key={li} x={cx}
                y={cy + (lines.length === 1 ? 4 : li === 0 ? -3 : 10)}
                textAnchor="middle"
                fill={isHidden ? "#e5e7eb" : "white"}
                fontSize={sec.multiline ? 8 : Math.min(10, sec.w / (line.length + 1) + 1)}
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const TABS = ["Tier Prices", "Sections", "History"];
const BLANK_FORM = { label: "", tier: "CAT3", x: 0, y: 0, w: 64, h: 50 };

export default function AdminSeatmapEditor() {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [event,       setEvent]       = useState(null);
  const [tab,         setTab]         = useState("Tier Prices");

  // Tier prices
  const [prices,      setPrices]      = useState({});
  const [priceDraft,  setPriceDraft]  = useState({});
  const [priceSaved,  setPriceSaved]  = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);

  // Visual sections
  const [visualSecs,  setVisualSecs]  = useState([]);
  const [secSaved,    setSecSaved]    = useState(false);
  const [secSaving,   setSecSaving]   = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm,     setAddForm]     = useState(BLANK_FORM);

  // History (newest last) — persisted to localStorage per event
  const historyKey = `stagepass_seatmap_history_${eventId}`;
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(`stagepass_seatmap_history_${eventId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (_e) { return []; }
  });

  // Drag snapshot ref — stores pre-drag state for history entry
  const dragSnapshotRef = useRef(null);

  // Refs / persistence effects (all hooks together, after all state)
  const visualSecsRef = useRef([]);
  useEffect(() => { visualSecsRef.current = visualSecs; }, [visualSecs]);
  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch (_e) { /* quota */ }
  }, [history, historyKey]);

  useEffect(() => {
    Promise.all([
      adminGetEvents().then((evts) => evts.find((e) => String(e.eventId) === String(eventId))),
      adminGetTierPrices(eventId),
      adminGetVisualSections(eventId),
    ]).then(([ev, p, vs]) => {
      setEvent(ev);
      setPrices(p);
      setPriceDraft(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])));
      setVisualSecs(vs.map((s) => ({ ...s })));
    });
  }, [eventId]);

  // ── History helpers ──────────────────────────────────────────────────────
  function record(action, label, prevSecs) {
    setHistory((prev) => [
      ...prev,
      { action, label: label.replace("\n", " "), timestamp: Date.now(), prevSecs },
    ]);
  }

  function handleUndoTo(idx) {
    const entry = history[idx];
    if (!entry) return;
    setVisualSecs(entry.prevSecs.map((s) => ({ ...s })));
    setHistory((prev) => prev.slice(0, idx));
    setSecSaved(false);
  }

  // ── Tier price handlers ──────────────────────────────────────────────────
  function handlePriceChange(tier, value) {
    setPriceDraft((prev) => ({ ...prev, [tier]: value }));
    setPriceSaved(false);
  }

  async function handleSavePrices(e) {
    e.preventDefault();
    setPriceSaving(true);
    try {
      const parsed = Object.fromEntries(
        Object.entries(priceDraft).map(([k, v]) => [k, Number(v)])
      );
      const updated = await adminUpdateTierPrices(eventId, parsed);
      setPrices(updated);
      setPriceSaved(true);
    } finally {
      setPriceSaving(false);
    }
  }

  // ── Visual section handlers ──────────────────────────────────────────────
  function toggleHidden(id) {
    const sec = visualSecs.find((s) => s.id === id);
    if (!sec) return;
    const action = sec.hidden ? "shown" : "hidden";
    record(action, sec.label, visualSecs.map((s) => ({ ...s })));
    setVisualSecs((prev) => prev.map((s) => s.id === id ? { ...s, hidden: !s.hidden } : s));
    setSecSaved(false);
  }

  function deleteSection(id) {
    const sec = visualSecs.find((s) => s.id === id);
    if (!sec) return;
    record("deleted", sec.label, visualSecs.map((s) => ({ ...s })));
    setVisualSecs((prev) => prev.filter((s) => s.id !== id));
    setSecSaved(false);
  }

  function handleAddFormChange(field, value) {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddSection() {
    if (!addForm.label.trim()) return;
    const newId  = `custom_${Date.now()}`;
    const newSec = {
      id:          newId,
      label:       addForm.label.trim(),
      dataSection: TIER_TO_DATA_SECTION[addForm.tier] ?? 6,
      x:           Number(addForm.x),
      y:           Number(addForm.y),
      w:           Number(addForm.w),
      h:           Number(addForm.h),
      hidden:      false,
    };
    record("added", addForm.label.trim(), visualSecs.map((s) => ({ ...s })));
    setVisualSecs((prev) => [...prev, newSec]);
    setAddForm(BLANK_FORM);
    setShowAddForm(false);
    setSecSaved(false);
  }

  async function handleSaveSections(e) {
    e.preventDefault();
    setSecSaving(true);
    try {
      const updated = await adminSetVisualSections(eventId, visualSecs);
      setVisualSecs(updated.map((s) => ({ ...s })));
      setSecSaved(true);
    } finally {
      setSecSaving(false);
    }
  }

  // ── Drag handlers (called from SeatmapPreview) ───────────────────────────
  const handleDragStart = useCallback((id) => {
    dragSnapshotRef.current = { id, prevSecs: visualSecs.map((s) => ({ ...s })) };
  }, [visualSecs]);

  const handleSectionMove = useCallback((id, newX, newY) => {
    setVisualSecs((prev) =>
      prev.map((s) => s.id === id ? { ...s, x: newX, y: newY } : s)
    );
  }, []);

  const handleDragEnd = useCallback((id) => {
    if (!dragSnapshotRef.current || dragSnapshotRef.current.id !== id) return;
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;

    const curSec  = visualSecsRef.current.find((s) => s.id === id);
    const prevSec = snapshot.prevSecs.find((s) => s.id === id);
    if (curSec && prevSec && (curSec.x !== prevSec.x || curSec.y !== prevSec.y)) {
      record("moved", curSec.label, snapshot.prevSecs);
      setSecSaved(false);
    }
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    visualSecs.forEach((s) => {
      const tier = dataSectionToTier(s.dataSection);
      if (!map[tier]) map[tier] = [];
      map[tier].push(s);
    });
    return map;
  }, [visualSecs]);

  const canUndo = history.length > 0;
  const handleUndoLast = () => handleUndoTo(history.length - 1);

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="w-[480px] shrink-0 overflow-y-auto p-8 border-r border-gray-200">
        <button onClick={() => navigate("/admin")}
          className="flex items-center gap-1 text-gray-500 hover:text-[#800020] text-sm mb-6 transition">
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Seatmap</h1>
        {event && (
          <p className="text-sm text-gray-500 mb-5">{event.name} · {event.venueName}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                tab === t
                  ? "bg-[#800020] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}>
              {t}
              {t === "History" && history.length > 0 && (
                <span className="ml-1.5 bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tier Prices tab ──────────────────────────────────────────── */}
        {tab === "Tier Prices" && (
          <form onSubmit={handleSavePrices} className="flex flex-col gap-4">
            {TIERS.map(({ key, label, colorClass }) => (
              <div key={key} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className={`w-3 h-10 rounded-full shrink-0 ${colorClass}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">Current: ${prices[key] ?? "—"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">$</span>
                  <input type="number" min="0"
                    value={priceDraft[key] ?? ""}
                    onChange={(e) => handlePriceChange(key, e.target.value)}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]"
                  />
                </div>
              </div>
            ))}
            {priceSaved && <p className="text-sm text-green-600 font-medium">Prices updated.</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate("/admin")}
                className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={priceSaving}
                className="flex-1 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition disabled:opacity-50 text-sm">
                {priceSaving ? "Saving…" : "Save Prices"}
              </button>
            </div>
          </form>
        )}

        {/* ── Sections tab ─────────────────────────────────────────────── */}
        {tab === "Sections" && (
          <form onSubmit={handleSaveSections} className="flex flex-col gap-5">
            {/* Undo bar */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{visualSecs.length} sections</p>
              <button type="button" onClick={handleUndoLast} disabled={!canUndo}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#800020] disabled:opacity-30 disabled:cursor-not-allowed transition">
                <Undo2 size={14} /> Undo
              </button>
            </div>

            {TIERS.map(({ key, label, hex }) => {
              const secs = grouped[key] ?? [];
              if (secs.length === 0) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hex }} />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                    <span className="text-xs text-gray-400">({secs.length})</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {secs.map((sec) => (
                      <div key={sec.id}
                        className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-2 ${
                          sec.hidden ? "border-gray-200 opacity-60" : "border-gray-100 shadow-sm"
                        }`}>
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                          {sec.label.replace("\n", " ")}
                        </span>
                        <button type="button" onClick={() => toggleHidden(sec.id)}
                          title={sec.hidden ? "Show section" : "Hide section (gray out)"}
                          className={`p-1.5 rounded-lg transition ${
                            sec.hidden
                              ? "text-gray-400 hover:text-gray-600 bg-gray-100"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}>
                          {sec.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button type="button" onClick={() => deleteSection(sec.id)}
                          title="Remove section from seatmap"
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add section form */}
            {showAddForm ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col gap-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">New Section</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-0.5 block">Label</label>
                    <input type="text" placeholder="e.g. 325"
                      value={addForm.label}
                      onChange={(e) => handleAddFormChange("label", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-0.5 block">Tier</label>
                    <select value={addForm.tier}
                      onChange={(e) => handleAddFormChange("tier", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]">
                      {TIERS.map((t) => <option key={t.key} value={t.key}>{t.key}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {["x","y","w","h"].map((f) => (
                    <div key={f}>
                      <label className="text-xs text-gray-500 mb-0.5 block uppercase">{f}</label>
                      <input type="number" value={addForm[f]}
                        onChange={(e) => handleAddFormChange(f, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#800020]"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">Canvas is 700×572. Drag sections on the preview to reposition after adding.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowAddForm(false); setAddForm(BLANK_FORM); }}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
                    Cancel
                  </button>
                  <button type="button" onClick={handleAddSection}
                    disabled={!addForm.label.trim()}
                    className="flex-1 py-2 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg text-sm transition disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-sm text-[#800020] hover:underline font-medium">
                <Plus size={14} /> Add section
              </button>
            )}

            {secSaved && (
              <p className="text-sm text-green-600 font-medium">Sections saved — seatmap updated.</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate("/admin")}
                className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={secSaving}
                className="flex-1 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition disabled:opacity-50 text-sm">
                {secSaving ? "Saving…" : "Save Sections"}
              </button>
            </div>
          </form>
        )}

        {/* ── History tab ──────────────────────────────────────────────── */}
        {tab === "History" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-700">
              {history.length === 0 ? "No changes yet" : `${history.length} change${history.length !== 1 ? "s" : ""}`}
            </p>

            {history.length === 0 && (
              <div className="text-center text-gray-400 py-10 text-sm">
                Changes you make to sections will appear here.
              </div>
            )}

            <div className="flex flex-col gap-2">
              {[...history].reverse().map((entry, reversedIdx) => {
                const idx  = history.length - 1 - reversedIdx;
                const meta = ACTION_META[entry.action] ?? ACTION_META.moved;
                return (
                  <div key={idx} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 font-medium truncate">
                      Section {entry.label}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 mr-2">{formatAge(entry.timestamp)}</span>
                    <button
                      onClick={() => handleUndoTo(idx)}
                      className="flex items-center gap-1 text-xs font-medium text-[#800020] hover:underline shrink-0 transition"
                    >
                      <Undo2 size={11} /> Undo
                    </button>
                  </div>
                );
              })}
            </div>

            {history.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Undoing an older change also removes all newer changes from history.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Right panel: interactive preview ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Live Preview</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Move size={12} /> Drag sections to reposition
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SeatmapPreview
            visualSecs={visualSecs}
            onDragStart={handleDragStart}
            onSectionMove={handleSectionMove}
            onDragEnd={handleDragEnd}
          />
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-3">
          {TIERS.map(({ key, label, hex }) => {
            const visible = visualSecs.filter((s) => dataSectionToTier(s.dataSection) === key && !s.hidden).length;
            const hidden  = visualSecs.filter((s) => dataSectionToTier(s.dataSection) === key && s.hidden).length;
            if (visible + hidden === 0) return null;
            return (
              <div key={key} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-400">{visible} visible{hidden > 0 ? `, ${hidden} hidden` : ""}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Deleted sections are removed entirely. Hidden sections show gray and are non-clickable. Drag any section to reposition it. Save when done.
        </p>
      </div>
    </div>
  );
}
