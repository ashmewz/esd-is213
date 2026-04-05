import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { adminGetEvents, adminCreateEvent, adminUpdateEvent } from "../../api";

const EMPTY_DATE = () => ({ dateId: "", label: "", times: [""] });
const CARD_CROP_WIDTH = 360;
const CARD_CROP_HEIGHT = 240;
const VENUE_OPTIONS = [
  "Singapore National Stadium",
  "Singapore Indoor Stadium",
  "Mediacorp Theatre",
  "Capitol Theatre",
  "The Star Theatre",
  "Arena @ EXPO (Hall 7)",
];

function formatDateLabel(dateId) {
  if (!dateId) return "";
  const date = new Date(`${dateId}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatEventDateRange(dateEntries) {
  const validDates = dateEntries
    .map((entry) => entry.dateId)
    .filter(Boolean)
    .sort();

  if (validDates.length === 0) return "";

  const dates = validDates
    .map((value) => new Date(`${value}T00:00:00`))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (dates.length === 0) return "";

  const first = dates[0];
  const last = dates[dates.length - 1];

  const firstDay = new Intl.DateTimeFormat("en-SG", { weekday: "short" }).format(first);
  const lastDay = new Intl.DateTimeFormat("en-SG", { weekday: "short" }).format(last);
  const firstDate = new Intl.DateTimeFormat("en-SG", { day: "2-digit" }).format(first);
  const lastDate = new Intl.DateTimeFormat("en-SG", { day: "2-digit" }).format(last);
  const firstMonth = new Intl.DateTimeFormat("en-SG", { month: "short" }).format(first);
  const lastMonth = new Intl.DateTimeFormat("en-SG", { month: "short" }).format(last);
  const firstYear = first.getFullYear();
  const lastYear = last.getFullYear();

  if (validDates.length === 1) {
    return `${firstDay} ${firstDate} ${firstMonth} ${firstYear}`;
  }

  if (firstYear === lastYear && firstMonth === lastMonth) {
    return `${firstDay} ${firstDate} - ${lastDay} ${lastDate} ${lastMonth} ${lastYear}`;
  }

  if (firstYear === lastYear) {
    return `${firstDay} ${firstDate} ${firstMonth} - ${lastDay} ${lastDate} ${lastMonth} ${lastYear}`;
  }

  return `${firstDay} ${firstDate} ${firstMonth} ${firstYear} - ${lastDay} ${lastDate} ${lastMonth} ${lastYear}`;
}

function toTimeInputValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function toDisplayTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) return raw;

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildCropLayout(naturalWidth, naturalHeight, zoom, offsetX, offsetY) {
  if (!naturalWidth || !naturalHeight) {
    return {
      displayWidth: CARD_CROP_WIDTH,
      displayHeight: CARD_CROP_HEIGHT,
      left: 0,
      top: 0,
      maxOffsetX: 0,
      maxOffsetY: 0,
    };
  }

  const coverScale = Math.max(
    CARD_CROP_WIDTH / naturalWidth,
    CARD_CROP_HEIGHT / naturalHeight,
  );
  const displayWidth = naturalWidth * coverScale * zoom;
  const displayHeight = naturalHeight * coverScale * zoom;
  const maxOffsetX = Math.max(0, (displayWidth - CARD_CROP_WIDTH) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - CARD_CROP_HEIGHT) / 2);
  const safeOffsetX = clamp(offsetX, -maxOffsetX, maxOffsetX);
  const safeOffsetY = clamp(offsetY, -maxOffsetY, maxOffsetY);

  return {
    displayWidth,
    displayHeight,
    left: (CARD_CROP_WIDTH - displayWidth) / 2 + safeOffsetX,
    top: (CARD_CROP_HEIGHT - displayHeight) / 2 + safeOffsetY,
    maxOffsetX,
    maxOffsetY,
  };
}

export default function AdminEventForm() {
  const { eventId } = useParams(); // present when editing
  const navigate    = useNavigate();
  const isEdit      = Boolean(eventId);

  const [name,      setName]      = useState("");
  const [venueName, setVenueName] = useState("");
  const [status,    setStatus]    = useState("active");
  const [imageUrl,  setImageUrl]  = useState("");
  const [dates,     setDates]     = useState([EMPTY_DATE()]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [cropOpen,  setCropOpen]  = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropNaturalSize, setCropNaturalSize] = useState({ width: 0, height: 0 });
  const derivedDisplayDate = formatEventDateRange(dates);
  const cropLayout = buildCropLayout(
    cropNaturalSize.width,
    cropNaturalSize.height,
    cropZoom,
    cropOffsetX,
    cropOffsetY,
  );

  useEffect(() => {
    if (!isEdit) return;
    adminGetEvents().then((events) => {
      const ev = events.find((e) => String(e.eventId) === String(eventId));
      if (!ev) return;
      setName(ev.name);
      setVenueName(ev.venueName);
      setStatus(ev.status);
      setImageUrl(ev.imageUrl ?? "");
      setDates(ev.dates?.length > 0 ? ev.dates.map((d) => ({ ...d, times: [...d.times] })) : [EMPTY_DATE()]);
    });
  }, [eventId, isEdit]);

  function openCropper(source) {
    setCropSource(source);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropNaturalSize({ width: 0, height: 0 });
    setCropOpen(true);
  }

  function handleCropZoomChange(nextZoom) {
    const zoom = Number(nextZoom);
    const nextLayout = buildCropLayout(
      cropNaturalSize.width,
      cropNaturalSize.height,
      zoom,
      cropOffsetX,
      cropOffsetY,
    );
    setCropZoom(zoom);
    setCropOffsetX(clamp(cropOffsetX, -nextLayout.maxOffsetX, nextLayout.maxOffsetX));
    setCropOffsetY(clamp(cropOffsetY, -nextLayout.maxOffsetY, nextLayout.maxOffsetY));
  }

  function applyCrop() {
    if (!cropSource || !cropNaturalSize.width || !cropNaturalSize.height) {
      setCropOpen(false);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sx = Math.max(0, (-cropLayout.left / cropLayout.displayWidth) * cropNaturalSize.width);
      const sy = Math.max(0, (-cropLayout.top / cropLayout.displayHeight) * cropNaturalSize.height);
      const sw = Math.min(cropNaturalSize.width - sx, (CARD_CROP_WIDTH / cropLayout.displayWidth) * cropNaturalSize.width);
      const sh = Math.min(cropNaturalSize.height - sy, (CARD_CROP_HEIGHT / cropLayout.displayHeight) * cropNaturalSize.height);

      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      try {
        setImageUrl(canvas.toDataURL("image/jpeg", 0.92));
        setCropOpen(false);
      } catch {
        setError("Could not crop this image. Uploading a local file works best.");
      }
    };
    image.src = cropSource;
  }

  // ── Date/time helpers ────────────────────────────────────────────────────
  function updateDate(i, field, value) {
    setDates((prev) =>
      prev.map((d, idx) => {
        if (idx !== i) return d;
        const next = { ...d, [field]: value };
        if (field === "dateId") {
          next.label = formatDateLabel(value);
        }
        return next;
      })
    );
  }

  function updateTime(dateIdx, timeIdx, value) {
    setDates((prev) =>
      prev.map((d, i) =>
        i === dateIdx
          ? { ...d, times: d.times.map((t, ti) => ti === timeIdx ? toDisplayTime(value) : t) }
          : d
      )
    );
  }

  function addTime(dateIdx) {
    setDates((prev) =>
      prev.map((d, i) => i === dateIdx ? { ...d, times: [...d.times, ""] } : d)
    );
  }

  function removeTime(dateIdx, timeIdx) {
    setDates((prev) =>
      prev.map((d, i) =>
        i === dateIdx ? { ...d, times: d.times.filter((_, ti) => ti !== timeIdx) } : d
      )
    );
  }

  function addDate() {
    setDates((prev) => [...prev, EMPTY_DATE()]);
  }

  function removeDate(i) {
    setDates((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name,
        venueName,
        status,
        imageUrl,
        dates: dates.filter((d) => d.dateId && d.label),
      };
      if (isEdit) {
        await adminUpdateEvent(eventId, payload);
      } else {
        await adminCreateEvent(payload);
      }
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-1 text-gray-500 hover:text-[#800020] text-sm mb-6 transition"
      >
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? "Edit Event" : "Create Event"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Basic info */}
        <Field label="Event Name">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            className={inputCls} placeholder="e.g. Taylor Swift – The Eras Tour" required
          />
        </Field>

        <Field label="Venue">
          <select value={venueName} onChange={(e) => setVenueName(e.target.value)} className={inputCls} required>
            <option value="">Choose a venue</option>
            {VENUE_OPTIONS.map((venue) => (
              <option key={venue} value={venue}>
                {venue}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Image">
          <div className="flex flex-col gap-2">
            {/* Upload */}
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <span className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Upload image…
              </span>
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const src = ev.target.result;
                    setImageUrl(src);
                    openCropper(src);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {/* Or URL */}
            <input
              type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className={inputCls} placeholder="Or paste URL: /taylor.jpg or https://…"
            />
            {/* Preview */}
            {imageUrl && (
              <div className="flex flex-col gap-2">
                <img src={imageUrl} alt="preview" className="h-28 w-auto object-contain rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => openCropper(imageUrl)}
                  className="self-start rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Crop to Card
                </button>
              </div>
            )}
          </div>
        </Field>

        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="active">Live</option>
            <option value="upcoming">Upcoming</option>
            <option value="finished">Finished</option>
          </select>
        </Field>

        {/* Dates + times */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Dates &amp; Times</p>
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Card Date Preview</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">
              {derivedDisplayDate || "Select at least one date to generate the card date range."}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {dates.map((d, di) => (
              <div key={di} className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Date ID (YYYY-MM-DD)</label>
                    <input
                      type="date" value={d.dateId}
                      onChange={(e) => updateDate(di, "dateId", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Display Label</label>
                    <input
                      type="text" value={d.label}
                      readOnly
                      className={`${inputCls} bg-gray-50 text-gray-600`}
                      placeholder="Auto-generated from date"
                    />
                  </div>
                  {dates.length > 1 && (
                    <button type="button" onClick={() => removeDate(di)}
                      className="self-end pb-0.5 text-red-400 hover:text-red-600 transition">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-1">Times</p>
                <div className="flex flex-col gap-2">
                  {d.times.map((t, ti) => (
                    <div key={ti} className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={toTimeInputValue(t)}
                        onChange={(e) => updateTime(di, ti, e.target.value)}
                        className={`${inputCls} flex-1`}
                      />
                      {d.times.length > 1 && (
                        <button type="button" onClick={() => removeTime(di, ti)}
                          className="text-red-400 hover:text-red-600 transition">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addTime(di)}
                    className="self-start text-xs text-[#800020] hover:underline">
                    + Add time slot
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addDate}
            className="mt-3 flex items-center gap-1.5 text-sm text-[#800020] hover:underline font-medium">
            <Plus size={14} /> Add date
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate("/admin")}
            className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition disabled:opacity-50 text-sm">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </form>

      {cropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setCropOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900">Crop Event Image</h2>
            <p className="mt-1 text-sm text-gray-500">Adjust the image to fit the event card’s 3:2 ratio.</p>

            <div className="mt-5 flex flex-col gap-5">
              <div className="mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-gray-100" style={{ width: CARD_CROP_WIDTH, height: CARD_CROP_HEIGHT }}>
                {cropSource ? (
                  <img
                    src={cropSource}
                    alt="crop source"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setCropNaturalSize({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }}
                    style={{
                      position: "relative",
                      width: `${cropLayout.displayWidth}px`,
                      height: `${cropLayout.displayHeight}px`,
                      left: `${cropLayout.left}px`,
                      top: `${cropLayout.top}px`,
                      objectFit: "fill",
                      maxWidth: "none",
                    }}
                  />
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm text-gray-600">
                  Zoom
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.01"
                    value={cropZoom}
                    onChange={(e) => handleCropZoomChange(e.target.value)}
                    className="mt-2 w-full"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  Horizontal
                  <input
                    type="range"
                    min={-cropLayout.maxOffsetX}
                    max={cropLayout.maxOffsetX}
                    step="1"
                    value={clamp(cropOffsetX, -cropLayout.maxOffsetX, cropLayout.maxOffsetX)}
                    onChange={(e) => setCropOffsetX(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  Vertical
                  <input
                    type="range"
                    min={-cropLayout.maxOffsetY}
                    max={cropLayout.maxOffsetY}
                    step="1"
                    value={clamp(cropOffsetY, -cropLayout.maxOffsetY, cropLayout.maxOffsetY)}
                    onChange={(e) => setCropOffsetY(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCropOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  className="flex-1 rounded-lg bg-[#800020] py-3 text-sm font-semibold text-white hover:bg-[#6a001a] transition"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]";
