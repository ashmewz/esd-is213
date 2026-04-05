import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, XCircle, Clock, CreditCard, ArrowRightLeft, RefreshCcw } from "lucide-react";
import { getSwapDetails, getSwapPayments } from "../api";

const STATUS_STYLES = {
  MATCHED:             "bg-blue-100 text-blue-800",
  PENDING_RESPONSE:    "bg-violet-100 text-violet-800",
  READY_FOR_EXECUTION: "bg-indigo-100 text-indigo-800",
  SWAP_EXECUTED:       "bg-emerald-100 text-emerald-800",
  SWAP_COMPLETED:      "bg-emerald-100 text-emerald-800",
  FAILED:              "bg-red-100 text-red-700",
  CANCELLED:           "bg-gray-200 text-gray-700",
};

const PAYMENT_STATUS_STYLES = {
  SETTLED:  "bg-emerald-100 text-emerald-800",
  REFUNDED: "bg-blue-100 text-blue-800",
  FAILED:   "bg-red-100 text-red-700",
  PENDING:  "bg-amber-100 text-amber-800",
};

function formatSGD(amount) {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(amount ?? 0);
}

function TimelineStep({ icon: Icon, title, subtitle, status, isLast }) {
  const done = status === "done";
  const active = status === "active";
  const failed = status === "failed";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          failed ? "bg-red-100 text-red-600"
          : done  ? "bg-emerald-100 text-emerald-600"
          : active ? "bg-blue-100 text-blue-600"
          : "bg-gray-100 text-gray-400"
        }`}>
          <Icon size={15} />
        </div>
        {!isLast && <div className={`w-px flex-1 mt-1 ${done ? "bg-emerald-200" : "bg-gray-200"}`} />}
      </div>
      <div className="pb-6 min-w-0">
        <p className={`text-sm font-semibold ${failed ? "text-red-700" : done ? "text-gray-900" : active ? "text-blue-700" : "text-gray-400"}`}>
          {title}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function buildTimeline(swap, confirmations) {
  const status = (swap?.status ?? "").toUpperCase();
  const isFailed = status === "FAILED" || status === "CANCELLED";
  const isComplete = status === "SWAP_COMPLETED" || status === "SWAP_EXECUTED";

  const confirms = confirmations ?? [];
  const acceptCount = confirms.filter((c) => c.status === "ACCEPT").length;
  const declineCount = confirms.filter((c) => c.status === "DECLINE").length;
  const bothAccepted = acceptCount >= 2;

  return [
    {
      icon: ArrowRightLeft,
      title: "Swap match found",
      subtitle: "Both requests were paired together",
      status: "done",
    },
    {
      icon: Clock,
      title: "Awaiting responses",
      subtitle: `${acceptCount} of 2 accepted${declineCount > 0 ? " · 1 declined" : ""}`,
      status: isComplete || bothAccepted ? "done" : isFailed && declineCount > 0 ? "failed" : "active",
    },
    {
      icon: CreditCard,
      title: "Payment settlement",
      subtitle: "Price difference charged via Stripe",
      status: isComplete ? "done" : bothAccepted && !isFailed ? "active" : "pending",
    },
    {
      icon: ArrowRightLeft,
      title: "Seat exchange",
      subtitle: "Seat assignments updated",
      status: isComplete ? "done" : isFailed ? "failed" : "pending",
    },
    {
      icon: CheckCircle2,
      title: "Completed",
      subtitle: isComplete ? "Swap finalised successfully" : isFailed ? "Swap was not completed" : "Pending",
      status: isComplete ? "done" : isFailed ? "failed" : "pending",
    },
  ];
}

export default function SwapDetailPage() {
  const { swapId } = useParams();
  const navigate = useNavigate();

  const [swapData,  setSwapData]  = useState(null);
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [detail, pmts] = await Promise.all([
        getSwapDetails(swapId),
        getSwapPayments(swapId),
      ]);
      setSwapData(detail);
      setPayments(pmts);
    } catch (err) {
      setError(err.message || "Could not load swap details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [swapId]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-140px)] flex items-center justify-center text-gray-400 text-sm">
        Loading swap details...
      </main>
    );
  }

  if (error || !swapData) {
    return (
      <main className="min-h-[calc(100vh-140px)] px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700 font-semibold">{error || "Swap not found."}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-gray-600 underline">Go back</button>
        </div>
      </main>
    );
  }

  const { swap, confirmations, status: evalStatus } = swapData;
  const overallStatus = (swap?.status ?? evalStatus ?? "").toUpperCase();
  const isFailed = overallStatus === "FAILED" || overallStatus === "CANCELLED";
  const isComplete = overallStatus === "SWAP_COMPLETED" || overallStatus === "SWAP_EXECUTED";
  const timeline = buildTimeline(swap, confirmations);

  const settledPayment = payments.find((p) => p.transactionType === "SWAP_CHARGE" && p.status === "SETTLED");
  const refundPayment  = payments.find((p) => p.transactionType === "SWAP_REFUND");

  return (
    <main className="min-h-[calc(100vh-140px)] bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#800020] transition"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <RefreshCcw size={12} /> Refresh
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link to="/" className="text-[#1d4ed8] underline underline-offset-2">Home</Link>
          <span className="text-gray-300">/</span>
          <Link to="/swap" className="text-[#1d4ed8] underline underline-offset-2">Swap Tickets</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-mono text-xs">{swapId}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left column ── */}
          <div className="space-y-6">
            {/* Status card */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`rounded-2xl p-3 ${isComplete ? "bg-emerald-100 text-emerald-600" : isFailed ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                  {isComplete ? <CheckCircle2 size={22} /> : isFailed ? <XCircle size={22} /> : <ArrowRightLeft size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Swap Match</p>
                  <h1 className="mt-1 text-xl font-bold text-gray-900">
                    {isComplete ? "Swap completed" : isFailed ? "Swap failed" : "Swap in progress"}
                  </h1>
                  <p className="mt-1 text-xs font-mono text-gray-400">{swapId}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[overallStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {overallStatus.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Swap parties */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Seat Exchange</h2>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                  <p className="text-xs text-gray-400 mb-1">Request A</p>
                  <p className="font-semibold text-gray-900">{swap?.requestA?.slice(0, 8) ?? "—"}</p>
                </div>
                <ArrowRightLeft size={18} className="text-gray-400 shrink-0" />
                <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                  <p className="text-xs text-gray-400 mb-1">Request B</p>
                  <p className="font-semibold text-gray-900">{swap?.requestB?.slice(0, 8) ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Confirmations */}
            {confirmations && confirmations.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4">User Responses</h2>
                <div className="space-y-3">
                  {confirmations.map((c, i) => (
                    <div key={c.confirmationId ?? i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-mono text-xs">{c.userId?.slice(0, 12)}...</span>
                      <div className="flex items-center gap-2">
                        {c.respondedAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(c.respondedAt).toLocaleString("en-SG")}
                          </span>
                        )}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.status === "ACCEPT"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment records */}
            {payments.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4">Payment Records</h2>
                <div className="space-y-4">
                  {payments.map((p) => (
                    <div key={p.transactionId} className="rounded-2xl bg-gray-50 p-4 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {p.transactionType === "SWAP_CHARGE" ? "Settlement charge" : "Refund"}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-500">
                        <p><span className="font-medium text-gray-700">Amount:</span> {formatSGD(p.amount)}</p>
                        <p><span className="font-medium text-gray-700">Stripe ID:</span>{" "}
                          <span className="font-mono">{p.stripePaymentIntentId ?? "—"}</span>
                        </p>
                        <p><span className="font-medium text-gray-700">Date:</span>{" "}
                          {p.createdAt ? new Date(p.createdAt).toLocaleString("en-SG") : "—"}
                        </p>
                        {p.transactionType === "SWAP_CHARGE" && p.status === "REFUNDED" && (
                          <p className="text-blue-600 font-medium">Refunded to original payment method</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Refund notice */}
                {isFailed && settledPayment && !refundPayment && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    A refund for {formatSGD(settledPayment.amount)} is being processed to your original payment method.
                    Please allow 3–5 business days.
                  </div>
                )}
                {refundPayment && (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Refund of {formatSGD(refundPayment.amount)} issued.
                    Reference: <span className="font-mono">{refundPayment.stripePaymentIntentId}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column: timeline ── */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
            <h2 className="text-base font-bold text-gray-900 mb-6">Progress</h2>
            <div>
              {timeline.map((step, i) => (
                <TimelineStep
                  key={i}
                  icon={step.icon}
                  title={step.title}
                  subtitle={step.subtitle}
                  status={step.status}
                  isLast={i === timeline.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}