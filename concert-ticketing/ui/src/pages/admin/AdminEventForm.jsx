import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { adminGetEvents, adminCreateEvent, adminUpdateEvent } from "../../api";

const VENUES = [
  "Singapore National Stadium",
  "Singapore Indoor Stadium",
  "Resorts World Theatre",
  "Mediacorp Theatre",
  "Capitol Theatre",
  "The Star Theatre",
  "Resorts World Ballroom",
  "Singapore EXPO Hall 7",
  "Fort Canning Park",
];

function autoLabel(dateId) {
  if (!dateId) return "";
  const d = new Date(dateId + "T00:00:00");
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_DATE = () => ({ dateId: "", label: "", times: [""] });

export default function AdminEventForm() {
  const { eventId } = useParams(); // present when editing
  const navigate    = useNavigate();
  const isEdit      = Boolean(eventId);

  const [name,      setName]      = useState("");
  const [venueName, setVenueName] = useState(VENUES[0]);
  const [status,    setStatus]    = useState("active");
  const [imageUrl,  setImageUrl]  = useState("");
  const [dates,     setDates]     = useState([EMPTY_DATE()]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!isEdit) return;
    adminGetEvents().then((events) => {
      const ev = events.find((e) => String(e.eventId) === String(eventId));
      if (!ev) return;
      setName(ev.name);
      setVenueName(ev.venueName ?? VENUES[0]);
      setStatus(ev.status);
      setImageUrl(ev.imageUrl ?? "");
      setDates(ev.dates?.length > 0 ? ev.dates.map((d) => ({ ...d, times: [...(d.times ?? [""])] })) : [EMPTY_DATE()]);
    });
  }, [eventId, isEdit]);

  // ── Date/time helpers ────────────────────────────────────────────────────
  function updateDate(i, field, value) {
    setDates((prev) => prev.map((d, idx) => {
      if (idx !== i) return d;
      const updated = { ...d, [field]: value };
      if (field === "dateId") updated.label = autoLabel(value);
      return updated;
    }));
  }

  function updateTime(dateIdx, timeIdx, value) {
    setDates((prev) =>
      prev.map((d, i) =>
        i === dateIdx
          ? { ...d, times: d.times.map((t, ti) => ti === timeIdx ? value : t) }
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
      const validDates = dates.filter((d) => d.dateId);
      const payload = {
        name,
        venueName,
        status,
        imageUrl,
        dates: validDates,
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
            {VENUES.map((v) => <option key={v} value={v}>{v}</option>)}
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
                  reader.onload = (ev) => setImageUrl(ev.target.result);
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
              <img src={imageUrl} alt="preview" className="h-28 w-auto object-contain rounded-lg border border-gray-200" />
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
                    <label className="text-xs text-gray-500 mb-1 block">Display Label (auto)</label>
                    <input
                      type="text" value={d.label} readOnly
                      className={`${inputCls} bg-gray-50 text-gray-500 cursor-default`} placeholder="Set date ID to auto-fill"
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
                        type="text" value={t}
                        onChange={(e) => updateTime(di, ti, e.target.value)}
                        className={`${inputCls} flex-1`} placeholder="7:30 PM"
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
