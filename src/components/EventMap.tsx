// src/components/EventMap.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";

interface Props {
  lat: number;
  lng: number;
  venue?: string;
}

export default function EventMap({ lat, lng, venue }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Only create the map once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);

      L.marker([lat, lng])
        .addTo(mapRef.current)
        .bindPopup(venue || "Event location")
        .openPopup();
    } else {
      // If props change, just move the view and marker
      mapRef.current.setView([lat, lng], 15);
    }

    // Cleanup on unmount ONLY
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, venue]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 250 }}
    />
  );
}
