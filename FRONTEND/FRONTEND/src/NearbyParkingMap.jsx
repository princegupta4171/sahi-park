import { useState, useEffect, useRef } from 'react';
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

// Helper for dynamic Google Maps Script Loading
let googleMapsPromise = null;
function loadGoogleMapsScript(apiKey) {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', (err) => reject(err));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps SDK error'));
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

function LeafletFlyTo({ position }) {
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
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY;
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const mapRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleMarkersRef = useRef([]);
  const googleCircleRef = useRef(null);
  const userMarkerRef = useRef(null);
  const activeInfoWindowRef = useRef(null);

  const [radius, setRadius] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(userLocation);

  const filtered = nearbySpaces
    .filter((s) => s.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  // Load Google Maps API & catch auth failures
  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps Auth Failed. Falling back to OpenStreetMap / Leaflet.');
      setLoadError(true);
    };

    if (apiKey) {
      loadGoogleMapsScript(apiKey)
        .then(() => setGoogleMapsLoaded(true))
        .catch((err) => {
          console.error('Google Maps Load Error:', err);
          setLoadError(true);
        });
    }
  }, [apiKey]);

  // Handle Google Maps initialization & marker rendering
  useEffect(() => {
    if (!apiKey || !googleMapsLoaded || !mapRef.current || !window.google) return;

    if (!googleMapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.lat, lng: userLocation.lng },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        zoomControl: true,
      });
      googleMapInstanceRef.current = map;
    }

    const map = googleMapInstanceRef.current;

    // User Location Marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng });
    } else {
      userMarkerRef.current = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        title: 'You are here',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#1565c0',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
    }

    // Radius Circle
    if (googleCircleRef.current) {
      googleCircleRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      googleCircleRef.current.setRadius(radius * 1000);
    } else {
      googleCircleRef.current = new window.google.maps.Circle({
        strokeColor: '#667eea',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#667eea',
        fillOpacity: 0.1,
        map,
        center: { lat: userLocation.lat, lng: userLocation.lng },
        radius: radius * 1000,
      });
    }

    // Clear existing parking markers
    googleMarkersRef.current.forEach((m) => m.setMap(null));
    googleMarkersRef.current = [];

    // Add new parking markers
    filtered.forEach((space) => {
      const marker = new window.google.maps.Marker({
        position: { lat: space.latitude, lng: space.longitude },
        map,
        title: space.parkingName || 'Parking Space',
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#e53935',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${space.latitude},${space.longitude}`;
      const content = document.createElement('div');
      content.className = 'popup-card';
      content.innerHTML = `
        <h4 style="margin:0 0 5px 0; color:#1565c0;">${space.parkingName || 'Parking Space'}</h4>
        <p style="margin:2px 0;">💰 ₹${space.pricePerHour}/hour</p>
        <p style="margin:2px 0;">📍 ${space.address}</p>
        <p style="margin:2px 0;">📏 ${formatDistance(space.distance)}</p>
        <p style="margin:2px 0;">👤 ${space.providerName}</p>
        ${space.mobile ? `<p style="margin:2px 0;">📞 ${space.mobile}</p>` : ''}
        <span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; margin:5px 0; color:white; background:${space.isAvailable ? '#4CAF50' : '#f44336'}">
          ${space.isAvailable ? '✅ Available' : '❌ Occupied'}
        </span>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button id="gmap-book-${space._id}" style="background:#667eea; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" ${!space.isAvailable ? 'disabled' : ''}>
            Book Now
          </button>
          <a href="${dirUrl}" target="_blank" style="background:#4285F4; color:white; text-decoration:none; padding:6px 12px; border-radius:6px; font-size:13px;">
            🗺 Directions
          </a>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({ content });

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;

        // Bind click handler for Book Now button inside InfoWindow
        setTimeout(() => {
          const btn = document.getElementById(`gmap-book-${space._id}`);
          if (btn) {
            btn.onclick = () => onBook(space);
          }
        }, 100);
      });

      googleMarkersRef.current.push(marker);
    });

  }, [googleMapsLoaded, userLocation, filtered, radius, apiKey]);

  // Pan Google Map when flyTarget changes
  useEffect(() => {
    if (googleMapInstanceRef.current && flyTarget) {
      googleMapInstanceRef.current.panTo({ lat: flyTarget.lat, lng: flyTarget.lng });
    }
  }, [flyTarget]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    if (apiKey && googleMapsLoaded && window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          setSearching(false);
          if (status === 'OK' && results[0]) {
            const pos = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            };
            setFlyTarget(pos);
          } else {
            alert('Location not found via Google Maps search.');
          }
        });
        return;
      } catch (e) {
        console.warn('Google Geocoder failed, trying OpenStreetMap', e);
      }
    }

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
    const url = apiKey
      ? `https://www.google.com/maps/dir/?api=1&destination=${space.latitude},${space.longitude}`
      : `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLocation.lat},${userLocation.lng};${space.latitude},${space.longitude}`;
    window.open(url, '_blank');
  };

  const isUsingGoogleMaps = apiKey && googleMapsLoaded && !loadError;

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

      <div style={{ marginBottom: '8px', textAlign: 'right', fontSize: '13px' }}>
        <span style={{ color: isUsingGoogleMaps ? '#2e7d32' : '#e65100', fontWeight: 'bold' }}>
          {isUsingGoogleMaps ? '🗺️ Google Maps Active' : '🗺️ OpenStreetMap (Set VITE_GOOGLE_MAPS_API_KEY for Google Maps)'}
        </span>
      </div>

      {isUsingGoogleMaps ? (
        <div
          ref={mapRef}
          style={{ height: '400px', width: '100%', borderRadius: '10px', zIndex: 1 }}
        />
      ) : (
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={14}
          style={{ height: '400px', width: '100%', borderRadius: '10px', zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LeafletFlyTo position={flyTarget} />

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
      )}

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
