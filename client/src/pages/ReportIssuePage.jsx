import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import ImageUpload from '../components/ImageUpload';
import toast from 'react-hot-toast';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({ click: (e) => setPosition(e.latlng) });
  return position ? (
    <Marker 
      position={position}
      icon={L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 12px rgba(37,99,235,0.5)"></div>`,
        iconSize: [18,18], iconAnchor: [9,9],
      })}
      draggable
      eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }}
    />
  ) : null;
}

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { animate: true });
  }, [position, map]);
  return null;
}

const WARDS = [
  "Ward 1 - Central", "Ward 2 - North", "Ward 3 - South", 
  "Ward 4 - East", "Ward 5 - West", "Ward 6 - Northwest",
  "Ward 7 - Northeast", "Ward 8 - Southwest", "Ward 9 - Southeast"
];

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initLat = params.get('lat') ? parseFloat(params.get('lat')) : 6.9271;
  const initLng = params.get('lng') ? parseFloat(params.get('lng')) : 79.8612;
  const hasCoords = !!(params.get('lat') && params.get('lng'));

  const [position, setPosition] = useState(hasCoords ? { lat: initLat, lng: initLng } : null);
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('issueDraft');
    if (saved) return JSON.parse(saved);
    return { title: '', description: '', category: '', priority: 'medium', ward: '' };
  });
  const [errors, setErrors] = useState({});
  const [userLocation, setUserLocation] = useState(null);

  // Draft Autosave
  useEffect(() => {
    localStorage.setItem('issueDraft', JSON.stringify(form));
  }, [form]);

  const handleBlur = (field) => {
    if (!form[field]) {
      setErrors(prev => ({ ...prev, [field]: 'This field is required' }));
    } else {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data.categories || []);
      if (data.categories?.length) setForm((f) => ({ ...f, category: data.categories[0]._id }));
    }).catch(() => {});

    // Auto-detect current location if no coordinates provided in URL
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (!hasCoords) setPosition(loc);
        },
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, [hasCoords]);

  // Reverse Geocoding
  useEffect(() => {
    if (!position) {
      setAddress('');
      return;
    }
    const fetchAddress = async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
        const data = await res.json();
        
        const fullAddress = data.display_name;
        const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || '';
        
        setAddress(area ? `${area} (${fullAddress.split(',')[0]})` : fullAddress);
        
        // Basic ward auto-select guess
        if (!form.ward && area) {
          const matchedWard = WARDS.find(w => w.toLowerCase().includes(area.toLowerCase()));
          if (matchedWard) setForm(f => ({ ...f, ward: matchedWard }));
        }
      } catch (err) {
        console.error('Geocoding failed', err);
        setAddress(`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`);
      } finally {
        setAddressLoading(false);
      }
    };
    
    const timeout = setTimeout(fetchAddress, 800); // 800ms debounce
    return () => clearTimeout(timeout);
  }, [position, form.ward]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setPosition({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setSearchQuery('');
      } else {
        toast.error('Location not found');
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const calculateDistance = (p1, p2) => {
    const R = 6371e3; // metres
    const φ1 = p1.lat * Math.PI/180;
    const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180;
    const Δλ = (p2.lng-p1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) return toast.error('Please pin a location on the map');
    
    // Validate that user is actually at the location (within 200m)
    if (userLocation) {
      const distance = calculateDistance(userLocation, position);
      if (distance > 200) {
        return toast.error(`Verification failed: You must be at the actual location to report this issue. (Currently ${Math.round(distance)}m away)`);
      }
    } else {
      return toast.error('Please enable GPS to verify your location.');
    }

    if (!form.category) return toast.error('Please select a category');
    if (!form.ward) return toast.error('Please select your ward');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('priority', form.priority);
      fd.append('lat', position.lat);
      fd.append('lng', position.lng);
      fd.append('address', address || 'Selected Location'); 

      fd.append('ward', form.ward);
      files.forEach((f) => fd.append('images', f));

      const { data } = await api.post('/issues', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      localStorage.removeItem('issueDraft');
      toast.success('Issue reported successfully! 🎉');
      navigate(`/issues/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 20px', minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', padding: 0, color: '#64748b', fontSize: '13px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>Report a Civic Issue</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Help your community — drop a pin and describe the problem.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Form Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Issue Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Large pothole on Main Street"
                  style={{ width: '100%', height: '40px', borderColor: errors.title ? '#ef4444' : '#e2e8f0' }}
                  value={form.title} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  onBlur={() => handleBlur('title')}
                  required 
                />
                {errors.title && <span style={{ color: '#ef4444', fontSize: '11px' }}>{errors.title}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea 
                  style={{ width: '100%', minHeight: '120px', padding: '12px', borderColor: errors.description ? '#ef4444' : '#e2e8f0' }}
                  placeholder="Describe the issue — size, severity, how long it's been there, any safety risks..."
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  onBlur={() => handleBlur('description')}
                  required 
                />
                {errors.description && <span style={{ color: '#ef4444', fontSize: '11px', display: 'block' }}>{errors.description}</span>}
                <p style={{ fontSize: '11px', color: form.description.length > 4500 ? '#ef4444' : '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                  {form.description.length}/5000 {form.description.length > 4500 && ' (Approaching limit)'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    style={{ width: '100%', height: '40px' }}
                    value={form.category} 
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Ward <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    style={{ width: '100%', height: '40px' }}
                    value={form.ward} 
                    onChange={(e) => setForm({ ...form, ward: e.target.value })}
                    required
                  >
                    <option value="">Select your ward</option>
                    {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Priority
                </label>
                <select 
                  style={{ width: '100%', height: '40px' }}
                  value={form.priority} 
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Location <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {position ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#166534' }}>
                    <span style={{ fontSize: '16px' }}>✓</span>
                    <span style={{ fontWeight: '500' }}>Location pinned</span>
                    <span style={{ fontSize: '11px', color: '#16a34a', marginLeft: 'auto', textAlign: 'right', maxWidth: '50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {addressLoading ? 'Loading address...' : address || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setPosition(null)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '2px 4px' }}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '12px', color: '#92400e' }}>
                    ⚠️ Click on the map to drop a pin at the issue location
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Photos (up to 5)
            </label>
            <ImageUpload files={files} setFiles={setFiles} maxFiles={5} />
          </div>
        </div>

        {/* Map Column */}
        <div className="lg:col-span-2 sticky top-[72px] h-fit">
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>📍 Pin Location</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Click to place · Drag marker to adjust</p>
                </div>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    type="text" 
                    placeholder="Search address..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '140px' }}
                  />
                  <button type="submit" disabled={searchLoading} style={{ padding: '4px 8px', fontSize: '12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {searchLoading ? '...' : '🔍'}
                  </button>
                </form>
              </div>
            </div>
            <div style={{ height: '450px' }}>
              <MapContainer
                center={[initLat, initLng]}
                zoom={hasCoords ? 15 : 12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <LocationPicker position={position} setPosition={setPosition} />
                <MapUpdater position={position} />
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      <button 
        type="button" 
        onClick={handleSubmit}
        disabled={loading || !position}
        style={{ 
          width: '100%', background: '#2563eb', color: '#fff', border: 'none', 
          borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', 
          cursor: (loading || !position) ? 'not-allowed' : 'pointer',
          opacity: (loading || !position) ? 0.7 : 1,
          boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
          marginTop: '8px'
        }}
      >
        {loading ? 'Submitting...' : '🚀 Submit Issue Report'}
      </button>
    </div>
  );
}
