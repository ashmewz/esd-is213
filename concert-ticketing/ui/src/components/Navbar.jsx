import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, User, X, LayoutDashboard, LogOut, Bell, ChevronRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { getMyNotifications } from "../api";

const NAV_LINKS = [
  { label: "Home",   to: "/" },
  { label: "Events", to: "/events" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const {
    cartItems, removeFromCart, clearCart,
    cartTotal, timeLeft, FEE,
    showCartPopup, setShowCartPopup,
  } = useCart();
  const { user, isAdmin, isCustomer, logout, currentUserId } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const hasItems = cartItems.length > 0;
  const previewNotifications = notifications.slice(0, 3);

  useEffect(() => {
    if (!showNotifications) return;
    getMyNotifications(currentUserId).then(setNotifications).catch(() => setNotifications([]));
  }, [currentUserId, showNotifications]);

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

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

          {isCustomer && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications((value) => !value)}
                className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-[#800020] transition"
                title="Notifications"
              >
                <Bell size={18} className="text-gray-600" />
              </button>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#800020] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {Math.min(notifications.length, 9)}
                </span>
              )}

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute top-full right-0 z-50 mt-3 w-[360px] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
                    <div className="px-6 py-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-gray-900">Notifications</h3>
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            navigate("/notifications");
                          }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 transition hover:text-[#800020]"
                        >
                          View all <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <span className="rounded-full bg-[#f2eff8] px-4 py-2 text-sm font-semibold text-gray-800">
                          All
                        </span>
                        <span className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500">
                          Unread
                        </span>
                      </div>

                      <div className="mt-5">
                        <p className="text-sm font-semibold text-gray-900">Recent</p>

                        {previewNotifications.length === 0 ? (
                          <div className="py-8 text-sm text-gray-400">
                            No notifications yet.
                          </div>
                        ) : (
                          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
                            {previewNotifications.map((notification, index) => (
                              <button
                                key={notification.notificationId}
                                onClick={() => {
                                  setShowNotifications(false);
                                  navigate(notification.route || "/notifications");
                                }}
                                className={`w-full text-left py-4 transition hover:bg-gray-50 ${
                                  index > 0 ? "border-t border-gray-200" : ""
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
                                      <p className="truncate text-base font-semibold text-gray-900">
                                        {notification.title}
                                      </p>
                                    </div>
                                    <p className="mt-2 line-clamp-2 pl-[18px] text-sm leading-6 text-gray-600">
                                      {notification.message}
                                    </p>
                                  </div>
                                  <span className="shrink-0 pt-0.5 text-sm text-gray-500">
                                    {new Date(notification.createdAt).toLocaleTimeString("en-SG", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    })}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[#800020] transition px-2 py-1"
              >
                <LayoutDashboard size={15} /> Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-[#800020] transition"
                title="Log out"
              >
                <LogOut size={16} className="text-gray-600" />
              </button>
            </div>
          ) : isCustomer ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((value) => !value)}
                className="w-12 h-12 rounded-full border-2 border-[#2563eb] bg-white flex items-center justify-center hover:border-[#800020] transition overflow-hidden"
                title="Profile"
              >
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-gray-600" />
                )}
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute top-full right-0 z-50 mt-3 w-[280px] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
                    <div className="border-b border-gray-200 px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                          {user?.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                              {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[16px] font-semibold text-gray-900">
                            {user?.name || user?.username || "StagePass User"}
                          </p>
                          <p className="mt-1 truncate text-[14px] text-gray-700">
                            {user?.email || "user@stagepass.com"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate("/tickets");
                        }}
                        className="block w-full py-3 text-left text-[16px] text-gray-800 transition hover:text-[#800020]"
                      >
                        My Tickets
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate("/account");
                        }}
                        className="block w-full py-3 text-left text-[16px] text-gray-800 transition hover:text-[#800020]"
                      >
                        Account Details
                      </button>
                    </div>

                    <div className="border-t border-gray-200 px-5 py-4">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="block w-full text-left text-[16px] font-medium text-gray-800 transition hover:text-[#800020]"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-[#800020] transition"
              title="Sign in"
            >
              <User size={18} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* ── Nav tabs ────────────────────────────────────────── */}
      <nav className="bg-white border-b px-8 flex gap-8">
        {[...NAV_LINKS, ...(isCustomer ? [
          { label: "Swap", to: "/swap" },
        ] : [])].map(({ label, to }) => {
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
