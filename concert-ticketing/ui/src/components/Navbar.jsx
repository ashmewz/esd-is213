import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Swap", to: "/swap" },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <header>
      {/* Top bar: logo + icons */}
      <div className="bg-gray-100 px-20 py-9 flex justify-between items-center">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="text-5xl font-bold">
            <span className="text-orange-500">Ticket</span>
            <span className="text-gray-800">App</span>
          </span>
          <span className="text-s py-2 text-gray-500 tracking-wide">Box Office Online</span>
        </Link>

        <div className="flex gap-3">
          <button className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-orange-500 transition">
            <ShoppingCart size={18} className="text-gray-600" />
          </button>
          <button className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-orange-500 transition">
            <User size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="bg-white border-b px-8 flex gap-8">
        {NAV_LINKS.map(({ label, to }) => {
          const active = pathname === to || (to === "/events" && pathname.startsWith("/events"));
          return (
            <Link
              key={to}
              to={to}
              className={`py-4 px-8 text-sm font-medium border-b-2 transition ${
                active
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-700 hover:text-orange-500"
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
