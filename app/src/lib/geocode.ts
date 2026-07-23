interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  state?: string;
  postcode?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`
    );
    if (!res.ok) return null;
    const data: { address?: NominatimAddress } = await res.json();
    const a = data.address;
    if (!a?.road) return null;
    return [a.house_number, a.road].filter(Boolean).join(" ");
  } catch {
    return null;
  }
}
