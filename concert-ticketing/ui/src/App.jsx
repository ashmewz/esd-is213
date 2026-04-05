import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerRoute from "./components/CustomerRoute";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import SeatmapPage from "./pages/SeatmapPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResendActivationPage from "./pages/ResendActivationPage";
import RegisterPage from "./pages/RegisterPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import AccountDetailsPage from "./pages/AccountDetailsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SwapPage from "./pages/SwapPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEventForm from "./pages/admin/AdminEventForm";
import AdminSeatmapEditor from "./pages/admin/AdminSeatmapEditor";
import { useLocation } from "react-router-dom";

function NavbarWrapper() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <Navbar />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-white text-gray-900">
            <NavbarWrapper />
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/events/:eventId/seats" element={<SeatmapPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/confirmation" element={<ConfirmationPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/resend-activation" element={<ResendActivationPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/tickets"
                element={
                  <CustomerRoute>
                    <MyTicketsPage />
                  </CustomerRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <CustomerRoute>
                    <NotificationsPage />
                  </CustomerRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <CustomerRoute>
                    <AccountDetailsPage />
                  </CustomerRoute>
                }
              />
              <Route
                path="/swap"
                element={
                  <CustomerRoute>
                    <SwapPage />
                  </CustomerRoute>
                }
              />

              {/* Admin login (public) */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Admin (protected) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="events" element={<AdminDashboard />} />
                <Route path="events/new" element={<AdminEventForm />} />
                <Route path="events/:eventId/edit" element={<AdminEventForm />} />
                <Route path="events/:eventId/seatmap" element={<AdminSeatmapEditor />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
