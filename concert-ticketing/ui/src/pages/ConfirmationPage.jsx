import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Ticket, Mail, CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function buildOrderId(items) {
  const seed = items.reduce((sum, item) => sum + Number(item.seat?.seatId ?? 0), 0);
  return `SP-${String(seed || Date.now()).padStart(6, "0")}`;
}

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { clearCart, FEE } = useCart();
  const { user } = useAuth();
  const accountEmail = user?.email ?? "your registered email";
  const hasClearedRef = useRef(false);

  const cartItems = state?.cartItems ?? [];
  const form = state?.form ?? null;
  const hasOrder = cartItems.length > 0;

  useEffect(() => {
    if (!hasOrder || hasClearedRef.current) return;
    clearCart();
    hasClearedRef.current = true;
  }, [clearCart, hasOrder]);

  const summary = useMemo(() => {
    if (!hasOrder) return null;

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.seat?.price ?? item.seat?.basePrice ?? 0),
      0
    );
    const fees = cartItems.length * FEE;
    const primaryItem = cartItems[0];

    return {
      orderId: state?.orderId ?? buildOrderId(cartItems),
      subtotal,
      fees,
      total: subtotal + fees,
      eventName: primaryItem.event?.name ?? "Your event",
      venueName: primaryItem.event?.venueName ?? primaryItem.event?.venue ?? "Venue TBC",
      date: primaryItem.date ?? "Date TBC",
      time: primaryItem.time ?? "Time TBC",
    };
  }, [FEE, cartItems, hasOrder, state?.orderId]);

  if (!hasOrder || !summary) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">
            No Confirmation Data
          </p>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">There is no completed order to show yet.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Return to the events page, choose your seats, and complete checkout to view your order confirmation here.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/events"
              className="rounded-xl bg-[#800020] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6a001a]"
            >
              Browse Events
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-140px)] bg-[linear-gradient(180deg,#f7f2f4_0%,#ffffff_38%)] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[28px] border border-[#e9d6dc] bg-white shadow-[0_24px_80px_rgba(93,25,41,0.08)]">
          <div className="border-b border-[#f1e5e9] bg-[#fff7f9] px-8 py-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#800020] p-3 text-white">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]/70">
                    Booking Confirmed
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-gray-900">Your tickets are on the way.</h1>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    A confirmation email will be sent to {accountEmail} with your e-ticket details.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ead7dd] bg-white px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Order Reference</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{summary.orderId}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="px-8 py-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                    <Ticket size={14} />
                    Tickets
                  </div>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{cartItems.length}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                    <CalendarDays size={14} />
                    Schedule
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{summary.date}</p>
                  <p className="text-sm text-gray-500">{summary.time}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                    <Mail size={14} />
                    Delivery
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">eTicket</p>
                  <p className="text-sm text-gray-500">{accountEmail}</p>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-gray-200">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h2 className="text-lg font-bold text-gray-900">{summary.eventName}</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin size={14} />
                    <span>{summary.venueName}</span>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {cartItems.map(({ seat }, index) => (
                    <div key={seat.seatId} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Ticket {index + 1}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {seat.tier} · Section {seat.sectionNo} · Row {seat.rowNo} · Seat {seat.seatNo}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(seat.price ?? seat.basePrice ?? 0))}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="border-t border-[#f1e5e9] bg-[#fcfafb] px-8 py-8 lg:border-l lg:border-t-0">
              <h2 className="text-lg font-bold text-gray-900">Payment Summary</h2>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Tickets</span>
                  <span>{formatCurrency(summary.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Booking fees</span>
                  <span>{formatCurrency(summary.fees)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-base font-bold text-gray-900">
                  <span>Total paid</span>
                  <span>{formatCurrency(summary.total)}</span>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-gray-200">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">What Happens Next</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                  <p>Your e-ticket has been sent to {accountEmail}.</p>
                  <p>Please present the ticket QR or PDF at entry.</p>
                  <p>If you do not receive it within a few minutes, check your spam folder.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  to="/tickets"
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  View My Tickets
                </Link>
                <Link
                  to="/events"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#800020] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6a001a]"
                >
                  Browse More Events <ArrowRight size={16} />
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
