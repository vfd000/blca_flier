import { useEffect, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

interface GeoState {
  position: GeoPosition | null;
  error: string | null;
  supported: boolean;
}

/** Watches the device's GPS position continuously, e.g. while walking a delivery route. */
export function useGeolocation() {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [state, setState] = useState<GeoState>({ position: null, error: null, supported });

  useEffect(() => {
    if (!supported) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          supported,
          error: null,
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
        });
      },
      (err) => {
        setState((prev) => ({ ...prev, error: err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [supported]);

  return state;
}
