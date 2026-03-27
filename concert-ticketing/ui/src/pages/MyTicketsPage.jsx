import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Mail, Search, Ticket } from "lucide-react";
import { getMyOrders } from "../api";
import { useAuth } from "../context/AuthContext";

const ACCOUNT_LINKS = [
  { label: "My Tickets", to: "/tickets", active: true },
  { label: "Account Details", to: "/account", active: false },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Ticket Verification" },
  { value: "reassigned", label: "Completed" },
  { value: "refund_requested", label: "Dispute Raised" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

function formatDate(value) {
  if (!value) return { date: "Date TBC", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: value, time: "" };
  }

  return {
    date: parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("en-SG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase(),
  };
}

function formatStatus(status) {
  if (!status) return "Ticket Verification";
  if (status.toLowerCase() === "confirmed") return "Ticket Verification";
  if (status.toLowerCase() === "reassigned") return "Completed";
  if (status.toLowerCase() === "refunded") return "Refunded";
  if (status.toLowerCase() === "cancelled") return "Cancelled";
  return status;
}

export default function MyTicketsPage() {
  const { currentUserId, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getMyOrders(currentUserId);
      setOrders(data);
      if (data[0]) setExpandedOrderId((current) => current ?? data[0].orderId);
    } catch (err) {
      setError(err.message || "Could not load your tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [currentUserId]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        term === "" ||
        order.orderId.toLowerCase().includes(term) ||
        (order.eventName || "").toLowerCase().includes(term) ||
        (order.venueName || "").toLowerCase().includes(term);

      const normalizedStatus = (order.status || "confirmed").toLowerCase();
      const matchesFilter =
        selectedFilter === "all" ||
        normalizedStatus === selectedFilter ||
        (selectedFilter === "confirmed" && normalizedStatus === "confirmed");

      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, selectedFilter]);

  return (
    <main className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden min-h-[calc(100vh-140px)] w-[270px] shrink-0 border-r border-gray-200 px-8 py-8 lg:block">
          <p className="text-base font-black uppercase tracking-tight text-gray-900">My Account</p>
          <nav className="mt-10 flex flex-col gap-7">
            {ACCOUNT_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`block text-[14px] ${
                  item.active ? "font-semibold text-gray-900" : "text-gray-800 hover:text-[#800020]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 border-t border-gray-200 pt-6">
            <button
              onClick={logout}
              className="text-[14px] font-medium text-gray-800 transition hover:text-[#800020]"
            >
              Log out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-8 py-8 md:px-9 lg:px-10">
          <h1 className="text-lg font-bold text-gray-900 md:text-[24px]">My Tickets</h1>

          <div className="mt-6 flex max-w-[540px] overflow-hidden rounded-lg border border-gray-300 bg-white">
            <div className="flex items-center px-3 text-gray-400">
              <Search size={14} />
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="min-w-0 flex-1 px-1 py-2 text-xs text-gray-800 outline-none"
            />
            <button className="bg-[#2563eb] px-5 text-xs font-medium text-white transition hover:bg-[#1d4ed8]">
              Search
            </button>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <label className="text-sm text-gray-900">Filter by Status:</label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full max-w-[160px] rounded-lg border border-[#2563eb] px-3 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="mt-20 text-center text-base text-gray-400">
              Loading purchases...
            </div>
          )}

          {!loading && error && (
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && filteredOrders.length === 0 && (
            <div className="mt-20 flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="h-40 w-40 rounded-full bg-[#f5f7ff]" />
              <p className="mt-10 text-4xl font-bold text-gray-900">No Tickets</p>
              <p className="mt-4 max-w-xl text-base text-gray-500">
                No tickets match your current search or filter. Complete a booking and it will appear here.
              </p>
            </div>
          )}

          {!loading && !error && filteredOrders.length > 0 && (
            <div className="mt-8 space-y-4">
              {filteredOrders.map((order) => {
                const expanded = expandedOrderId === order.orderId;
                const dateTime = formatDate(order.createdAt);

                return (
                  <article key={order.orderId} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                            Order No.
                          </p>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {order.orderId}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-semibold text-gray-900">
                          {order.eventName || "Event booking"}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                          <p>{dateTime.date}{dateTime.time ? ` · ${dateTime.time}` : ""}</p>
                          <p>{order.venueName || "Venue TBC"}</p>
                          <p>{formatStatus(order.status)}</p>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                          <Mail size={14} />
                          <span>Payment</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-sm text-[#2563eb]">
                          <Ticket size={14} />
                          <span>Mobile Ticket</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={() => setExpandedOrderId(expanded ? null : order.orderId)}
                          className="inline-flex items-center gap-2 rounded-xl border-2 border-[#2563eb] px-5 py-2.5 text-base font-semibold text-[#2563eb] transition hover:bg-blue-50"
                        >
                          View Details
                          <ChevronDown size={18} className={`transition ${expanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-200 bg-[#fafafa] px-5 py-5">
                        <div className="max-w-[860px] rounded-xl border border-gray-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                            Ticket Details
                          </p>

                          <div className="mt-3 space-y-2.5 text-sm text-gray-700">
                            {order.scenarioBOutcome && (
                              <div
                                className={`rounded-md px-3 py-2.5 text-sm ${
                                  order.scenarioBOutcome === "reassigned"
                                    ? "border border-blue-200 bg-blue-50 text-blue-800"
                                    : "border border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                              >
                                {order.seatmapMessage}
                              </div>
                            )}

                            <p>
                              <span className="font-semibold text-gray-900">Venue:</span>{" "}
                              {order.venueName || "Venue TBC"}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-900">Event slot:</span>{" "}
                              {order.date || "Date TBC"}{order.time ? `, ${order.time}` : ""}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-900">Delivery:</span>{" "}
                              {String(order.deliveryMethod || "eticket").toUpperCase()}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-900">Email:</span>{" "}
                              {order.email || "Not available"}
                            </p>
                            {order.refundAmount ? (
                              <p>
                                <span className="font-semibold text-gray-900">Refund amount:</span>{" "}
                                SGD {Number(order.refundAmount).toFixed(2)}
                              </p>
                            ) : null}
                            {order.seatmapUpdatedAt ? (
                              <p>
                                <span className="font-semibold text-gray-900">Seat map update:</span>{" "}
                                {new Date(order.seatmapUpdatedAt).toLocaleString("en-SG")}
                              </p>
                            ) : null}

                            <div>
                              <p className="font-semibold text-gray-900">Seats:</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {order.items.map((item, index) => (
                                  <span
                                    key={`${order.orderId}-${item.seatId}-${index}`}
                                    className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs text-gray-700 ring-1 ring-gray-200"
                                  >
                                    {item.seatLabel || `Section ${item.sectionNo} · Row ${item.rowNo} · Seat ${item.seatNo}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
