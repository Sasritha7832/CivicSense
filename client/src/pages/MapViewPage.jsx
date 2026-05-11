import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useSupercluster from 'use-supercluster';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import IssueCardCompact from '../components/IssueCardCompact';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLORS = { 
  Open: '#ef4444', 
  InProgress: '#f59e0b', 
  Resolved: '#22c55e', 
  Rejected: '#64748b', 
  Closed: '#64748b' 
};

const createMarkerIcon = (color, isCluster = false, count = 0) => L.divIcon({
  className: '',
  html: isCluster
    ? `<div style="width:${Math.min(32+count,48)}px;height:${Math.min(32+count,48)}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15)">${count}</div>`
    : `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15)"></div>`,
  iconSize: isCluster ? [32,32] : [14,14],
  iconAnchor: isCluster ? [16,16] : [7,7],
});

function MapEventHandler({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds(), map.getZoom());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds(), map.getZoom());
    },
  });
  return null;
}

export default function MapViewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allIssues, setAllIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(13);
  const mapRef = useRef();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/issues', { params: { limit: 1000 } });
      setAllIssues(data.issues || []);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const filteredIssues = useMemo(() => {
    return (allIssues || []).filter(issue => {
      if (selectedCategory !== 'all' && issue.category?._id !== selectedCategory) return false;
      if (dateRange.start && new Date(issue.createdAt) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(issue.createdAt) > new Date(dateRange.end)) return false;
      return true;
    });
  }, [allIssues, selectedCategory, dateRange]);

  const getCategoryCount = useCallback((catId) => {
    return (allIssues || []).filter(i => {
      if (dateRange.start && new Date(i.createdAt) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(i.createdAt) > new Date(dateRange.end)) return false;
      return catId === 'all' ? true : i.category?._id === catId;
    }).length;
  }, [allIssues, dateRange]);

  const points = useMemo(() => filteredIssues
    .filter(issue => issue.location?.lat != null && issue.location?.lng != null)
    .map(issue => ({
      type: 'Feature',
      properties: { cluster: false, issueId: issue._id, status: issue.status, title: issue.title },
      geometry: {
        type: 'Point',
        coordinates: [issue.location.lng, issue.location.lat] // GeoJSON: [lng, lat]
      }
    })), [filteredIssues]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] : [],
    zoom,
    options: { radius: 75, maxZoom: 20 }
  });

  const onBoundsChange = (newBounds, newZoom) => {
    setBounds(newBounds);
    setZoom(newZoom);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        mapRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 15);
      }
    } catch {}
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
        },
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      {/* Top Bar */}
      <div style={{ 
        height: '56px', padding: '0 16px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: '16px', background: '#fff'
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, maxWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Search map location..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', height: '36px', border: '1px solid #e2e8f0', 
              borderRadius: '8px', padding: '0 12px', fontSize: '13px' 
            }}
          />
        </form>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="date" 
            value={dateRange.start}
            onChange={e => setDateRange({...dateRange, start: e.target.value})}
            style={{ height: '36px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 8px', fontSize: '12px' }}
          />
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={e => setDateRange({...dateRange, end: e.target.value})}
            style={{ height: '36px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 8px', fontSize: '12px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
          <button 
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'active' : ''}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
              background: selectedCategory === 'all' ? '#eff6ff' : '#f1f5f9',
              color: selectedCategory === 'all' ? '#2563eb' : '#64748b',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            All Issues <span style={{ background: selectedCategory === 'all' ? '#bfdbfe' : '#e2e8f0', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', color: '#1e293b' }}>{getCategoryCount('all')}</span>
          </button>
          {categories.map(cat => (
            <button 
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                background: selectedCategory === cat._id ? '#eff6ff' : '#f1f5f9',
                color: selectedCategory === cat._id ? '#2563eb' : '#64748b',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {cat.name} <span style={{ background: selectedCategory === cat._id ? '#bfdbfe' : '#e2e8f0', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', color: '#1e293b' }}>{getCategoryCount(cat._id)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer 
            center={[12.9716, 77.5946]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapEventHandler onBoundsChange={onBoundsChange} />
            
            {clusters.map(cluster => {
              const [longitude, latitude] = cluster.geometry.coordinates;
              const { cluster: isCluster, point_count: pointCount, issueId, status } = cluster.properties;

              if (isCluster) {
                return (
                  <Marker
                    key={`cluster-${cluster.id}`}
                    position={[latitude, longitude]}
                    icon={createMarkerIcon('#2563eb', true, pointCount)}
                    eventHandlers={{
                      click: () => {
                        const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
                        mapRef.current.setView([latitude, longitude], expansionZoom);
                      }
                    }}
                  />
                );
              }

              return (
                <Marker
                  key={`issue-${issueId}`}
                  position={[latitude, longitude]}
                  icon={createMarkerIcon(STATUS_COLORS[status] || '#64748b')}
                  eventHandlers={{
                    click: () => navigate(`/issues/${issueId}`)
                  }}
                />
              );
            })}
          </MapContainer>

          {/* Map Overlays */}
          <button 
            onClick={() => navigate('/report')}
            className="fab-report"
          >
            + Report Issue
          </button>

          <button 
            onClick={handleNearMe}
            style={{
              position: 'absolute', bottom: '80px', right: '16px', zIndex: 1000,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
            title="Near Me"
          >
            📍
          </button>

          <div style={{ 
            position: 'absolute', bottom: '20px', left: '16px', zIndex: 1000,
            background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: '8px',
            border: '1px solid #e2e8f0', display: 'flex', gap: '12px', fontSize: '11px', fontWeight: '600'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ef4444' }}></div> Open
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#f59e0b' }}></div> In Progress
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e' }}></div> Resolved
            </div>
          </div>
        </div>

        <div className="map-sidebar">
          <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
              Nearby Issues ({filteredIssues.length})
            </h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '16px' }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <Skeleton height="80px" radius="8px" />
                  </div>
                ))}
              </div>
            ) : filteredIssues.length > 0 ? (
              filteredIssues.map(issue => (
                <IssueCardCompact 
                  key={issue._id}
                  id={issue._id}
                  title={issue.title}
                  status={issue.status}
                  upvotes={issue.upvotesCount}
                  category={issue.category?.name}
                  image={issue.images?.[0]}
                />
              ))
            ) : (
              <EmptyState message="No issues found in this area" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
