// src/components/EventMap.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  lat: number;
  lng: number;
  venue?: string;
  address?: string;
  title?: string; // Optional event title
}

export default function EventMap({ lat, lng, venue, address, title }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create popup content
    const popupContent = `
      <div style="padding: 8px; max-width: 250px;">
        <strong style="color: #7c3aed; font-size: 14px;">${title || "Event Venue"}</strong>
        ${venue ? `<p style="margin: 4px 0; color: #333; font-size: 13px;"><strong>Venue:</strong> ${venue}</p>` : ""}
        ${address ? `<p style="margin: 4px 0; color: #333; font-size: 13px;"><strong>Address:</strong> ${address}</p>` : ""}
        <p style="margin: 8px 0 0 0; color: #666; font-size: 12px;">
          <em>Click outside to close</em>
        </p>
      </div>
    `;

    // Only create the map once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([lat, lng], 15);

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Create custom purple marker
      const purpleIcon = L.icon({
        iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237c3aed'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z'/%3E%3C/svg%3E`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      // Add marker with popup
      markerRef.current = L.marker([lat, lng], { icon: purpleIcon })
        .addTo(mapRef.current)
        .bindPopup(popupContent)
        .openPopup();

      // Add click handler to map to close popup when clicking elsewhere
      mapRef.current.on('click', () => {
        if (markerRef.current) {
          markerRef.current.closePopup();
        }
      });

    } else {
      // If props change, update the map
      mapRef.current.setView([lat, lng], 15);
      
      // Update marker position
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setPopupContent(popupContent);
      }
    }

    // Cleanup on unmount ONLY
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng, venue, address, title]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {/* Map Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: 250 }}
      />
      
      {/* Map Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/90 backdrop-blur-sm text-purple-700 font-bold py-2 px-4 rounded-full hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
            <path d="M17 12l-5-5v3H8v4h4v3l5-5z"/>
          </svg>
          Google Maps
        </a>
        
        {/* Uber Button */}
        <a
          href={`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(venue || address || "")}&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black/90 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-full hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          Uber
        </a>
      </div>
    </div>
  );
}