import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], 16);
  }, [position]);
  return null;
}

export default function LocationPickerMap({ location, onLocationSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const defaultCenter = location
    ? [location.lat, location.lng]
    : [26.7606, 83.3732]; // Gorakhpur default

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        onLocationSelect(pos);
        setFlyTarget(pos);
      } else {
        alert('Location not found. Try a different search term.');
      }
    } catch {
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div className="map-search-bar">
        <input
          type="text"
          placeholder="Search location (e.g. Gorakhpur Railway Station)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={searching}>
          {searching ? '...' : '🔍'}
        </button>
      </div>
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '380px', width: '100%', borderRadius: '10px', zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onLocationSelect={(pos) => { onLocationSelect(pos); setFlyTarget(pos); }} />
        {flyTarget && <FlyTo position={flyTarget} />}
        {location && <Marker position={[location.lat, location.lng]} />}
      </MapContainer>
      <p className="map-click-hint">📍 Click anywhere on the map to place your marker</p>
    </div>
  );
}
