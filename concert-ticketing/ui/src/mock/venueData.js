// ── Shared visual section layout ───────────────────────────────────────────
// dataSection maps each visual block to a seat-data pool (1–7).
// This is the default layout; per-event overrides are stored in the store.
export const DEFAULT_VENUE_SECTIONS = [
  // Left outer (308-314) → CAT3 pool 6
  { id:"308", label:"308", dataSection:6, x:2,   y:48,  w:64, h:50 },
  { id:"309", label:"309", dataSection:6, x:2,   y:100, w:64, h:50 },
  { id:"310", label:"310", dataSection:6, x:2,   y:152, w:64, h:50 },
  { id:"311", label:"311", dataSection:6, x:2,   y:204, w:64, h:50 },
  { id:"312", label:"312", dataSection:6, x:2,   y:256, w:64, h:50 },
  { id:"313", label:"313", dataSection:6, x:2,   y:308, w:64, h:50 },
  { id:"314", label:"314", dataSection:6, x:2,   y:360, w:64, h:50 },
  // Left inner (208-217) → CAT3 pool 6
  { id:"208", label:"208", dataSection:6, x:70,  y:5,   w:72, h:43 },
  { id:"209", label:"209", dataSection:6, x:70,  y:50,  w:72, h:43 },
  { id:"210", label:"210", dataSection:6, x:70,  y:95,  w:72, h:43 },
  { id:"211", label:"211", dataSection:6, x:70,  y:140, w:72, h:43 },
  { id:"212", label:"212", dataSection:6, x:70,  y:185, w:72, h:43 },
  { id:"213", label:"213", dataSection:6, x:70,  y:230, w:72, h:43 },
  { id:"214", label:"214", dataSection:6, x:70,  y:275, w:72, h:43 },
  { id:"215", label:"215", dataSection:6, x:70,  y:320, w:72, h:43 },
  { id:"216", label:"216", dataSection:6, x:70,  y:365, w:72, h:43 },
  { id:"217", label:"217", dataSection:6, x:70,  y:410, w:72, h:43 },
  // Standing Pen A → CAT2 pool 4
  { id:"STD_A", label:"STANDING\nPEN A", dataSection:4, x:147, y:67,  w:112, h:125, multiline:true },
  // Floor sections
  { id:"PA1", label:"PA1", dataSection:2, x:147, y:197, w:112, h:153 },
  { id:"PB1", label:"PB1", dataSection:1, x:263, y:197, w:174, h:153 },
  { id:"PC1", label:"PC1", dataSection:3, x:441, y:197, w:112, h:153 },
  // Standing Pen B → CAT2 pool 5
  { id:"STD_B", label:"STANDING\nPEN B", dataSection:5, x:441, y:67,  w:112, h:125, multiline:true },
  // Right inner (234-225) → CAT3 pool 7
  { id:"234", label:"234", dataSection:7, x:558, y:5,   w:72, h:43 },
  { id:"233", label:"233", dataSection:7, x:558, y:50,  w:72, h:43 },
  { id:"232", label:"232", dataSection:7, x:558, y:95,  w:72, h:43 },
  { id:"231", label:"231", dataSection:7, x:558, y:140, w:72, h:43 },
  { id:"230", label:"230", dataSection:7, x:558, y:185, w:72, h:43 },
  { id:"229", label:"229", dataSection:7, x:558, y:230, w:72, h:43 },
  { id:"228", label:"228", dataSection:7, x:558, y:275, w:72, h:43 },
  { id:"227", label:"227", dataSection:7, x:558, y:320, w:72, h:43 },
  { id:"226", label:"226", dataSection:7, x:558, y:365, w:72, h:43 },
  { id:"225", label:"225", dataSection:7, x:558, y:410, w:72, h:43 },
  // Right outer (334-328) → CAT3 pool 7
  { id:"334", label:"334", dataSection:7, x:634, y:48,  w:64, h:50 },
  { id:"333", label:"333", dataSection:7, x:634, y:100, w:64, h:50 },
  { id:"332", label:"332", dataSection:7, x:634, y:152, w:64, h:50 },
  { id:"331", label:"331", dataSection:7, x:634, y:204, w:64, h:50 },
  { id:"330", label:"330", dataSection:7, x:634, y:256, w:64, h:50 },
  { id:"329", label:"329", dataSection:7, x:634, y:308, w:64, h:50 },
  { id:"328", label:"328", dataSection:7, x:634, y:360, w:64, h:50 },
  // Bottom row 1 (218-224)
  { id:"218", label:"218", dataSection:6, x:152, y:457, w:55, h:52 },
  { id:"219", label:"219", dataSection:6, x:209, y:457, w:55, h:52 },
  { id:"220", label:"220", dataSection:6, x:266, y:457, w:55, h:52 },
  { id:"221", label:"221", dataSection:6, x:323, y:457, w:55, h:52 },
  { id:"222", label:"222", dataSection:7, x:380, y:457, w:55, h:52 },
  { id:"223", label:"223", dataSection:7, x:437, y:457, w:55, h:52 },
  { id:"224", label:"224", dataSection:7, x:494, y:457, w:55, h:52 },
  // Bottom row 2 (318-324)
  { id:"318", label:"318", dataSection:6, x:152, y:514, w:55, h:50 },
  { id:"319", label:"319", dataSection:6, x:209, y:514, w:55, h:50 },
  { id:"320", label:"320", dataSection:6, x:271, y:511, w:57, h:55 },
  { id:"322", label:"322", dataSection:7, x:372, y:511, w:57, h:55 },
  { id:"323", label:"323", dataSection:7, x:436, y:514, w:55, h:50 },
  { id:"324", label:"324", dataSection:7, x:493, y:514, w:55, h:50 },
];

// dataSection → tier key
export function dataSectionToTier(n) {
  if (n === 1) return "VIP";
  if (n <= 3)  return "CAT1";
  if (n <= 5)  return "CAT2";
  return "CAT3";
}

// tier key → default dataSection
export const TIER_TO_DATA_SECTION = { VIP: 1, CAT1: 2, CAT2: 4, CAT3: 6 };
