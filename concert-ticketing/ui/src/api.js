// Set VITE_USE_MOCK=true in .env to use mock data (when backend is not running)
export { USER_ID } from "./mock/mockApi";
export {
  getEvents,
  getEvent,
  getSeatmap,
  validateSeat,
  createBooking,
  createSwapRequest,
  cancelSwapRequest,
  // Admin
  adminLogin,
  adminGetEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  adminGetTierPrices,
  adminUpdateTierPrices,
  adminGetSectionConfigs,
  adminSetSectionConfigs,
  adminGetVisualSections,
  adminSetVisualSections,
} from "./mock/mockApi";

// ── Real API (uncomment and remove mock exports above when backend is ready) ──
// const KONG = "http://localhost:8000";
// export const USER_ID = 1;
//
// export async function getEvents() { ... }
// export async function getSeatmap(eventId) { ... }
// etc.
