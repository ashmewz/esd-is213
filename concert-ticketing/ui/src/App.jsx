import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import SeatmapPage from "./pages/SeatmapPage";
import CheckoutPage from "./pages/CheckoutPage";

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div className="min-h-screen bg-white text-gray-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/events/:eventId/seats" element={<SeatmapPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}
