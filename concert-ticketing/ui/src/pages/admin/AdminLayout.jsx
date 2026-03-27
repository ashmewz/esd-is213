import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarDays, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: "/admin",   label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/events",  label: "Events",    icon: CalendarDays },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)]">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-[#800020] text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
