import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge, CategoryBadge } from './StatusBadge';
import SlaTimer from './SlaTimer';

export default function IssueCard({ issue, compact = false }) {
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };
  const image = getImageUrl(issue.images?.[0]);

  if (compact) {
    return (
      <Link to={`/issues/${issue._id}`} style={{ 
        display:'block', textDecoration:'none', padding:'12px 16px',
        borderBottom:'1px solid #f1f5f9', transition:'background 0.2s'
      }} className="sidebar-issue-card">
        <div style={{ display:'flex', gap:'12px', alignItems:'start' }}>
          {image && <img src={image} alt="" style={{ width:'48px', height:'48px', borderRadius:'8px', objectFit:'cover', flexShrink:0 }} />}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:'13px', fontWeight:'600', color:'#1e293b', margin:'0 0 4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {issue.title}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <StatusBadge status={issue.status} />
              <span style={{ fontSize:'11px', color:'#94a3b8' }}>{issue.category?.name}</span>
            </div>
          </div>
          <div style={{ fontSize:'11px', color:'#94a3b8', display:'flex', alignItems:'center', gap:'4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
            {issue.upvotes?.length || 0}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/issues/${issue._id}`} style={{ 
      display:'block', textDecoration:'none', background:'#fff',
      border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden',
      transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.06)'
    }} className="card-hover">
      {image && (
        <div style={{ height:'160px', overflow:'hidden' }}>
          <img src={image} alt={issue.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>
      )}
      <div style={{ padding:'16px' }}>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
          <StatusBadge status={issue.status} />
          <CategoryBadge category={issue.category?.name} />
          <span style={{ 
            fontSize:'11px', fontWeight:'500', color: issue.priority === 'Critical' ? '#991b1b' : '#64748b',
            background: issue.priority === 'Critical' ? '#fee2e2' : '#f1f5f9',
            padding:'2px 8px', borderRadius:'20px'
          }}>{issue.priority}</span>
        </div>
        
        <h3 style={{ 
          fontSize:'15px', fontWeight:'700', color:'#1e293b', 
          margin:'0 0 8px', lineHeight:'1.4', display:'-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {issue.title}
        </h3>
        
        <p style={{ 
          fontSize:'13px', color:'#64748b', margin:'0 0 16px',
          display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {issue.description}
        </p>
        
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'12px', borderTop:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', color:'#64748b', fontSize:'12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
              {issue.upvotes?.length || 0}
            </div>
            {issue.location?.ward && (
              <span style={{ fontSize:'12px', color:'#94a3b8' }}>📍 {issue.location.ward}</span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            {issue.slaDeadline && <SlaTimer deadline={issue.slaDeadline} breached={issue.slaBreached} compact />}
            <span style={{ fontSize:'11px', color:'#94a3b8' }}>
              {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
