import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, RefreshCcw, Shuffle, Ticket, Wallet } from "lucide-react";
import { getMyNotifications } from "../api";
import { useAuth } from "../context/AuthContext";

const TYPE_META = {
  PURCHASE_CONFIRMED: {
    label: "Purchase",
    icon: Ticket,
    tone: "bg-[#fff1f5] text-[#800020]",
  },
  SEAT_REASSIGNED: {
    label: "Seat Change",
    icon: RefreshCcw,
    tone: "bg-blue-50 text-blue-700",
  },
  REFUND_ISSUED: {
    label: "Refund",
    icon: Wallet,
    tone: "bg-amber-50 text-amber-700",
  },
  SWAP_REQUESTED: {
    label: "Swap",
    icon: Shuffle,
    tone: "bg-violet-50 text-violet-700",
  },
  SWAP_MATCHED: {
    label: "Swap Match",
    icon: Bell,
    tone: "bg-sky-50 text-sky-700",
  },
  SWAP_COMPLETED: {
    label: "Swap Complete",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700",
  },
  SWAP_FAILED: {
    label: "Swap Failed",
    icon: Bell,
    tone: "bg-red-50 text-red-700",
  },
  SWAP_CANCELLED: {
    label: "Swap Cancelled",
    icon: Bell,
    tone: "bg-gray-100 text-gray-700",
  },
};

function formatTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { currentUserId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await getMyNotifications(currentUserId);
      setNotifications(data);
    } catch (err) {
      setError(err.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [currentUserId]);

  const summary = useMemo(() => ({
    total: notifications.length,
    purchases: notifications.filter((item) => item.type === "PURCHASE_CONFIRMED").length,
    actionNeeded: notifications.filter((item) => item.type === "SWAP_MATCHED").length,
  }), [notifications]);

  return (
    <main className="min-h-[calc(100vh-140px)] bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center gap-3 text-sm">
          <Link to="/" className="text-[#1d4ed8] underline underline-offset-2">
            Home
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700">Notifications</span>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#800020]/70">Activity Feed</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Keep track of purchases, seat updates, refunds, and swap progress in one place.
              </p>
            </div>

            <button
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SummaryCard label="All Notifications" value={summary.total} />
            <SummaryCard label="Purchase Updates" value={summary.purchases} />
            <SummaryCard label="Action Needed" value={summary.actionNeeded} />
          </div>

          {loading && (
            <div className="mt-10 rounded-3xl border border-dashed border-gray-300 px-6 py-16 text-center text-sm text-gray-400">
              Loading notifications...
            </div>
          )}

          {!loading && error && (
            <div className="mt-10 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="mt-10 rounded-3xl border border-dashed border-gray-300 px-6 py-16 text-center">
              <p className="text-sm font-semibold text-gray-800">No notifications yet.</p>
              <p className="mt-2 text-sm text-gray-500">
                Complete a booking or create a swap request to start generating activity here.
              </p>
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <div className="mt-10 space-y-4">
              {notifications.map((notification) => {
                const meta = TYPE_META[notification.type] ?? TYPE_META.PURCHASE_CONFIRMED;
                const Icon = meta.icon;
                return (
                  <article
                    key={notification.notificationId}
                    className="rounded-2xl border border-gray-200 bg-[#fcfbfb] p-5 transition hover:border-[#ead7dd]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`rounded-2xl p-3 ${meta.tone}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900">{notification.title}</h2>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-600">{notification.message}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-400">
                            {formatTimestamp(notification.createdAt)}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={notification.route || "/"}
                        className="inline-flex items-center justify-center rounded-xl border border-[#800020] px-4 py-2 text-sm font-medium text-[#800020] transition hover:bg-[#fff7f9]"
                      >
                        View
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
