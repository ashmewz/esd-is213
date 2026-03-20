import { createContext, useContext, useState, useEffect, useRef } from "react";

const CartContext = createContext(null);

const CART_TIMEOUT = 15 * 60; // 15 minutes in seconds
const FEE = 2;

export function CartProvider({ children }) {
  const [cartItems,     setCartItems]     = useState([]); // { seat, event, date, time }
  const [secondsLeft,   setSecondsLeft]   = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const hadItemsRef = useRef(false);

  // Start timer when cart goes from empty → has items; reset timer when cleared
  useEffect(() => {
    const hasItems = cartItems.length > 0;
    if (hasItems && !hadItemsRef.current) {
      setSecondsLeft(CART_TIMEOUT);
    }
    if (!hasItems) {
      setSecondsLeft(null);
    }
    hadItemsRef.current = hasItems;
  }, [cartItems.length]);

  // Countdown via setTimeout (re-triggered each second)
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const id = setTimeout(
      () => setSecondsLeft((s) => (s !== null ? s - 1 : null)),
      1000
    );
    return () => clearTimeout(id);
  }, [secondsLeft]);

  // Expire cart when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0) clearCart();
  }, [secondsLeft]);

  function addToCart(newItems) {
    setCartItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.seat.seatId));
      const toAdd = newItems.filter((i) => !existingIds.has(i.seat.seatId));
      return [...prev, ...toAdd];
    });
    setShowCartPopup(true);
  }

  function removeFromCart(seatId) {
    setCartItems((prev) => {
      const next = prev.filter((i) => i.seat.seatId !== seatId);
      if (next.length === 0) setShowCartPopup(false);
      return next;
    });
  }

  function clearCart() {
    setCartItems([]);
    setSecondsLeft(null);
    setShowCartPopup(false);
  }

  const cartTotal = cartItems.reduce((sum, i) => sum + i.seat.basePrice + FEE, 0);

  function formatTime(s) {
    if (s === null) return null;
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
        timeLeft: formatTime(secondsLeft),
        showCartPopup,
        setShowCartPopup,
        FEE,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
