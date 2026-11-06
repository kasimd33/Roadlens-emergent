import type { Complaint } from "../types";

/**
 * Display-only helper: derives a plausible "local authority" name from a
 * complaint's location so every ticket looks like it went to the division
 * covering that area. The backend still routes everything to the ONE real
 * authority — these names are cosmetic and never stored or sent anywhere.
 */

const BALLARI_ZONES: { keyword: string; name: string }[] = [
  { keyword: "central", name: "Central Ballari Roads & Works Division" },
  { keyword: "north", name: "North Ballari Municipal Highways" },
  { keyword: "south", name: "South Ballari Infrastructure Corp" },
  { keyword: "east", name: "East Ballari Public Works" },
  { keyword: "west", name: "West Ballari Civic Amenities Board" },
];

const CITY_TEMPLATES = [
  "{city} Roads & Works Division",
  "{city} Municipal Corporation – Roads Wing",
  "{city} Public Works Division",
];

function hashString(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Segments that are states/countries/regions, never a city name. */
const GEO_STOPWORDS = new Set([
  "karnataka", "andhra pradesh", "telangana", "tamil nadu", "kerala",
  "maharashtra", "goa", "odisha", "bihar", "gujarat", "punjab", "rajasthan",
  "delhi", "india", "district", "state", "ka", "in",
]);

/**
 * "Sayyaji Rao Road, Mysuru" -> "Mysuru"
 * "Court Circle, Ballari, Karnataka" -> "Ballari" (skips the state)
 */
function cityFromLocation(locationName: string): string {
  const parts = (locationName || "").split(",").map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i].toLowerCase();
    if (seg.length >= 2 && !GEO_STOPWORDS.has(seg)) return parts[i];
  }
  return "City";
}

export function fakeAuthorityName(complaint: Pick<Complaint, "location_name">): string {
  const loc = (complaint.location_name || "").toLowerCase();

  // Ballari complaints: pick the zone division matching the locality
  const isBallari = loc.includes("ballari") || loc.includes("bellary");
  if (isBallari) {
    for (const zone of BALLARI_ZONES) {
      if (loc.includes(zone.keyword)) return zone.name;
    }
  }

  // Other cities (Mysuru, Hubballi, ...): show a division for THAT city, e.g.
  // "Sayyaji Rao Road, Mysuru" -> "Mysuru Roads & Works Division"
  const city = cityFromLocation(complaint.location_name || "");
  if (isBallari) {
    // Ballari location without a zone keyword -> stable zone pick
    return BALLARI_ZONES[hashString(complaint.location_name || "") % BALLARI_ZONES.length].name;
  }
  return CITY_TEMPLATES[hashString(city) % CITY_TEMPLATES.length].replace("{city}", city);
}
