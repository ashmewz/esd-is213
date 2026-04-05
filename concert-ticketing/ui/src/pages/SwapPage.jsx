import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRightLeft, CheckCircle2, RefreshCcw, XCircle, CreditCard, ChevronRight } from "lucide-react";
import {
  getMyOrders,
  getMySwapRequests,
  createSwapRequest,
  cancelSwapRequest,
  respondToSwapRequest,
} from "../api";
import { useAuth } from "../context/AuthContext";

const TIER_OPTIONS = ["VIP", "CAT1", "CAT2", "CAT3"];

const TIER_LABELS = {
  VIP: "VIP",
  CAT1: "CAT 1",
  CAT2: "CAT 2",
  CAT3: "CAT 3",
};

const STATUS_STYLES = {
  pending:                "bg-amber-100 text-amber-800",
  matched:                "bg-blue-100 text-blue-800",
  awaiting_confirmation:  "bg-violet-100 text-violet-800",
  ready_for_execution:    "bg-indigo-100 text-indigo-800",
  cancelled:              "bg-gray-200 text-gray-700",
  completed:              "bg-emerald-100 text-emerald-800",
  failed:                 "bg-red-100 text-red-700",
  expired:                "bg-gray-200 text-gray-500",
};

const STATUS_LABELS = {
  pending:               "Waiting for match",
  matched:               "Match found",
  awaiting_confirmation: "Awaiting response",
  ready_for_execution:   "Processing",
  cancelled:             "Cancelled",
  completed:             "Completed",
  failed:                "Failed",
  expired:               "Expired",
};

// ── Stripe card input (mock) ──────────────────────────────────────────────────
// In production replace this with @stripe/react-stripe-js <CardElement />.
// This mock collects a test card number and returns a fake pm_... token.
function MockStripeCardInput({ onToken, disabled }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [error,      setError]      = useState("");

  function handleConfirm() {
    setError("");
    const digits = cardNumber.replace(/\s/g, "");
    if (!/^\d{16}$/.test(digits)) { setError("Enter a valid 16-digit card number"); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { setError("Use MM/YY format"); return; }
    if (!/^\d{3,4}$/.test(cvv)) { setError("Enter a valid CVV"); return; }

    // In production: use Stripe.js stripe.createPaymentMethod({ type:'card', card: cardElement })
    // Here we map known test numbers to Stripe test PaymentMethod IDs:
    const last4 = digits.slice(-4);
    const PM_MAP = {
      "4242": "pm_card_visa",            // success
      "9995": "pm_card_visa_debit",      // insufficient funds (will fail)
      "0002": "pm_card_chargeDeclined",  // declined
    };
    const pm = PM_MAP[last4] ?? `pm_test_${digits.slice(-8)}`;
    onToken(pm);
  }

  const base = "w-full border-b py-2 text-sm outline-none transition focus:border-[#800020] border-gray-300 bg-transparent";

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Card Details</p>
      <input
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value.replace(/[^\d]/g, "").replace(/(.{4})/g, "$1 ").trim())}
        placeholder="1234 5678 9012 3456"
        disabled={disabled}
        maxLength={19}
        className={base}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={expiry}
          onChange={(e) => {
            let v = e.target.value.replace(/[^\d]/g, "");
            if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
            setExpiry(v);
          }}
          placeholder="MM/YY"
          disabled={disabled}
          maxLength={5}
          className={base}
        />
        <input
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
          placeholder="CVV"
          disabled={disabled}
          maxLength={4}
          className={base}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Test: use <code className="font-mono">4242 4242 4242 4242</code> to succeed,{" "}
        <code className="font-mono">...9995</code> to fail.
      </div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={disabled}
        className="w-full rounded-xl bg-[#800020] py-2.5 text-sm font-semibold text-white transition hover:bg-[#6a001a] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <CreditCard size={15} />
        Confirm Payment &amp; Accept Swap
      </button>
    </div>
  );
}

