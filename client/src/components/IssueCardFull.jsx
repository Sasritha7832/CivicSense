import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge, CategoryBadge } from './StatusBadge';
import SlaTimer from './SlaTimer';

export default function IssueCardFull({ id, title, status, upvotes, image, description, sla, category, priority, ward, createdAt }) {
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };

  const imageUrl = getImageUrl(image);

  return (
    <Link to={`/issues/${id}`} className="card-hover" style={{ 
      display: 'block', textDecoration: 'none', background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden',
      transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      {imageUrl && (
        <div style={{ height: '160px', overflow: 'hidden' }}>
          <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <StatusBadge status={status} />
          <CategoryBadge category={category} />
          <span style={{ 
            fontSize: '11px', fontWeight: '500', color: priority === 'Critical' ? '#991b1b' : '#64748b',
            background: priority === 'Critical' ? '#fee2e2' : '#f1f5f9',
            padding: '2px 8px', borderRadius: '20px'
          }}>{priority}</span>
        </div>
        
        <h3 style={{ 
          fontSize: '15px', fontWeight: '700', color: '#1e293b', 
          margin: '0 0 8px', lineHeight: '1.4', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: '13px', color: '#64748b', margin: '0 0 16px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {description}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
              {upvotes}
            </div>
            {ward && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {ward}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sla?.deadline && <SlaTimer deadline={sla.deadline} breached={sla.breached} compact />}
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : ''}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
