import type { Complaint } from "../types";

/**
 * Display-only helper: derives a plausible "local authority" name from a
 * complaint's location so every ticket looks like it went to the division
 * covering that area. The backend still routes everything to the ONE real
 * authority — these names are cosmetic and never stored or sent anywhere.
 */

const ZONE_AUTHORITIES: { keyword: string; name: string }[] = [
  { keyword: "central", name: "Central Ballari Roads & Works Division" },
  { keyword: "north", name: "North Ballari Municipal Highways" },
  { keyword: "south", name: "South Ballari Infrastructure Corp" },
  { keyword: "east", name: "East Ballari Public Works" },
  { keyword: "west", name: "West Ballari Civic Amenities Board" },
];

function hashString(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function fakeAuthorityName(complaint: Pick<Complaint, "location_name">): string {
  const loc = (complaint.location_name || "").toLowerCase();

  // Location mentions a zone direction -> that zone's division
  for (const zone of ZONE_AUTHORITIES) {
    if (loc.includes(zone.keyword)) return zone.name;
  }

  // Otherwise: stable pseudo-pick so the same location always shows the
  // same "division"
  return ZONE_AUTHORITIES[hashString(complaint.location_name || "") % ZONE_AUTHORITIES.length].name;
}
