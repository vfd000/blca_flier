interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  state?: string;
  postcode?: string;
}

// The whole neighborhood is within one city/state/zip, so hardcoding this
// (rather than trusting Nominatim's variable-format city/state fields) keeps
// every address consistent -- matches the seed data's format exactly (see
// supabase/seed/houses_raw.json's city_state_zip).
export const CITY_STATE_ZIP = "Renton, WA 98058";

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`
    );
    if (!res.ok) return null;
    const data: { address?: NominatimAddress } = await res.json();
    const a = data.address;
    if (!a?.road) return null;
    const streetAddress = [a.house_number, a.road].filter(Boolean).join(" ");
    return `${streetAddress}, ${CITY_STATE_ZIP}`;
  } catch {
    return null;
  }
}
