import { createContext, useContext, useState, useEffect, useRef } from "react";
import { cancelSeatHold, createSeatHold } from "../api";

const CartContext = createContext(null);

const CART_TIMEOUT = 15 * 60; // 15 minutes in seconds
const FEE = 2;
const CART_STORAGE_KEY = "stagepass_cart_items";
const CART_EXPIRY_KEY = "stagepass_cart_expires_at";

function loadStoredCartItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadStoredSecondsLeft() {
  try {
    const raw = localStorage.getItem(CART_EXPIRY_KEY);
    if (!raw) return null;
    const expiryMs = Number(raw);
    if (!Number.isFinite(expiryMs)) return null;
    const diffSeconds = Math.ceil((expiryMs - Date.now()) / 1000);
    return diffSeconds > 0 ? diffSeconds : 0;
  } catch {
    return null;
  }
}

export function CartProvider({ children }) {
  const [cartItems,     setCartItems]     = useState(loadStoredCartItems); // { seat, event, date, time }
  const [secondsLeft,   setSecondsLeft]   = useState(loadStoredSecondsLeft);
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

  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch {
      // ignore storage write failures
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      if (secondsLeft !== null && secondsLeft > 0 && cartItems.length > 0) {
        localStorage.setItem(CART_EXPIRY_KEY, String(Date.now() + secondsLeft * 1000));
      } else if (cartItems.length === 0 || secondsLeft === null) {
        localStorage.removeItem(CART_EXPIRY_KEY);
      }
    } catch {
      // ignore storage write failures
    }
  }, [cartItems.length, secondsLeft]);

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
    if (secondsLeft === 0) {
      clearCart({ releaseSeats: true });
    }
  }, [secondsLeft]);

  useEffect(() => {
    function syncTimerFromStorage() {
      const next = loadStoredSecondsLeft();
      setSecondsLeft((current) => {
        if (next === null) return cartItems.length > 0 ? current : null;
        return next;
      });
    }

    syncTimerFromStorage();
    window.addEventListener("focus", syncTimerFromStorage);
    return () => window.removeEventListener("focus", syncTimerFromStorage);
  }, [cartItems.length]);

  async function addToCart(newItems) {
    const nextItem = newItems[0];
    if (!nextItem) return;

    await Promise.all(
      cartItems.map(({ holdId }) => cancelSeatHold(holdId).catch(() => null))
    );

    const hold = await createSeatHold(nextItem.event.eventId, nextItem.seat.seatId, CART_TIMEOUT).catch(() => null);
    const heldItem = hold ? { ...nextItem, holdId: hold.holdId, holdExpiry: hold.expiry } : null;

    setCartItems(heldItem ? [heldItem] : []);
    setShowCartPopup(true);
  }

  async function removeFromCart(seatId) {
    let removedItem = null;
    setCartItems((prev) => {
      removedItem = prev.find((i) => i.seat.seatId === seatId) ?? null;
      const next = prev.filter((i) => i.seat.seatId !== seatId);
      if (next.length === 0) setShowCartPopup(false);
      return next;
    });

    if (removedItem?.holdId) {
      await cancelSeatHold(removedItem.holdId).catch(() => null);
    }
  }

  async function clearCart(options = {}) {
    const { releaseSeats = true } = options;
    const itemsToRelease = cartItems.slice();
    setCartItems([]);
    setSecondsLeft(null);
    setShowCartPopup(false);

    if (releaseSeats) {
      await Promise.all(
        itemsToRelease.map(({ holdId }) =>
          cancelSeatHold(holdId).catch(() => null)
        )
      );
    }
  }

  const cartTotal = cartItems.reduce((sum, i) => sum + (i.seat.price ?? i.seat.basePrice) + FEE, 0);

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
