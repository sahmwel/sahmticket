'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface EventMapProps {
  lat: number;
  lng: number;
  venue: string;
  address?: string;
}

// Fix for default marker icon issues in Leaflet (TS-safe)
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function EventMap({ lat, lng, venue, address }: EventMapProps) {
  return (
    <div className="w-full h-96 rounded-3xl overflow-hidden shadow-2xl">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // TypeScript-safe: attribution works on TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[lat, lng]}>
          <Popup>
            <strong>{venue}</strong>
            {address && <div>{address}</div>}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
