import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, CheckCircle2, RefreshCcw, XCircle } from "lucide-react";
import {
  getMyOrders,
  getMySwapRequests,
  createSwapRequest,
  cancelSwapRequest,
  respondToSwapRequest,
} from "../api";
import { useAuth } from "../context/AuthContext";

const TIER_OPTIONS = ["VIP", "CAT1", "CAT2", "CAT3"];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  matched: "bg-blue-100 text-blue-800",
  awaiting_confirmation: "bg-violet-100 text-violet-800",
  cancelled: "bg-gray-200 text-gray-700",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
};

export default function SwapPage() {
  const { currentUserId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedTicketKey, setSelectedTicketKey] = useState("");
  const [desiredTier, setDesiredTier] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingRequestId, setActingRequestId] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [orderData, requestData] = await Promise.all([
        getMyOrders(currentUserId),
        getMySwapRequests(currentUserId),
      ]);
      setOrders(orderData);
      setRequests(requestData);
    } catch (err) {
      setError(err.message || "Could not load swap data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const eligibleTickets = useMemo(() => (
    orders.flatMap((order) =>
      order.items.map((item, index) => ({
        key: `${order.orderId}-${item.seatId}-${index}`,
        orderId: order.orderId,
        eventId: order.eventId,
        eventName: order.eventName,
        seatId: item.seatId,
        currentTier: item.tier,
        seatLabel: item.seatLabel || `Section ${item.sectionNo} · Row ${item.rowNo} · Seat ${item.seatNo}`,
      }))
    )
  ), [orders]);

  const selectedTicket = eligibleTickets.find((ticket) => ticket.key === selectedTicketKey) ?? null;
  const desiredTierOptions = selectedTicket
    ? TIER_OPTIONS.filter((tier) => tier !== selectedTicket.currentTier)
    : [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTicket || !desiredTier) return;

    setSubmitting(true);
    setError("");
    try {
      await createSwapRequest({
        userId: currentUserId,
        orderId: selectedTicket.orderId,
        eventId: selectedTicket.eventId,
        eventName: selectedTicket.eventName,
        seatId: selectedTicket.seatId,
        currentTier: selectedTicket.currentTier,
        currentSeatLabel: selectedTicket.seatLabel,
        desiredTier,
      });

      setSelectedTicketKey("");
      setDesiredTier("");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not submit swap request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId) {
    try {
      setActingRequestId(requestId);
      setError("");
      await cancelSwapRequest(requestId);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not cancel swap request.");
    } finally {
      setActingRequestId("");
    }
  }

  async function handleRespond(requestId, response) {
    try {
      setActingRequestId(requestId);
      setError("");
      await respondToSwapRequest(requestId, currentUserId, response);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not update swap response.");
    } finally {
      setActingRequestId("");
    }
  }

  return (
    <main className="min-h-[calc(100vh-140px)] bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center gap-3 text-sm">
          <Link to="/" className="text-[#1d4ed8] underline underline-offset-2">
            Home
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700">Swap Tickets</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#fff1f5] p-3 text-[#800020]">
                <ArrowRightLeft size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Swap Tickets</h1>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Pick one of your purchased seats and submit a request to swap into a different tier.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ticket to swap</label>
                <select
                  value={selectedTicketKey}
                  onChange={(e) => {
                    setSelectedTicketKey(e.target.value);
                    setDesiredTier("");
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020]"
                >
                  <option value="">Select a purchased ticket</option>
                  {eligibleTickets.map((ticket) => (
                    <option key={ticket.key} value={ticket.key}>
                      {ticket.eventName} · {ticket.seatLabel} · {ticket.currentTier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Desired tier</label>
                <select
                  value={desiredTier}
                  onChange={(e) => setDesiredTier(e.target.value)}
                  disabled={!selectedTicket}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020] disabled:bg-gray-50"
                >
                  <option value="">Choose a different tier</option>
                  {desiredTierOptions.map((tier) => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </div>

              {selectedTicket && (
                <div className="rounded-2xl border border-[#ead7dd] bg-[#fff8fa] p-4 text-sm text-gray-700">
                  <p><span className="font-semibold text-gray-900">Current ticket:</span> {selectedTicket.seatLabel}</p>
                  <p className="mt-1"><span className="font-semibold text-gray-900">Current tier:</span> {selectedTicket.currentTier}</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedTicket || !desiredTier || submitting}
                className="rounded-xl bg-[#800020] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6a001a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Request Swap"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-[#fcfbfb] p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Swap Requests</h2>
                <p className="mt-1 text-sm text-gray-500">Track status, review offers, and complete responses here.</p>
              </div>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCcw size={15} />
                Refresh
              </button>
            </div>

            {loading && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-400">
                Loading swap requests...
              </div>
            )}

            {!loading && requests.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
                <p className="text-sm font-semibold text-gray-800">No swap requests yet.</p>
                <p className="mt-2 text-sm text-gray-500">Submit your first request from the form on the left.</p>
              </div>
            )}

            {!loading && requests.length > 0 && (
              <div className="mt-6 space-y-4">
                {requests.map((request) => {
                  const canCancel = request.swapStatus === "pending";
                  const canRespond = request.swapStatus === "awaiting_confirmation";
                  return (
                    <article key={request.requestId} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{request.eventName}</p>
                          <p className="mt-1 text-sm text-gray-500">{request.currentSeatLabel}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[request.swapStatus] ?? "bg-gray-200 text-gray-700"}`}>
                          {request.swapStatus.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-gray-600">
                        <p><span className="font-semibold text-gray-900">Order:</span> {request.orderId}</p>
                        <p><span className="font-semibold text-gray-900">Current tier:</span> {request.currentTier}</p>
                        <p><span className="font-semibold text-gray-900">Requested tier:</span> {request.desiredTier}</p>
                      </div>

                      {request.swapStatus === "awaiting_confirmation" && (
                        <div className="mt-4 rounded-2xl border border-[#dbe5ff] bg-[#f5f8ff] p-4 text-sm text-gray-700">
                          <p>
                            <span className="font-semibold text-gray-900">Matched seat:</span>{" "}
                            {request.matchedSeatLabel}
                          </p>
                          <p className="mt-1">
                            <span className="font-semibold text-gray-900">Matched tier:</span>{" "}
                            {request.matchedTier}
                          </p>
                          <p className="mt-1">
                            <span className="font-semibold text-gray-900">Price adjustment:</span>{" "}
                            {request.priceDelta > 0 ? `Top up SGD ${request.priceDelta}` : request.priceDelta < 0 ? `Refund SGD ${Math.abs(request.priceDelta)}` : "No additional payment required"}
                          </p>
                          <p className="mt-1">
                            <span className="font-semibold text-gray-900">Offer expires:</span>{" "}
                            {new Date(request.offerExpiresAt).toLocaleString("en-SG")}
                          </p>
                        </div>
                      )}

                      {(request.swapStatus === "completed" || request.swapStatus === "failed") && request.outcomeMessage && (
                        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                          request.swapStatus === "completed"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border border-red-200 bg-red-50 text-red-700"
                        }`}>
                          {request.outcomeMessage}
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-3">
                        {canRespond && (
                          <>
                            <button
                              onClick={() => handleRespond(request.requestId, "accept")}
                              disabled={actingRequestId === request.requestId}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a001a] disabled:opacity-50"
                            >
                              <CheckCircle2 size={15} />
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleRespond(request.requestId, "decline")}
                              disabled={actingRequestId === request.requestId}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <XCircle size={15} />
                              Decline Offer
                            </button>
                          </>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleCancel(request.requestId)}
                            disabled={actingRequestId === request.requestId}
                            className="inline-flex items-center gap-2 text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
