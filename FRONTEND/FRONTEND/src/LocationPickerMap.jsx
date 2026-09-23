import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default marker fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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

function LeafletClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function LeafletFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], 16);
  }, [position]);
  return null;
}

export default function LocationPickerMap({ location, onLocationSelect }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY;
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const mapRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleMarkerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const defaultCenter = location
    ? { lat: location.lat, lng: location.lng }
    : { lat: 26.7606, lng: 83.3732 }; // Gorakhpur default

  // Load Google Maps API & catch auth failures
  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps Auth Failed. Falling back to OpenStreetMap / Leaflet.');
      setLoadError(true);
    };

    if (apiKey) {
      loadGoogleMapsScript(apiKey)
        .then(() => {
          setGoogleMapsLoaded(true);
        })
        .catch((err) => {
          console.error('Google Maps Load Error:', err);
          setLoadError(true);
        });
    }
  }, [apiKey]);

  // Initialize and update Google Map
  useEffect(() => {
    if (!apiKey || !googleMapsLoaded || !mapRef.current || !window.google) return;

    if (!googleMapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        zoomControl: true,
      });

      map.addListener('click', (e) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        onLocationSelect(pos);
      });

      googleMapInstanceRef.current = map;
    }

    // Update marker
    const currentLoc = location || defaultCenter;
    if (googleMarkerRef.current) {
      googleMarkerRef.current.setPosition(currentLoc);
    } else {
      const marker = new window.google.maps.Marker({
        position: currentLoc,
        map: googleMapInstanceRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'Drag me to set location',
      });

      marker.addListener('dragend', (e) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        onLocationSelect(pos);
      });

      googleMarkerRef.current = marker;
    }
  }, [googleMapsLoaded, location, apiKey]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    // If Google Maps is active, try Google Geocoder first
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
            onLocationSelect(pos);
            if (googleMapInstanceRef.current) {
              googleMapInstanceRef.current.setCenter(pos);
              googleMapInstanceRef.current.setZoom(16);
            }
          } else {
            alert('Location not found via Google Maps. Try a different search term.');
          }
        });
        return;
      } catch (e) {
        console.warn('Google Geocoder failed, falling back to Nominatim', e);
      }
    }

    // Fallback search via OpenStreetMap Nominatim
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

  const isUsingGoogleMaps = apiKey && googleMapsLoaded && !loadError;

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

      {isUsingGoogleMaps ? (
        <div
          ref={mapRef}
          style={{ height: '380px', width: '100%', borderRadius: '10px', zIndex: 1 }}
        />
      ) : (
        <MapContainer
          center={[defaultCenter.lat, defaultCenter.lng]}
          zoom={14}
          style={{ height: '380px', width: '100%', borderRadius: '10px', zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LeafletClickHandler onLocationSelect={(pos) => { onLocationSelect(pos); setFlyTarget(pos); }} />
          {flyTarget && <LeafletFlyTo position={flyTarget} />}
          {location && <Marker position={[location.lat, location.lng]} />}
        </MapContainer>
      )}

      <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="map-click-hint">📍 Click or drag marker on map to set your location</span>
        <span style={{ color: isUsingGoogleMaps ? '#2e7d32' : '#e65100', fontWeight: 'bold' }}>
          {isUsingGoogleMaps ? '🗺️ Google Maps Active' : '🗺️ OpenStreetMap (Set VITE_GOOGLE_MAPS_API_KEY for Google Maps)'}
        </span>
      </div>
    </div>
  );
}
