import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCcw,
  Clock,
} from "lucide-react";
import {
  getMyTickets,
  getMySwapRequests,
  createSwapRequest,
  cancelSwapRequest,
  respondToSwapRequest,
  getAvailableSwaps,
} from "../api";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES = {
  pending:               "bg-amber-100 text-amber-800",
  awaiting_confirmation: "bg-violet-100 text-violet-800",
  cancelled:             "bg-gray-200 text-gray-600",
  completed:             "bg-emerald-100 text-emerald-800",
  failed:                "bg-red-100 text-red-700",
};

// Returns { iAccepted, theyAccepted } from the confirmations array.
// confirmations = [{ userId, status }]
function parseConfirmations(confirmations = [], currentUserId) {
  const mine  = confirmations.find((c) => c.userId === currentUserId);
  const other = confirmations.find((c) => c.userId !== currentUserId);
  return {
    iAccepted:    mine?.status  === "ACCEPT",
    theyAccepted: other?.status === "ACCEPT",
  };
}

export default function SwapPage() {
  const { currentUserId } = useAuth();
  const [activeTab, setActiveTab] = useState("mine");

  // ── My Swap Requests tab ─────────────────────────────────────────────────────
  const [myListings, setMyListings]         = useState([]);
  const [incomingOffers, setIncomingOffers] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actingRequestId, setActingRequestId] = useState("");

  // ── List-my-seat form ────────────────────────────────────────────────────────
  const [tickets, setTickets]           = useState([]);
  const [showListForm, setShowListForm] = useState(false);
  const [listTicketKey, setListTicketKey] = useState("");
  const [desiredTier, setDesiredTier]   = useState("");
  const [listing, setListing]           = useState(false);

  // ── Browse tab ───────────────────────────────────────────────────────────────
  const [browseTicketKey, setBrowseTicketKey] = useState("");
  const [available, setAvailable]             = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [submitting, setSubmitting]           = useState(false);

  const [error, setError] = useState("");

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setError("");
    try {
      const data = await getMySwapRequests(currentUserId);
      const all  = Array.isArray(data) ? data : [];
      // Exclude completed from "my listings" tab (they go in history)
      setMyListings(all.filter((r) => r.swapStatus !== "completed"));
      // Incoming = awaiting_confirmation on MY listings (I need to respond)
      setIncomingOffers(all.filter((r) => r.swapStatus === "awaiting_confirmation"));
    } catch (err) {
      setError(err.message || "Could not load swap requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, [currentUserId]);

  const loadTickets = useCallback(async () => {
    try {
      const data = await getMyTickets(currentUserId);
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      // non-fatal
    }
  }, [currentUserId]);

  useEffect(() => {
    loadRequests();
    loadTickets();
  }, [loadRequests, loadTickets]);

  // ── Derived state ─────────────────────────────────────────────────────────────
  const eligibleTickets = tickets.map((t) => ({
    key:         `${t.orderId}-${t.seatId}`,
    orderId:     t.orderId,
    eventId:     t.eventId,
    eventName:   t.eventName,
    seatId:      t.seatId,
    currentTier: t.tier,
    seatLabel:   t.seatLabel || t.seatId,
  }));

  const listTicket   = eligibleTickets.find((t) => t.key === listTicketKey)   ?? null;
  const browseTicket = eligibleTickets.find((t) => t.key === browseTicketKey) ?? null;

  // ── Load available swaps when browse ticket changes ───────────────────────────
  useEffect(() => {
    if (!browseTicket) { setAvailable([]); return; }
    setLoadingAvailable(true);
    setError("");
    getAvailableSwaps(browseTicket.eventId, browseTicket.currentTier, currentUserId)
      .then((data) => setAvailable(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Could not load available swaps."))
      .finally(() => setLoadingAvailable(false));
  }, [browseTicketKey, browseTicket, currentUserId]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  async function handleListSeat() {
    if (!listTicket || !desiredTier) return;
    setListing(true);
    setError("");
    try {
      await createSwapRequest({
        userId:      currentUserId,
        orderId:     listTicket.orderId,
        eventId:     listTicket.eventId,
        currentSeatId: listTicket.seatId,
        currentTier: listTicket.currentTier,
        desiredTier,
      });
      setShowListForm(false);
      setListTicketKey("");
      setDesiredTier("");
      await loadRequests();
    } catch (err) {
      setError(err.message || "Could not list seat.");
    } finally {
      setListing(false);
    }
  }

  // Sending an offer = creating a new swap request that auto-matches with the listing
  async function handleSendOffer(listing) {
    if (!browseTicket) return;
    setSubmitting(true);
    setError("");
    try {
      await createSwapRequest({
        userId:      currentUserId,
        orderId:     browseTicket.orderId,
        eventId:     browseTicket.eventId,
        currentSeatId: browseTicket.seatId,
        currentTier: browseTicket.currentTier,
        desiredTier: listing.currentTier,
      });
      setBrowseTicketKey("");
      setAvailable([]);
      await loadRequests();
      setActiveTab("mine");
    } catch (err) {
      setError(err.message || "Could not send swap offer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId) {
    setActingRequestId(requestId);
    setError("");
    try {
      await cancelSwapRequest(requestId);
      await loadRequests();
    } catch (err) {
      setError(err.message || "Could not cancel.");
    } finally {
      setActingRequestId("");
    }
  }

  // Both lister AND offerer call this — each with their own userId.
  // swapId          = the SwapMatch ID
  // matchedRequestId = the OTHER party's requestId (used by orchestration for payment direction)
  // response        = "ACCEPT" | "DECLINE"
  async function handleRespond(swapId, matchedRequestId, response) {
    setActingRequestId(swapId);
    setError("");
    try {
      await respondToSwapRequest(swapId, currentUserId, response, matchedRequestId);
      await loadRequests();
    } catch (err) {
      setError(err.message || "Could not submit response.");
    } finally {
      setActingRequestId("");
    }
  }

  // In the browse tab, show incoming offers filtered to the selected ticket's event
  const filteredIncomingOffers = browseTicket
    ? incomingOffers.filter(
        (r) =>
          r.eventId === browseTicket.eventId &&
          (r.currentSeatId === browseTicket.seatId ||
            r.currentTier === browseTicket.currentTier)
      )
    : incomingOffers;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-[calc(100vh-140px)] bg-white px-6 py-10">
      <div className="mx-auto max-w-4xl">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-3 text-sm">
          <Link to="/" className="text-[#1d4ed8] underline underline-offset-2">
            Home
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700">Swap Tickets</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="rounded-2xl bg-[#fff1f5] p-3 text-[#800020]">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Swap Tickets</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              List your seat to find a swap partner, or browse existing listings
              and send an offer directly. Both parties must accept to complete a
              swap.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* How it works */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#ead7dd] bg-[#fff8fa] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#800020]">
              Step 1 — List your seat
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Go to <strong>My Swap Requests</strong> → click{" "}
              <strong>List My Seat</strong>, pick your ticket and the tier you
              want, then submit.
            </p>
          </div>
          <div className="rounded-2xl border border-[#dbe5ff] bg-[#f5f8ff] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1d4ed8]">
              Step 2 — Both sides accept
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Once matched, both you and the other party must each accept the
              offer. The swap executes automatically when both have accepted.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {[
            { id: "mine",   label: "My Swap Requests" },
            { id: "browse", label: "Browse Available Swaps" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(""); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "browse" && incomingOffers.length > 0 && (
                <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {incomingOffers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── MY SWAP REQUESTS TAB ─────────────────────────────────────────── */}
        {activeTab === "mine" && (
          <section className="rounded-3xl border border-gray-200 bg-[#fcfbfb] p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">My Swap Requests</h2>
                <p className="mt-1 text-sm text-gray-500">
                  All your active listings. Accept incoming offers here, or cancel
                  a pending listing anytime.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadRequests}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <RefreshCcw size={15} />
                  Refresh
                </button>
                <button
                  onClick={() => { setShowListForm((v) => !v); setError(""); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a001a]"
                >
                  <Plus size={15} />
                  List My Seat
                </button>
              </div>
            </div>

            {/* List-seat form */}
            {showListForm && (
              <div className="mt-6 rounded-2xl border border-[#ead7dd] bg-white p-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  List your seat for swapping
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Which ticket do you want to swap?
                    </label>
                    <select
                      value={listTicketKey}
                      onChange={(e) => setListTicketKey(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020]"
                    >
                      <option value="">Select a ticket</option>
                      {eligibleTickets.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.eventName} · {t.seatLabel} · {t.currentTier}
                        </option>
                      ))}
                    </select>
                  </div>

                  {listTicket && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Which tier do you want instead?
                      </label>
                      <select
                        value={desiredTier}
                        onChange={(e) => setDesiredTier(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020]"
                      >
                        <option value="">Select desired tier</option>
                        {["VIP", "CAT1", "CAT2", "CAT3"].map((tier) => (
                          <option key={tier} value={tier}>
                            {tier}
                            {tier === listTicket.currentTier ? " (same tier)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {listTicket && desiredTier && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      You are listing <strong>{listTicket.seatLabel}</strong>{" "}
                      ({listTicket.currentTier}) in exchange for a{" "}
                      <strong>{desiredTier}</strong> seat.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleListSeat}
                      disabled={!listTicket || !desiredTier || listing}
                      className="rounded-xl bg-[#800020] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a001a] disabled:opacity-50"
                    >
                      {listing ? "Listing…" : "Submit Listing"}
                    </button>
                    <button
                      onClick={() => { setShowListForm(false); setListTicketKey(""); setDesiredTier(""); }}
                      className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loadingRequests && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-400">
                Loading…
              </div>
            )}

            {/* Empty */}
            {!loadingRequests && myListings.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
                <p className="text-sm font-semibold text-gray-800">No swap requests yet.</p>
                <p className="mt-2 text-sm text-gray-500">
                  Click <strong>List My Seat</strong> above, or go to{" "}
                  <button
                    onClick={() => setActiveTab("browse")}
                    className="text-[#1d4ed8] underline"
                  >
                    Browse Available Swaps
                  </button>{" "}
                  to find an existing listing.
                </p>
              </div>
            )}

            {/* Listings */}
            {!loadingRequests && myListings.length > 0 && (
              <div className="mt-6 space-y-4">
                {myListings.map((req) => {
                  const { iAccepted, theyAccepted } = parseConfirmations(
                    req.confirmations,
                    currentUserId
                  );
                  const isActing = actingRequestId === req.swapId || actingRequestId === req.requestId;

                  return (
                    <article
                      key={req.requestId}
                      className="rounded-2xl border border-gray-200 bg-white p-5"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {req.eventName || req.eventId}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {req.currentSeatLabel || req.currentSeatId}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            STATUS_STYLES[req.swapStatus] ?? "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {(req.swapStatus || "").replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Tier info */}
                      <div className="mt-4 grid gap-2 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold text-gray-900">Your seat tier:</span>{" "}
                          {req.currentTier}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-900">Desired tier:</span>{" "}
                          {req.desiredTier}
                        </p>
                        {req.matchedSeatLabel && (
                          <p>
                            <span className="font-semibold text-gray-900">Matched seat:</span>{" "}
                            {req.matchedSeatLabel}
                          </p>
                        )}
                      </div>

                      {/* ── PENDING: waiting for match ── */}
                      {req.swapStatus === "pending" && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          Your listing is live. Waiting for another user to send an
                          offer…
                        </div>
                      )}

                      {/* ── AWAITING CONFIRMATION: show per-side status + accept button ── */}
                      {req.swapStatus === "awaiting_confirmation" && (
                        <div className="mt-4 space-y-3">
                          {/* Confirmation status pills */}
                          <div className="flex flex-wrap gap-2">
                            <ConfirmationPill
                              label="You"
                              accepted={iAccepted}
                            />
                            <ConfirmationPill
                              label="Other party"
                              accepted={theyAccepted}
                            />
                          </div>

                          {/* Info text */}
                          {iAccepted && !theyAccepted && (
                            <p className="text-sm text-violet-700">
                              You've accepted. Waiting for the other party…
                            </p>
                          )}
                          {!iAccepted && theyAccepted && (
                            <p className="text-sm text-violet-700">
                              The other party has accepted. Your turn!
                            </p>
                          )}
                          {!iAccepted && !theyAccepted && (
                            <p className="text-sm text-violet-700">
                              Both parties need to accept to complete the swap.
                            </p>
                          )}

                          {/* Action buttons — only show if I haven't accepted yet */}
                          {!iAccepted && (
                            <div className="flex flex-wrap gap-3 pt-1">
                              <button
                                onClick={() =>
                                  handleRespond(req.swapId, req.matchedRequestId, "ACCEPT")
                                }
                                disabled={isActing}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a001a] disabled:opacity-50"
                              >
                                <CheckCircle2 size={15} />
                                {isActing ? "Accepting…" : "Accept Offer"}
                              </button>
                              <button
                                onClick={() =>
                                  handleRespond(req.swapId, req.matchedRequestId, "DECLINE")
                                }
                                disabled={isActing}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                <XCircle size={15} />
                                Decline
                              </button>
                            </div>
                          )}

                          {/* Already accepted — just a status note */}
                          {iAccepted && (
                            <div className="flex items-center gap-2 text-sm text-emerald-700">
                              <CheckCircle2 size={15} />
                              You have accepted this offer.
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── COMPLETED ── */}
                      {req.swapStatus === "completed" && (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          Swap completed! Your new seat:{" "}
                          <strong>
                            {req.matchedSeatLabel || req.matchedSeatId || "—"}
                          </strong>
                        </div>
                      )}

                      {/* ── FAILED ── */}
                      {req.swapStatus === "failed" && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          This swap was declined by the other party.
                        </div>
                      )}

                      {/* Cancel — only for pending listings */}
                      {req.swapStatus === "pending" && (
                        <div className="mt-5">
                          <button
                            onClick={() => handleCancel(req.requestId)}
                            disabled={actingRequestId === req.requestId}
                            className="inline-flex items-center gap-2 text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            {actingRequestId === req.requestId
                              ? "Cancelling…"
                              : "Cancel Listing"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── BROWSE TAB ────────────────────────────────────────────────────── */}
        {activeTab === "browse" && (
          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Browse Available Swaps</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select the ticket you want to swap to see matching listings and any
              incoming offers on your listings.
            </p>

            {/* Ticket selector */}
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Which ticket do you want to swap?
              </label>
              <select
                value={browseTicketKey}
                onChange={(e) => { setBrowseTicketKey(e.target.value); setError(""); }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#800020]"
              >
                <option value="">Select a ticket</option>
                {eligibleTickets.map((ticket) => (
                  <option key={ticket.key} value={ticket.key}>
                    {ticket.eventName} · {ticket.seatLabel} · {ticket.currentTier}
                  </option>
                ))}
              </select>
            </div>

            {/* Empty state when nothing selected and no global incoming offers */}
            {!browseTicket && filteredIncomingOffers.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
                <p className="text-sm text-gray-500">
                  Select a ticket above to see matching listings from other users.
                </p>
              </div>
            )}

            {/* Incoming offers section */}
            {!loadingRequests && filteredIncomingOffers.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    Incoming Offers
                  </h3>
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    {filteredIncomingOffers.length}
                  </span>
                </div>
                <p className="mb-4 text-sm text-gray-500">
                  Someone wants to swap with one of your listings. Both of you
                  must accept to execute the swap.
                </p>

                <div className="space-y-4">
                  {filteredIncomingOffers.map((req) => {
                    const { iAccepted, theyAccepted } = parseConfirmations(
                      req.confirmations,
                      currentUserId
                    );
                    const isActing = actingRequestId === req.swapId;

                    return (
                      <article
                        key={req.requestId}
                        className="rounded-2xl border border-violet-200 bg-violet-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {req.eventName || req.eventId}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              Your listing:{" "}
                              {req.currentSeatLabel || req.currentSeatId}
                            </p>
                          </div>
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                            Offer Received
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-gray-700">
                          <p>
                            <span className="font-semibold text-gray-900">
                              Your tier:
                            </span>{" "}
                            {req.currentTier}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-900">
                              Matched seat offered:
                            </span>{" "}
                            <strong>
                              {req.matchedSeatLabel || req.matchedSeatId || "—"}
                            </strong>
                          </p>
                          <p>
                            <span className="font-semibold text-gray-900">
                              Their tier:
                            </span>{" "}
                            {req.desiredTier}
                          </p>
                        </div>

                        {/* Confirmation status pills */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <ConfirmationPill label="You" accepted={iAccepted} />
                          <ConfirmationPill
                            label="Other party"
                            accepted={theyAccepted}
                          />
                        </div>

                        {/* Status message */}
                        {iAccepted && !theyAccepted && (
                          <p className="mt-2 text-sm text-violet-700">
                            You've accepted. Waiting for the other party…
                          </p>
                        )}
                        {!iAccepted && theyAccepted && (
                          <p className="mt-2 text-sm text-violet-700">
                            The other party has accepted. Your turn!
                          </p>
                        )}

                        {/* Action buttons */}
                        {!iAccepted && (
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              onClick={() =>
                                handleRespond(
                                  req.swapId,
                                  req.matchedRequestId,
                                  "ACCEPT"
                                )
                              }
                              disabled={isActing}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a001a] disabled:opacity-50"
                            >
                              <CheckCircle2 size={15} />
                              {isActing ? "Accepting…" : "Accept Offer"}
                            </button>
                            <button
                              onClick={() =>
                                handleRespond(
                                  req.swapId,
                                  req.matchedRequestId,
                                  "DECLINE"
                                )
                              }
                              disabled={isActing}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <XCircle size={15} />
                              Decline
                            </button>
                          </div>
                        )}

                        {iAccepted && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                            <CheckCircle2 size={15} />
                            You have accepted this offer.
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available listings from other users */}
            {browseTicket && (
              <div className="mt-8">
                <h3 className="mb-1 text-base font-semibold text-gray-900">
                  Available Listings
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  Other users listing a{" "}
                  <strong>{browseTicket.currentTier}</strong> seat for{" "}
                  <strong>{browseTicket.eventName}</strong>. Send an offer to
                  request a swap — you'll both need to accept.
                </p>

                {loadingAvailable && (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-400">
                    Loading listings…
                  </div>
                )}

                {!loadingAvailable && available.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-gray-800">
                      No listings available yet.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      No one has listed a{" "}
                      <strong>{browseTicket.currentTier}</strong> seat right now.
                      Go to{" "}
                      <button
                        onClick={() => setActiveTab("mine")}
                        className="text-[#1d4ed8] underline"
                      >
                        My Swap Requests
                      </button>{" "}
                      to list your own seat first.
                    </p>
                  </div>
                )}

                {!loadingAvailable && available.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      {available.length} listing
                      {available.length !== 1 ? "s" : ""} available
                    </p>
                    {available.map((item) => (
                      <article
                        key={item.requestId}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-[#fcfbfb] p-5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.currentSeatLabel || item.currentSeatId}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Tier: {item.currentTier} · Wants: {item.desiredTier}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSendOffer(item)}
                          disabled={submitting}
                          className="rounded-xl bg-[#800020] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a001a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submitting ? "Sending…" : "Send Offer"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ConfirmationPill({ label, accepted }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        accepted
          ? "bg-emerald-100 text-emerald-800"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {accepted ? (
        <CheckCircle2 size={12} />
      ) : (
        <Clock size={12} />
      )}
      {label}: {accepted ? "Accepted" : "Pending"}
    </span>
  );
}