import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

export default function IssueCardCompact({ id, title, status, upvotes, category, image }) {
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };

  const imageUrl = getImageUrl(image);

  return (
    <Link to={`/issues/${id}`} className="sidebar-issue-card" style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
        {imageUrl && <img src={imageUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <StatusBadge status={status} />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{category}</span>
          </div>
          {/* Status Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: status === 'Resolved' ? '#22c55e' : status === 'InProgress' ? '#f59e0b' : status === 'Rejected' ? '#64748b' : '#ef4444',
              width: status === 'Resolved' ? '100%' : status === 'InProgress' ? '50%' : status === 'Rejected' ? '100%' : '10%'
            }}></div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
          {upvotes}
        </div>
      </div>
    </Link>
  );
}