// ── Match offer panel ─────────────────────────────────────────────────────────
function MatchOfferPanel({ request, userId, onRespond, acting }) {
  const [showCard, setShowCard] = useState(false);
  const hasDelta = request.priceDelta && request.priceDelta !== 0;
  const needsPayment = hasDelta && request.priceDelta > 0;

  async function handleAccept(paymentMethodId = null) {
    await onRespond(request.swapId, "ACCEPT", { paymentMethodId });
  }

  async function handleDecline() {
    await onRespond(request.swapId, "DECLINE", {});
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#dbe5ff] bg-[#f5f8ff] p-4 text-sm text-gray-700">
      <p className="font-semibold text-gray-900 mb-3">Swap offer details</p>

      <div className="space-y-1.5">
        <p><span className="font-medium text-gray-600">Their seat:</span> {request.matchedSeatLabel ?? request.matchedSeatId ?? "—"}</p>
        <p><span className="font-medium text-gray-600">Their tier:</span> {TIER_LABELS[request.matchedTier] ?? request.matchedTier ?? "—"}</p>
        <p>
          <span className="font-medium text-gray-600">Price adjustment:</span>{" "}
          {!hasDelta
            ? "No additional payment required"
            : request.priceDelta > 0
            ? <span className="text-amber-700 font-semibold">You pay SGD {request.priceDelta.toFixed(2)}</span>
            : <span className="text-emerald-700 font-semibold">You receive SGD {Math.abs(request.priceDelta).toFixed(2)} refund</span>
          }
        </p>
        {request.offerExpiresAt && (
          <p className="text-xs text-gray-400">
            Offer expires: {new Date(request.offerExpiresAt).toLocaleString("en-SG")}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {needsPayment ? (
          <>
            {!showCard ? (
              <button
                onClick={() => setShowCard(true)}
                disabled={acting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white hover:bg-[#6a001a] disabled:opacity-50"
              >
                <CreditCard size={15} />
                Accept &amp; Pay SGD {request.priceDelta.toFixed(2)}
              </button>
            ) : (
              <MockStripeCardInput
                disabled={acting}
                onToken={(pm) => handleAccept(pm)}
              />
            )}
          </>
        ) : (
          <button
            onClick={() => handleAccept(null)}
            disabled={acting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white hover:bg-[#6a001a] disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            Accept Swap
          </button>
        )}

        <button
          onClick={handleDecline}
          disabled={acting}
          className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <XCircle size={15} />
          Decline
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SwapPage() {
  const { currentUserId, user } = useAuth();
  if (!user) {
  return (
    <div className="p-10 text-center text-gray-600">
      Please log in to access ticket swaps.
    </div>
  );
  }
  const navigate = useNavigate();

  const [orders,            setOrders]           = useState([]);
  const [requests,          setRequests]          = useState([]);
  const [selectedTicketKey, setSelectedTicketKey] = useState("");
  const [desiredTier,       setDesiredTier]       = useState("");
  const [loading,           setLoading]           = useState(true);
  const [submitting,        setSubmitting]        = useState(false);
  const [actingSwapId,      setActingSwapId]      = useState("");
  const [error,             setError]             = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    
    console.log("SwapPage userId:", currentUserId);
    if (!currentUserId) {
      setError("User ID is missing or invalid.");
      setLoading(false);
      return; 
    }

    try {
      const [orderData, requestData] = await Promise.all([
        getMyOrders(currentUserId), 
        getMySwapRequests(currentUserId),
      ]);
      
      // Update state if data is valid
      setOrders(Array.isArray(orderData) ? orderData : []);
      setRequests(Array.isArray(requestData) ? requestData : []);
    } catch (err) {
      setError(err.message || "Could not load swap data.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Only CONFIRMED orders with a known tier are eligible for swapping
  const eligibleTickets = useMemo(() => (
    orders
      .filter((o) => (o.status || "").toLowerCase() === "confirmed")
      .flatMap((order) =>
        (order.items ?? []).map((item, index) => ({
          key: `${order.orderId}-${item.seatId}-${index}`,
          orderId:    order.orderId,
          eventId:    order.eventId,
          eventName:  order.eventName,
          seatId:     item.seatId,
          currentTier: item.tier,
          seatLabel:  item.seatLabel
            || `Section ${item.sectionNo} · Row ${item.rowNo} · Seat ${item.seatNo}`,
        }))
      )
  ), [orders]);

  const selectedTicket = eligibleTickets.find((t) => t.key === selectedTicketKey) ?? null;
  const desiredTierOptions = selectedTicket
    ? TIER_OPTIONS.filter((t) => t !== selectedTicket.currentTier)
    : [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTicket || !desiredTier) return;
    setSubmitting(true);
    setError("");
    try {
      await createSwapRequest({
        orderId:     selectedTicket.orderId,
        eventId:     selectedTicket.eventId,
        seatId:      selectedTicket.seatId,
        currentTier: selectedTicket.currentTier,
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
    setActingSwapId(requestId);
    setError("");
    try {
      await cancelSwapRequest(requestId);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not cancel swap request.");
    } finally {
      setActingSwapId("");
    }
  }

  async function handleRespond(swapId, response, options = {}) {
    setActingSwapId(swapId);
    setError("");
    try {
      await respondToSwapRequest(swapId, response, { userId: currentUserId, ...options });
      await loadData();
    } catch (err) {
      setError(err.message || "Could not update swap response.");
    } finally {
      setActingSwapId("");
    }
  }

  return (
    <main className="min-h-[calc(100vh-140px)] bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-10 flex items-center gap-3 text-sm">
          <Link to="/" className="text-[#1d4ed8] underline underline-offset-2">Home</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700">Swap Tickets</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ── Left: request form ── */}
          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#fff1f5] p-3 text-[#800020]">
                <ArrowRightLeft size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Swap Tickets</h1>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Pick one of your confirmed seats and request a swap into a different tier.
                  We'll match you with another user automatically.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Ticket to swap
                </label>
                <select
                  value={selectedTicketKey}
                  onChange={(e) => { setSelectedTicketKey(e.target.value); setDesiredTier(""); }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020]"
                >
                  <option value="">Select a confirmed ticket</option>
                  {eligibleTickets.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.eventName} · {t.seatLabel} · {TIER_LABELS[t.currentTier] ?? t.currentTier}
                    </option>
                  ))}
                </select>
                {eligibleTickets.length === 0 && !loading && (
                  <p className="mt-2 text-xs text-gray-400">
                    No confirmed tickets available for swapping.{" "}
                    <Link to="/tickets" className="underline text-[#800020]">View your tickets</Link>
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Desired tier
                </label>
                <select
                  value={desiredTier}
                  onChange={(e) => setDesiredTier(e.target.value)}
                  disabled={!selectedTicket}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020] disabled:bg-gray-50"
                >
                  <option value="">Choose a different tier</option>
                  {desiredTierOptions.map((t) => (
                    <option key={t} value={t}>{TIER_LABELS[t] ?? t}</option>
                  ))}
                </select>
              </div>

              {selectedTicket && (
                <div className="rounded-2xl border border-[#ead7dd] bg-[#fff8fa] p-4 text-sm text-gray-700">
                  <p><span className="font-semibold text-gray-900">Seat:</span> {selectedTicket.seatLabel}</p>
                  <p className="mt-1"><span className="font-semibold text-gray-900">Current tier:</span> {TIER_LABELS[selectedTicket.currentTier] ?? selectedTicket.currentTier}</p>
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

            {/* How it works */}
            <div className="mt-8 rounded-2xl bg-gray-50 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How it works</p>
              <ol className="space-y-2 text-sm text-gray-600 list-none">
                {[
                  "Submit a swap request for your seat and target tier.",
                  "We match you with a user who holds the tier you want and wants yours.",
                  "Both users receive a swap offer and must accept to proceed.",
                  "If tiers differ in price, the lower-tier holder pays the difference via Stripe.",
                  "Once confirmed and settled, seats are swapped instantly.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#800020] text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── Right: swap requests list ── */}
          <section className="rounded-3xl border border-gray-200 bg-[#fcfbfb] p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Swap Requests</h2>
                <p className="mt-1 text-sm text-gray-500">Review matches and respond to swap offers here.</p>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {loading && (
              <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-400">
                Loading...
              </div>
            )}

            {!loading && requests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
                <ArrowRightLeft size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-800">No swap requests yet.</p>
                <p className="mt-2 text-sm text-gray-500">Submit your first request from the form on the left.</p>
              </div>
            )}

            {!loading && requests.length > 0 && (
              <div className="space-y-4">
                {requests.map((request) => {
                  const status = (request.swapStatus ?? request.status ?? "").toLowerCase();
                  const canCancel  = status === "pending";
                  const canRespond = status === "awaiting_confirmation" || status === "matched";
                  const isDone     = status === "completed" || status === "failed" || status === "cancelled" || status === "expired";
                  const acting     = actingSwapId === (request.requestId ?? request.swapId);

                  return (
                    <article key={request.requestId ?? request.swapId} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {request.eventName ?? "Event"}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 truncate">
                            {request.currentSeatLabel ?? request.seatLabel ?? request.currentSeatId}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status] ?? "bg-gray-200 text-gray-700"}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                        <p><span className="font-medium text-gray-800">Current tier:</span> {TIER_LABELS[request.currentTier] ?? request.currentTier}</p>
                        <p><span className="font-medium text-gray-800">Want:</span> {TIER_LABELS[request.desiredTier] ?? request.desiredTier}</p>
                        <p className="col-span-2 text-gray-400 font-mono truncate">
                          {request.requestId ?? request.swapId}
                        </p>
                      </div>

                      {/* Match offer — shown when awaiting response */}
                      {canRespond && (
                        <MatchOfferPanel
                          request={request}
                          userId={currentUserId}
                          onRespond={handleRespond}
                          acting={acting}
                        />
                      )}

                      {/* Outcome message */}
                      {isDone && request.outcomeMessage && (
                        <div className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${
                          status === "completed"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border border-red-200 bg-red-50 text-red-700"
                        }`}>
                          {request.outcomeMessage}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {/* View full detail */}
                        {(request.swapId || request.matchId) && (
                          <button
                            onClick={() => navigate(`/swap/${request.swapId ?? request.matchId}`)}
                            className="inline-flex items-center gap-1.5 text-xs text-[#1d4ed8] hover:underline"
                          >
                            View details <ChevronRight size={12} />
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleCancel(request.requestId)}
                            disabled={acting}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <XCircle size={14} />
                            Cancel
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