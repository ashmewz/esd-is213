import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
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
            <Route path="/" element={<HomePage />} />
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
