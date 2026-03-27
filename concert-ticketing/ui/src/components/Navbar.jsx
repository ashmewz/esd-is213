import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, User, X } from "lucide-react";
import { useCart } from "../context/CartContext";

const NAV_LINKS = [
  { label: "Home",   to: "/" },
  { label: "Events", to: "/events" },
  { label: "Swap",   to: "/swap" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const {
    cartItems, removeFromCart, clearCart,
    cartTotal, timeLeft, FEE,
    showCartPopup, setShowCartPopup,
  } = useCart();

  const hasItems = cartItems.length > 0;

  return (
    <header className="relative">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="bg-gray-100 px-10 py-6 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex flex-col leading-tight">
          <span className="text-5xl font-bold">
            <span className="text-[#800020]">Stage</span>
            <span className="text-gray-800">Pass</span>
          </span>
          <span className="text-s py-2 text-gray-500 tracking-wide">Live Events, Simplified</span>
        </Link>

        {/* Cart + User icons (+ timer/checkout when cart has items) */}
        <div className="flex gap-3 items-center">
          {hasItems && (
            <>
              <span className="text-sm text-gray-600">
                Time left: <span className="font-semibold text-gray-800">{timeLeft}</span>
              </span>
              <button
                onClick={() => navigate("/checkout")}
                className="bg-[#800020] hover:bg-[#6a001a] text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
              >
                Checkout ${cartTotal}.00
              </button>
            </>
          )}
          {/* Cart button with badge + popup */}
          <div className="relative">
            <button
              onClick={() => setShowCartPopup((v) => !v)}
              className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-[#800020] transition"
            >
              <ShoppingCart size={18} className="text-gray-600" />
            </button>
            {hasItems && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#800020] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            )}

            {/* Cart popup anchored below cart button */}
            {showCartPopup && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCartPopup(false)} />
                <div className="absolute top-full right-0 z-50 bg-white shadow-2xl rounded-xl w-80 border overflow-hidden mt-3">
                  <div className="p-5">
                    <button
                      onClick={() => setShowCartPopup(false)}
                      className="text-sm font-medium text-gray-700 hover:text-[#800020] underline block mb-3"
                    >
                      Continue shopping
                    </button>
                    <hr className="mb-3" />
                    <p className="text-sm text-gray-600 mb-3">The following items are in your cart.</p>

                    {cartItems.map(({ seat, event, date, time }) => (
                      <div key={seat.seatId} className="border rounded-lg p-3 mb-2">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm text-gray-800 leading-tight">{event.name}</p>
                          <button
                            onClick={() => removeFromCart(seat.seatId)}
                            className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {date}{time && `, ${time}`}
                        </p>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>1 x Adult (${seat.basePrice})</span>
                          <span>${seat.basePrice}.00</span>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between text-sm text-gray-500 mt-3">
                      <span>Fees & Charges:</span>
                      <span>${cartItems.length * FEE}.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-800 mt-1 mb-4">
                      <span>Cart Subtotal:</span>
                      <span>${cartTotal}.00</span>
                    </div>

                    <button
                      onClick={() => { setShowCartPopup(false); navigate("/checkout"); }}
                      className="w-full py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-lg transition"
                    >
                      Go to Checkout
                    </button>
                    <button
                      onClick={clearCart}
                      className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-[#800020] transition">
            <User size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── Nav tabs ────────────────────────────────────────── */}
      <nav className="bg-white border-b px-8 flex gap-8">
        {NAV_LINKS.map(({ label, to }) => {
          const active = pathname === to || (to === "/events" && pathname.startsWith("/events"));
          return (
            <Link
              key={to}
              to={to}
              className={`py-4 px-8 text-sm font-medium border-b-2 transition ${
                active
                  ? "border-[#800020] text-[#800020]"
                  : "border-transparent text-gray-700 hover:text-[#800020]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

    </header>
  );
}
