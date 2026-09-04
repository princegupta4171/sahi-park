import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const youAreHereIcon = L.divIcon({
  html: '<div style="background:#1565c0;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(21,101,192,0.8)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: '',
});

const parkingIcon = L.divIcon({
  html: '<div style="background:#e53935;color:white;font-size:18px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🅿</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
});

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], 15);
  }, [position?.lat, position?.lng]);
  return null;
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export default function NearbyParkingMap({ userLocation, nearbySpaces, onBook, onUseMyLocation }) {
  const [radius, setRadius] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(userLocation);

  const filtered = nearbySpaces
    .filter((s) => s.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

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
        setFlyTarget({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      } else {
        alert('Location not found.');
      }
    } catch {
      alert('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const getDirections = (space) => {
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation.lat},${userLocation.lng};${space.latitude},${space.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div className="renter-map-controls">
        <div className="map-search-bar">
          <input
            type="text"
            placeholder="Search a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={searching}>{searching ? '...' : '🔍'}</button>
        </div>
        <div className="radius-filter">
          <label>Radius:</label>
          {[1, 2, 5, 10].map((r) => (
            <button
              key={r}
              className={`radius-btn ${radius === r ? 'active' : ''}`}
              onClick={() => setRadius(r)}
            >
              {r} km
            </button>
          ))}
          <button className="use-location-btn" onClick={() => { onUseMyLocation(); setFlyTarget(userLocation); }}>
            📍 My Location
          </button>
        </div>
      </div>

      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={14}
        style={{ height: '400px', width: '100%', borderRadius: '10px', zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FlyTo position={flyTarget} />

        {/* Renter location */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={youAreHereIcon}>
          <Popup><strong>📍 You are here</strong></Popup>
        </Marker>

        {/* Radius circle */}
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={radius * 1000}
          pathOptions={{ color: '#667eea', fillColor: '#667eea', fillOpacity: 0.05, weight: 1.5 }}
        />

        {/* Parking markers */}
        {filtered.map((space) => (
          <Marker key={space._id} position={[space.latitude, space.longitude]} icon={parkingIcon}>
            <Popup minWidth={220}>
              <div className="popup-card">
                <h4>{space.parkingName || 'Parking Space'}</h4>
                <p>💰 ₹{space.pricePerHour}/hour</p>
                <p>📍 {space.address}</p>
                <p>📏 {formatDistance(space.distance)}</p>
                <p>👤 {space.providerName}</p>
                {space.mobile && <p>📞 {space.mobile}</p>}
                <span className={`popup-badge ${space.isAvailable ? 'available' : 'occupied'}`}>
                  {space.isAvailable ? '✅ Available' : '❌ Occupied'}
                </span>
                <div className="popup-actions">
                  <button className="popup-book-btn" onClick={() => onBook(space)} disabled={!space.isAvailable}>
                    Book Now
                  </button>
                  <button className="popup-dir-btn" onClick={() => getDirections(space)}>
                    🗺 Directions
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="nearby-list">
        <h4>🏛️ Nearby Parking ({filtered.length} found within {radius} km)</h4>
        {filtered.length === 0 ? (
          <div className="no-spaces">
            <p>😞 No parking spaces found nearby.</p>
            <p>Try increasing the search radius.</p>
          </div>
        ) : (
          filtered.map((space) => (
            <div key={space._id} className="nearby-item">
              <div className="space-details">
                <h5>{space.parkingName || 'Parking Space'}</h5>
                <p><strong>Provider:</strong> {space.providerName}</p>
                <p><strong>Address:</strong> {space.address}</p>
                <p><strong>Distance:</strong> {formatDistance(space.distance)}</p>
                <p><strong>Price:</strong> ₹{space.pricePerHour}/hour</p>
                {space.description && <p><strong>Info:</strong> {space.description}</p>}
              </div>
              <div className="nearby-item-actions">
                <button className="book-btn" onClick={() => onBook(space)} disabled={!space.isAvailable}>
                  {space.isAvailable ? 'Book Now' : 'Occupied'}
                </button>
                <button className="dir-btn" onClick={() => getDirections(space)}>🗺 Directions</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
