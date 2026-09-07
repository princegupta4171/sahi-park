import { useState, useEffect, lazy, Suspense } from 'react';
import './App.css';

const LocationPickerMap = lazy(() => import('./LocationPickerMap'));
const NearbyParkingMap = lazy(() => import('./NearbyParkingMap'));

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [formData, setFormData] = useState({ username: '', password: '', userType: 'renter' });
  const [showLogin, setShowLogin] = useState(false);
  const [loginType, setLoginType] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [allParkingSpaces, setAllParkingSpaces] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbySpaces, setNearbySpaces] = useState([]);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [parkingArea, setParkingArea] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactInfo, setContactInfo] = useState({ mobile: '', email: '', address: '' });
  const [markerPosition, setMarkerPosition] = useState({ x: 250, y: 250 });
  const [isDragging, setIsDragging] = useState(false);
  const [parkingRect, setParkingRect] = useState({ x: 300, y: 200, width: 200, height: 100 });
  const [resizing, setResizing] = useState(null);
  const [moving, setMoving] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pricePerHour, setPricePerHour] = useState(50);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [bookingDuration, setBookingDuration] = useState(1);
  const [searchLocation, setSearchLocation] = useState({ lat: '', lng: '' });
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [locationInputMethod, setLocationInputMethod] = useState('current');
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerFormData, setProviderFormData] = useState({
    parkingName: '',
    address: '',
    mobile: '',
    email: '',
    pricePerHour: 50,
    totalSpaces: 1,
    description: ''
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (showMap && user?.userType === 'provider') {
      console.log('Provider map opened, initializing canvas...');
      setTimeout(() => {
        const canvas = document.getElementById('drawingCanvas');
        console.log('Canvas element:', canvas);
        if (canvas) {
          const parent = canvas.parentElement;
          console.log('Parent element:', parent);
          canvas.width = parent.offsetWidth;
          canvas.height = parent.offsetHeight;
          canvas.style.display = 'block';
          console.log('Canvas size:', canvas.width, canvas.height);
          drawRectangle();
        } else {
          console.log('Canvas not found!');
        }
      }, 100);
    }
  }, [showMap, user, parkingRect]);

  const drawRectangle = () => {
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
    ctx.fillRect(parkingRect.x, parkingRect.y, parkingRect.width, parkingRect.height);
    ctx.strokeRect(parkingRect.x, parkingRect.y, parkingRect.width, parkingRect.height);
    
    // Draw resize handles
    ctx.fillStyle = '#4CAF50';
    const handleSize = 10;
    // Corners
    ctx.fillRect(parkingRect.x - handleSize/2, parkingRect.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(parkingRect.x + parkingRect.width - handleSize/2, parkingRect.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(parkingRect.x - handleSize/2, parkingRect.y + parkingRect.height - handleSize/2, handleSize, handleSize);
    ctx.fillRect(parkingRect.x + parkingRect.width - handleSize/2, parkingRect.y + parkingRect.height - handleSize/2, handleSize, handleSize);
  };

  const loadSpaces = async () => {
    const res = await fetch(`${API_BASE_URL}/spaces`);
    const data = await res.json();
    setSpaces(data);
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const data = await res.json();
      console.log('Users loaded:', data);
      setAllUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users. Check if backend is running.');
    }
  };

  const loadAllParkingSpaces = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/spaces`);
      const data = await res.json();
      console.log('Parking spaces loaded:', data);
      setAllParkingSpaces(data);
    } catch (error) {
      console.error('Error loading parking spaces:', error);
      alert('Failed to load parking spaces. Check if backend is running.');
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdminAuthenticated(true);
      loadUsers();
      loadAllParkingSpaces();
    } else {
      alert('Invalid admin password');
    }
  };

  useEffect(() => {
    if (user) {
      loadSpaces();
      getUserLocation();
    }
  }, [user]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          alert('Location access denied. Please enable location in browser settings.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const findNearbySpaces = async (lat, lng) => {
    const res = await fetch(`${API_BASE_URL}/nearby-spaces?lat=${lat}&lng=${lng}`);
    const data = await res.json();
    setNearbySpaces(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: formData.username, password: formData.password })
    });
    const data = await res.json();
    console.log('Login response:', data);
    if (data.success) {
      console.log('Setting user with userType:', data.userType);
      const userData = { ...data, userType: data.userType || loginType };
      setUser(userData);
      setFormData({ username: '', password: '', userType: 'renter' });
      setShowLogin(false);
    } else {
      alert(data.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const registerData = { ...formData, userType: loginType };
    console.log('Registering with data:', registerData);
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });
    const data = await res.json();
    console.log('Register response:', data);
    if (data.success) {
      alert('Registration successful! Please login.');
      setShowRegister(false);
      setFormData({ username: '', password: '', userType: loginType });
    } else {
      alert(data.message);
    }
  };

  const extractCoordsFromGoogleLink = (link) => {
    try {
      // Check if it's a shortened link (goo.gl or maps.app.goo.gl)
      if (link.includes('goo.gl')) {
        alert('⚠️ Shortened link detected!\n\nPlease follow these steps:\n1. Open this link in Google Maps\n2. Right-click on the red marker\n3. Click the coordinates to copy them\n4. Use "Enter Coordinates" option to paste them');
        return null;
      }
      
      let match = link.match(/[?&]q=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/);
      if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      match = link.match(/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/);
      if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      match = link.match(/\/place\/[^/]+\/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/);
      if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      
      // Try to extract from URL parameters
      match = link.match(/!3d([+-]?\d+\.?\d*)!4d([+-]?\d+\.?\d*)/);
      if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleFindSpace = () => {
    console.log('handleFindSpace called, user type:', user?.userType);
    if (user?.userType === 'provider') {
      console.log('Opening provider form');
      setShowProviderForm(true);
    } else {
      console.log('Opening location picker for renter');
      setShowLocationPicker(true);
    }
  };

  const submitProviderForm = () => {
    if (!providerFormData.parkingName || !providerFormData.address || !providerFormData.mobile) {
      alert('Please fill all required fields');
      return;
    }
    setShowProviderForm(false);
    setShowLocationPicker(true);
  };

  const confirmLocation = async () => {
    if (!tempLocation) {
      alert('Please select a location');
      return;
    }
    
    console.log('Confirming location for user type:', user?.userType);
    console.log('Full user object:', user);
    setUserLocation(tempLocation);
    
    if (!user || user.userType === 'renter') {
      console.log('Renter flow - finding nearby spaces');
      await findNearbySpaces(tempLocation.lat, tempLocation.lng);
      setShowLocationPicker(false);
      setShowMap(true);
    } else if (user.userType === 'provider') {
      console.log('Provider flow - submitting parking space');
      try {
        const res = await fetch(`${API_BASE_URL}/provide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            providerId: user.userId, 
            providerName: user.username,
            latitude: tempLocation.lat,
            longitude: tempLocation.lng,
            mobile: providerFormData.mobile,
            email: providerFormData.email,
            address: providerFormData.address,
            pricePerHour: parseFloat(providerFormData.pricePerHour),
            parkingName: providerFormData.parkingName,
            totalSpaces: providerFormData.totalSpaces,
            description: providerFormData.description
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Parking space added successfully!');
          setShowLocationPicker(false);
          setProviderFormData({
            parkingName: '',
            address: '',
            mobile: '',
            email: '',
            pricePerHour: 50,
            totalSpaces: 1,
            description: ''
          });
          setTempLocation(null);
          loadSpaces();
        } else {
          alert(data.message || 'Failed to add parking space');
        }
      } catch (error) {
        console.error('Error submitting parking space:', error);
        alert('Failed to submit parking space. Please try again.');
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setTempLocation(loc);
        },
        (error) => {
          alert('Please enable location access in browser settings');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  const handleManualLocation = () => {
    if (searchLocation.lat && searchLocation.lng) {
      setTempLocation({ lat: parseFloat(searchLocation.lat), lng: parseFloat(searchLocation.lng) });
    } else {
      alert('Please enter valid coordinates');
    }
  };

  const handleGoogleLink = () => {
    const coords = extractCoordsFromGoogleLink(googleMapsLink);
    if (coords) {
      setTempLocation(coords);
    } else {
      alert('Invalid Google Maps link');
    }
  };

  const handleProvideSpace = async () => {
    await submitProvideSpace();
  };

  const submitProvideSpace = async () => {
    if (!pricePerHour || pricePerHour < 10) {
      alert('Please enter valid price (minimum ₹10/hour)');
      return;
    }
    const res = await fetch(`${API_BASE_URL}/provide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        providerId: user.userId, 
        providerName: user.username,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        parkingArea: parkingRect,
        mobile: user.mobile,
        email: user.email,
        address: user.address,
        pricePerHour: parseFloat(pricePerHour)
      })
    });
    const data = await res.json();
    if (data.success) {
      loadSpaces();
      setShowMap(false);
      setSelectedMapLocation(null);
      setParkingRect({ x: 300, y: 200, width: 200, height: 100 });
      setShowContactForm(false);
      setPricePerHour(50);
      alert('Parking space provided successfully!');
    } else {
      alert(data.message);
    }
  };

  const handleBookSpace = async (space) => {
    setSelectedSpace(space);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    const totalAmount = selectedSpace.pricePerHour * bookingDuration;
    const res = await fetch(`${API_BASE_URL}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        spaceId: selectedSpace._id, 
        renterId: user.userId, 
        renterName: user.username,
        duration: bookingDuration,
        totalAmount
      })
    });
    const data = await res.json();
    if (data.success) {
      const payRes = await fetch(`${API_BASE_URL}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: selectedSpace._id })
      });
      const payData = await payRes.json();
      if (payData.success) {
        loadSpaces();
        setShowMap(false);
        setShowPayment(false);
        setSelectedSpace(null);
        setBookingDuration(1);
        alert(`Payment successful! ₹${totalAmount} paid for ${bookingDuration} hour(s)`);
      }
    } else {
      alert(data.message);
    }
  };

  const handleReleaseSpace = async (spaceId) => {
    if (!window.confirm('Are you sure you want to release this parking space?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spaceId, 
          renterId: user.userId 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Parking space released successfully!');
        loadSpaces();
      } else {
        alert(data.message || 'Failed to release parking space.');
      }
    } catch (error) {
      console.error('Error releasing parking space:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="app">
      <div className="hero-section">
        <header className="app-header">
          <div className="header-content">
            <h1>🅿️ Sahi Park</h1>
            <nav className="nav-buttons">
              <button onClick={() => {}}>Home</button>
              <button onClick={() => setShowAbout(true)}>About Us</button>
              <button onClick={() => {}}>Find Your Space</button>
              <button onClick={() => setShowContact(true)}>Contact Us</button>
              {!user && (
                <>
                  <button className="login-btn renter" onClick={() => { setShowLogin(true); setLoginType('renter'); }}>Login as Renter</button>
                  <button className="login-btn provider" onClick={() => { setShowLogin(true); setLoginType('provider'); }}>Login as Provider</button>
                </>
              )}
              {user && <button className="logout-btn" onClick={() => { setUser(null); setSpaces([]); setShowLogin(false); }}>Logout</button>}
              <button className="admin-btn" onClick={() => { setShowAdmin(!showAdmin); setIsAdminAuthenticated(false); setAdminPassword(''); }}>Admin Panel</button>
            </nav>
          </div>
        </header>
        {!user && (
          <div className="hero-content">
            <div className="hero-text">
              <h2 className="hero-title">Find Your Perfect Parking Space</h2>
              <p className="hero-subtitle">Smart, Easy, Convenient</p>
            </div>
            <div className="hero-images">
              <img src="/1.jpeg" alt="Parking" className="hero-img img-1" />
              <img src="/2.jpeg" alt="Parking" className="hero-img img-2" />
            </div>
          </div>
        )}
      </div>

      {!user && (
        <div className="info-section">
          <div className="info-container">
            <img src="/safe and secure.jpg" alt="Safe Parking" className="info-image" />
            <div className="info-text">
              <h3>Explore</h3>
              <h2>Nearby Parking Spots</h2>
              <p className="info-subtitle">Need of parking?</p>
              <p>Our app can help you</p>
              <p>Discover parking spaces location near you.</p>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="features-section">
          <img src="https://images.pexels.com/photos/395537/pexels-photo-395537.jpeg?cs=srgb" alt="Parking Lot" className="features-bg" />
          <div className="features-overlay">
            <h2>Why Choose Sahi Park?</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🚗</div>
                <h3>Easy Booking</h3>
                <p>Find and book parking spaces in seconds</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3>Best Prices</h3>
                <p>Competitive rates for all parking locations</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📍</div>
                <h3>Prime Locations</h3>
                <p>Parking spaces near you, always available</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Secure & Safe</h3>
                <p>Your vehicle is in trusted hands</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showContact && (
        <div className="contact-modal">
          <div className="contact-content">
            <button className="close-contact" onClick={() => setShowContact(false)}>✕</button>
            <h2>Contact Us</h2>
            <div className="contact-info-grid">
              <div className="contact-card">
                <div className="contact-icon">👤</div>
                <h3>Team Leader</h3>
                <p className="contact-name">Prince Gupta</p>
              </div>
              <div className="contact-card">
                <div className="contact-icon">👤</div>
                <h3>Devloper</h3>
                <p className="contact-name">Satya Dubey</p>
              </div>
              <div className="contact-card">
                <div className="contact-icon">💼</div>
                <h3>Tester</h3>
                <p className="contact-name">Sachin Chauhan</p>
              </div>
              <div className="contact-card highlight">
                <div className="contact-icon">📞</div>
                <h3>Customer Helpline</h3>
                <p className="contact-name">Pritsh Mall</p>
                <a href="tel:8853308557" className="contact-phone">📱 8853308557</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div className="about-modal">
          <div className="about-content">
            <button className="close-about" onClick={() => setShowAbout(false)}>✕</button>
            <h2>About Sahi Park</h2>
            <div className="about-text">
              <p>Welcome to <strong>Sahi Park</strong> - Your trusted parking solution!</p>
              <p>We connect parking space providers with people looking for convenient parking spots. Our platform makes it easy to find, book, and manage parking spaces in your area.</p>
              <h3>Our Mission</h3>
              <p>To revolutionize urban parking by creating a seamless connection between parking space owners and drivers, making parking hassle-free for everyone.</p>
              <h3>How It Works</h3>
              <ul>
                <li><strong>For Renters:</strong> Search nearby parking spaces, view prices, and book instantly</li>
                <li><strong>For Providers:</strong> List your parking space, set your price, and earn money</li>
              </ul>
              <h3>Why Choose Us?</h3>
              <ul>
                <li>🚗 Real-time availability</li>
                <li>💰 Competitive pricing</li>
                <li>📍 Location-based search</li>
                <li>🔒 Secure transactions</li>
                <li>⭐ Verified parking spaces</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {showAdmin && (
        <div className="admin-panel">
          <div className="admin-content">
            {!isAdminAuthenticated ? (
              <div className="admin-login">
                <h2>🔒 Admin Login</h2>
                <input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                <div className="admin-login-actions">
                  <button onClick={handleAdminLogin}>Login</button>
                  <button onClick={() => setShowAdmin(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="admin-header">
                  <h2>Admin Panel - Management Dashboard</h2>
                  <button onClick={() => { setShowAdmin(false); setIsAdminAuthenticated(false); }}>Close</button>
                </div>
                
                <div className="admin-tabs">
                  <div className="users-table">
                    <h3>👥 All Registered Users ({allUsers.length})</h3>
                    {allUsers.length === 0 ? (
                      <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No users registered yet</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>User ID</th>
                            <th>Username</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Address</th>
                            <th>User Type</th>
                            <th>Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allUsers.map((u) => (
                            <tr key={u._id}>
                              <td>{u._id}</td>
                              <td>{u.username}</td>
                              <td>{u.mobile}</td>
                              <td>{u.email}</td>
                              <td>{u.address}</td>
                              <td><span className={`badge ${u.userType}`}>{u.userType}</span></td>
                              <td>{new Date(u.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="parking-spaces-table">
                    <h3>🏛️ All Parking Spaces ({allParkingSpaces.filter(s => s.providerId).length})</h3>
                    {allParkingSpaces.filter(s => s.providerId).length === 0 ? (
                      <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No parking spaces added yet</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Space ID</th>
                            <th>Parking Name</th>
                            <th>Provider</th>
                            <th>Address</th>
                            <th>Mobile</th>
                            <th>Price/Hour</th>
                            <th>Total Spaces</th>
                            <th>Status</th>
                            <th>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allParkingSpaces.filter(s => s.providerId).map((space) => (
                            <tr key={space._id}>
                              <td>{space._id}</td>
                              <td>{space.parkingName || 'N/A'}</td>
                              <td>{space.providerName}</td>
                              <td>{space.address}</td>
                              <td>{space.mobile}</td>
                              <td>₹{space.pricePerHour}</td>
                              <td>{space.totalSpaces || 1}</td>
                              <td><span className={`badge ${space.isAvailable ? 'available' : 'occupied'}`}>{space.isAvailable ? 'Available' : 'Occupied'}</span></td>
                              <td>{space.latitude?.toFixed(4)}, {space.longitude?.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showProviderForm && (
        <div className="provider-form-modal">
          <div className="provider-form-box">
            <h3>🏢 Parking Space Details</h3>
            <p className="form-subtitle">Fill in the details about your parking space</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Parking Name *</label>
                <input
                  type="text"
                  placeholder="e.g. City Center Parking"
                  value={providerFormData.parkingName}
                  onChange={(e) => setProviderFormData({ ...providerFormData, parkingName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Full Address *</label>
                <textarea
                  placeholder="Enter complete address"
                  value={providerFormData.address}
                  onChange={(e) => setProviderFormData({ ...providerFormData, address: e.target.value })}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={providerFormData.mobile}
                  onChange={(e) => setProviderFormData({ ...providerFormData, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={providerFormData.email}
                  onChange={(e) => setProviderFormData({ ...providerFormData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Price per Hour (₹) *</label>
                <input
                  type="number"
                  min="10"
                  placeholder="50"
                  value={providerFormData.pricePerHour}
                  onChange={(e) => setProviderFormData({ ...providerFormData, pricePerHour: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Total Parking Spaces</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={providerFormData.totalSpaces}
                  onChange={(e) => setProviderFormData({ ...providerFormData, totalSpaces: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="Any additional information about your parking space"
                  value={providerFormData.description}
                  onChange={(e) => setProviderFormData({ ...providerFormData, description: e.target.value })}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="submit-form-btn" onClick={submitProviderForm}>
                Next: Select Location
              </button>
              <button className="cancel-form-btn" onClick={() => setShowProviderForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLocationPicker && (
        <div className="location-picker-modal">
          <div className="location-picker-box">
            <h3>📍 {user?.userType === 'provider' ? 'Select Parking Location' : 'Select Your Location'}</h3>
            <p className="picker-subtitle">Click on the map or search to set location</p>

            <div className="quick-location-row">
              <button className="use-gps-btn" onClick={getCurrentLocation}>📍 Use My GPS Location</button>
            </div>

            <Suspense fallback={<div className="map-loading">Loading map...</div>}>
              <LocationPickerMap
                location={tempLocation}
                onLocationSelect={(pos) => setTempLocation(pos)}
              />
            </Suspense>

            {tempLocation && (
              <div className="selected-location">
                <p>✅ Location Selected</p>
                <p className="coords">Lat: {tempLocation.lat.toFixed(6)}, Lng: {tempLocation.lng.toFixed(6)}</p>
              </div>
            )}
            {!tempLocation && (
              <p className="location-required-hint">⚠️ Please select a location on the map to continue.</p>
            )}

            <div className="picker-actions">
              <button className="confirm-location-btn" onClick={confirmLocation} disabled={!tempLocation}>
                Confirm Location
              </button>
              <button className="cancel-picker-btn" onClick={() => { setShowLocationPicker(false); setTempLocation(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMap && userLocation && user?.userType === 'renter' && (
        <div className="map-modal">
          <div className="map-container map-container-wide">
            <h3>🔍 Nearby Available Parking Spaces</h3>
            <Suspense fallback={<div className="map-loading">Loading map...</div>}>
              <NearbyParkingMap
                userLocation={userLocation}
                nearbySpaces={nearbySpaces}
                onBook={handleBookSpace}
                onUseMyLocation={() => {
                  getUserLocation();
                  if (userLocation) findNearbySpaces(userLocation.lat, userLocation.lng);
                }}
              />
            </Suspense>
            <div className="map-actions">
              <button className="cancel-btn" onClick={() => { setShowMap(false); setNearbySpaces([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}



      {showPayment && selectedSpace && (
        <div className="payment-modal">
          <div className="payment-box">
            <h3>💳 Payment Details</h3>
            <div className="payment-info">
              <p><strong>Provider:</strong> {selectedSpace.providerName}</p>
              <p><strong>Location:</strong> {selectedSpace.address}</p>
              <p><strong>Price:</strong> ₹{selectedSpace.pricePerHour}/hour</p>
              <p><strong>Contact:</strong> {selectedSpace.mobile}</p>
            </div>
            <div className="duration-selector">
              <label>Select Duration (hours):</label>
              <input
                type="number"
                min="1"
                max="24"
                value={bookingDuration}
                onChange={(e) => setBookingDuration(parseInt(e.target.value))}
              />
            </div>
            <div className="total-amount">
              <h4>Total Amount: ₹{selectedSpace.pricePerHour * bookingDuration}</h4>
            </div>
            <div className="payment-actions">
              <button className="pay-btn" onClick={handlePayment}>Pay Now</button>
              <button className="cancel-btn" onClick={() => { setShowPayment(false); setSelectedSpace(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showContactForm && (
        <div className="contact-form-modal">
          <div className="contact-form">
            <h3>Provider Contact Details</h3>
            <p className="form-note">Please provide your contact information for renters</p>
            <input
              type="tel"
              placeholder="Mobile Number"
              value={contactInfo.mobile}
              onChange={(e) => setContactInfo({ ...contactInfo, mobile: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={contactInfo.email}
              onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              required
            />
            <textarea
              placeholder="Full Address"
              value={contactInfo.address}
              onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
              rows="3"
              required
            />
            <div className="form-actions">
              <button className="submit-btn" onClick={submitProvideSpace}>Submit</button>
              <button className="cancel-btn" onClick={() => setShowContactForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showLogin && !user && (
        <div className="auth-box">
          {showRegister ? (
            <form onSubmit={handleRegister}>
              <h3>Register as {loginType === 'provider' ? 'Provider' : 'Renter'}</h3>
              <input
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
              <input type="hidden" value={loginType} />
              <button type="submit">Register</button>
              <button type="button" onClick={() => setShowRegister(false)}>Back to Login</button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <h3>Login as {loginType === 'provider' ? 'Provider' : 'Renter'}</h3>
              <input
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button type="submit">Login</button>
              <button type="button" onClick={() => { setShowRegister(true); setFormData({ ...formData, userType: loginType }); }}>Register</button>
              <button type="button" onClick={() => setShowLogin(false)}>Cancel</button>
            </form>
          )}
        </div>
      )}

      {user && (
        <div className="user-info">
          <p>Welcome, {user.username} ({user.userType === 'provider' ? '🏠 Provider' : '🚗 Renter'})</p>
          {userLocation && <p className="location-status">📍 Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>}
        </div>
      )}

      {user && (
        <div className="action-center">
          {user.userType === 'renter' ? (
            <>
              <button className="find-space-btn" onClick={handleFindSpace}>
                🔍 Find Nearby Parking Spaces
              </button>
            </>
          ) : (
            <>
              <button className="provide-space-btn" onClick={handleFindSpace}>
                ➕ Provide Parking Space
              </button>
            </>
          )}
        </div>
      )}

      {user && user.userType === 'renter' && (
        <div className="dashboard-section">
          <h2>🚗 My Active Bookings</h2>
          <div className="dashboard-grid">
            {spaces.filter(s => s.renterId === user.userId).length > 0 ? (
              spaces.filter(s => s.renterId === user.userId).map(space => (
                <div key={space._id} className="dashboard-card">
                  <div className="card-header">
                    <h3>{space.parkingName || 'Parking Spot'}</h3>
                    <span className="badge available">Active Booking</span>
                  </div>
                  <div className="card-body">
                    <p><strong>Address:</strong> {space.address}</p>
                    <p><strong>Mobile:</strong> {space.mobile}</p>
                    <p><strong>Duration:</strong> {space.bookingDuration} hours</p>
                    <p><strong>Rate:</strong> ₹{space.pricePerHour}/hour</p>
                    <p><strong>Total Paid:</strong> ₹{space.totalAmount}</p>
                  </div>
                  <div className="card-actions">
                    <button className="release-btn" onClick={() => handleReleaseSpace(space._id)}>
                      Release Space
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-items-card">
                <p>You have no active bookings. Click "Find Nearby Parking Spaces" above to book one!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {user && user.userType === 'provider' && (
        <div className="dashboard-section">
          <h2>🏠 My Listed Parking Spaces</h2>
          <div className="dashboard-grid">
            {spaces.filter(s => s.providerId === user.userId).length > 0 ? (
              spaces.filter(s => s.providerId === user.userId).map(space => (
                <div key={space._id} className="dashboard-card">
                  <div className="card-header">
                    <h3>{space.parkingName || 'Parking Spot'}</h3>
                    <span className={`badge ${space.isAvailable ? 'available' : 'occupied'}`}>
                      {space.isAvailable ? 'Available' : 'Occupied'}
                    </span>
                  </div>
                  <div className="card-body">
                    <p><strong>Address:</strong> {space.address}</p>
                    <p><strong>Rate:</strong> ₹{space.pricePerHour}/hour</p>
                    {!space.isAvailable && (
                      <>
                        <p><strong>Renter:</strong> {space.renterName}</p>
                        <p><strong>Booking Duration:</strong> {space.bookingDuration} hours</p>
                        <p><strong>Status:</strong> {space.isPaid ? 'Paid' : 'Unpaid'}</p>
                      </>
                    )}
                  </div>
                  <div className="card-actions">
                    {!space.isAvailable && (
                      <button className="release-btn" onClick={() => handleReleaseSpace(space._id)}>
                        Force Release Space
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-items-card">
                <p>You have not listed any parking spaces yet. Click "Provide Parking Space" above to list one!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
