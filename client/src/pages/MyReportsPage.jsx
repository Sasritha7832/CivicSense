import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import IssueCardFull from '../components/IssueCardFull';

const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'rejected'];
const STATUS_LABELS = { all: 'All Reports', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected' };

export default function MyReportsPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get('/issues/user/me', { params: { status, page, limit: 10 } })
      .then(({ data }) => { 
        setIssues(data.issues); 
        setPagination(data.pagination); 
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, page]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px', minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>My Reports</h1>
        <Link to="/report" style={{ 
          background: '#2563eb', color: '#fff', padding: '8px 16px', 
          borderRadius: '8px', fontSize: '13px', fontWeight: '600', 
          textDecoration: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          + Report Issue
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {STATUSES.map((s) => (
          <button 
            key={s} 
            onClick={() => { setStatus(s); setPage(1); }}
            style={{ 
              padding: '6px 14px', borderRadius: '7px', fontSize: '13px',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: status === s ? '#eff6ff' : 'none',
              color: status === s ? '#2563eb' : '#64748b',
              fontWeight: status === s ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Issue list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="120px" radius="12px" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <EmptyState message="No reports found in this category" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {issues.map((issue) => (
            <IssueCardFull 
              key={issue._id}
              id={issue._id}
              title={issue.title}
              status={issue.status}
              upvotes={issue.upvotesCount}
              image={issue.images?.[0]}
              description={issue.description}
              category={issue.category?.name}
              priority={issue.priority}
              ward={issue.location?.ward}
              createdAt={issue.createdAt}
              sla={issue.sla}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1} 
            style={{ 
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', 
              padding: '6px 16px', fontSize: '13px', fontWeight: '500', color: '#64748b',
              cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
            disabled={page >= pagination.pages} 
            style={{ 
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', 
              padding: '6px 16px', fontSize: '13px', fontWeight: '500', color: '#64748b',
              cursor: page >= pagination.pages ? 'not-allowed' : 'pointer', opacity: page >= pagination.pages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
