import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SlaTimer from '../components/SlaTimer';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { StatusBadge, CategoryBadge } from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function CommentBubble({ comment, depth = 0, onReply }) {
  const { user } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [loading, setLoading] = useState(false);

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setLoading(true);
    try {
      await onReply(replyBody, comment._id);
      setReplyBody(''); 
      setShowReply(false);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div style={{ marginLeft: depth > 0 ? '32px' : '0', borderLeft: depth > 0 ? '1px solid #e2e8f0' : 'none', paddingLeft: depth > 0 ? '16px' : '0', marginBottom: '12px' }}>
      <div style={{ 
        background: comment.isOfficialNote ? '#eff6ff' : '#f8fafc', 
        border: comment.isOfficialNote ? '1px solid #dbeafe' : '1px solid #f1f5f9',
        borderRadius: '12px', padding: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '50%', 
            background: '#2563eb', color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '10px', fontWeight: 'bold' 
          }}>
            {comment.author?.name?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{comment.author?.name}</span>
          {comment.isOfficialNote && (
            <span style={{ background: '#2563eb', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px' }}>
              OFFICIAL NOTE
            </span>
          )}
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: 0 }}>{comment.body}</p>
        {user && depth < 2 && (
          <button 
            onClick={() => setShowReply(!showReply)} 
            style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontSize: '11px', fontWeight: '500', marginTop: '8px', cursor: 'pointer' }}
          >
            Reply
          </button>
        )}
      </div>
      {showReply && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <input 
            style={{ 
              flex: 1, height: '32px', border: '1px solid #e2e8f0', 
              borderRadius: '8px', padding: '0 12px', fontSize: '12px' 
            }} 
            placeholder="Write a reply..." 
            value={replyBody} 
            onChange={(e) => setReplyBody(e.target.value)} 
            autoFocus 
          />
          <button 
            onClick={submitReply} 
            disabled={loading} 
            style={{ 
              background: '#2563eb', color: '#fff', border: 'none', 
              borderRadius: '8px', padding: '0 12px', fontSize: '12px', fontWeight: '600' 
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default function IssueDetailPage() {
  const { id } = useParams();
  const { user, isAdmin, isOfficer } = useAuth();
  const navigate = useNavigate();

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };

  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [commentBody, setCommentBody] = useState('');
  const [isOfficialNote, setIsOfficialNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: issueData }, { data: cmtData }] = await Promise.all([
          api.get(`/issues/${id}`),
          api.get(`/issues/${id}/comments`),
        ]);
        setIssue(issueData);
        setVoteCount(issueData.upvotes?.length || 0);
        setVoted(user ? issueData.upvotes?.some((uid) => (typeof uid === 'string' ? uid === user._id : uid._id === user._id)) : false);
        setComments(cmtData);
      } catch (err) {
        toast.error('Failed to load issue');
        navigate('/');
      }
      setLoading(false);
    };
    load();
  }, [id, user, navigate]);

  const handleUpvote = async () => {
    if (!user) return navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    try {
      const { data } = await api.post(`/issues/${id}/upvote`);
      setVoted(data.hasUpvoted);
      setVoteCount(data.upvotes);
    } catch {
      toast.error('Failed to upvote');
    }
  };

  const submitComment = async (body, parentId = null) => {
    if (!body || !body.trim()) return;
    setSubmitting(true);
    try {
      const url = parentId ? `/issues/${id}/comments/${parentId}/reply` : `/issues/${id}/comments`;
      await api.post(url, { body, isOfficialNote: isOfficialNote && !parentId });
      
      const { data: cmtData } = await api.get(`/issues/${id}/comments`);
      setComments(cmtData);
      setCommentBody('');
      setIsOfficialNote(false);
      toast.success('Comment posted');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to post comment'); 
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        await api.delete(`/issues/${id}`);
        toast.success('Report deleted successfully');
        navigate(-1);
      } catch (err) {
        toast.error('Failed to delete report');
      }
    }
  };

  const buildTree = (comments) => {
    const map = {}, roots = [];
    comments.forEach((c) => { map[c._id] = { ...c, children: [] }; });
    comments.forEach((c) => {
      if (c.parentId && map[c.parentId]) map[c.parentId].children.push(map[c._id]);
      else roots.push(map[c._id]);
    });
    return roots;
  };

  const renderThread = (nodes, depth = 0) => nodes.map((node) => (
    <div key={node._id}>
      <CommentBubble comment={node} depth={depth} onReply={submitComment} />
      {node.children?.length > 0 && renderThread(node.children, depth + 1)}
    </div>
  ));

  if (loading) return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Skeleton height="400px" radius="16px" />
          <Skeleton height="200px" radius="16px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Skeleton height="150px" radius="16px" />
          <Skeleton height="300px" radius="16px" />
        </div>
      </div>
    </div>
  );

  if (!issue) return null;

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 20px', minHeight: '100vh', background: '#f1f5f9' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: 'none', border: 'none', padding: 0, color: '#64748b', fontSize: '13px', marginBottom: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        ← Back to list
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lg: { gridTemplateColumns: '2fr 1fr' }, gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Card */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {issue.images?.length > 0 && (
              <div style={{ position: 'relative', height: '400px', background: '#f8fafc' }}>
                <img src={getImageUrl(issue.images[imgIdx])} alt={issue.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {issue.images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx((i) => (i - 1 + issue.images.length) % issue.images.length)}
                      style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>‹</button>
                    <button onClick={() => setImgIdx((i) => (i + 1) % issue.images.length)}
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>›</button>
                    <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                      {issue.images.map((_, i) => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === imgIdx ? '#2563eb' : '#cbd5e1' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div style={{ padding: '24px' }}>
              {/* Status Progress Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {['Open', 'InProgress', 'Resolved'].map((step, idx, arr) => {
                  const currentIdx = arr.indexOf(issue.status) !== -1 ? arr.indexOf(issue.status) : 0;
                  const isActive = idx <= currentIdx;
                  return (
                    <div key={step} style={{ flex: 1, height: '6px', borderRadius: '4px', background: isActive ? '#10b981' : '#e2e8f0', transition: 'background 0.3s' }} />
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <StatusBadge status={issue.status} />
                  <CategoryBadge category={issue.category?.name} />
                  <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', background: '#f1f5f9', padding: '2px 9px', borderRadius: '20px' }}>
                    {issue.priority}
                  </span>
                  {issue.location?.ward && <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {issue.location.ward}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => {
                    const url = window.location.href;
                    if (navigator.share) {
                      navigator.share({ title: issue.title, url }).catch(()=>{});
                    } else {
                      navigator.clipboard.writeText(url);
                      toast.success('Link copied to clipboard!');
                    }
                  }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    Share
                  </button>
                  {user && (user.role === 'admin' || user._id === issue.createdBy?._id) && (
                    <button onClick={handleDelete} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px' }}>{issue.title}</h1>
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px', whiteSpace: 'pre-wrap' }}>{issue.description}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', fontSize: '13px', color: '#64748b' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>
                  {issue.createdBy?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{issue.createdBy?.name}</span>
                  <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
                  <span>{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                </div>
                {issue.resolvedAt && (
                  <span style={{ marginLeft: 'auto', color: '#166534', fontWeight: '500' }}>
                    ✓ Resolved {formatDistanceToNow(new Date(issue.resolvedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>
              Comments ({comments.length})
            </h3>

            <div style={{ marginBottom: '24px' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  <p style={{ fontSize: '14px', margin: 0 }}>No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                renderThread(buildTree(comments))
              )}
            </div>

            {user ? (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <textarea 
                  style={{ 
                    width: '100%', minHeight: '100px', border: '1px solid #e2e8f0', 
                    borderRadius: '12px', padding: '12px', fontSize: '14px', 
                    marginBottom: '12px', resize: 'vertical', fontFamily: 'inherit' 
                  }} 
                  placeholder="Write a comment..."
                  value={commentBody} 
                  onChange={(e) => setCommentBody(e.target.value)} 
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {isOfficer && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isOfficialNote} onChange={(e) => setIsOfficialNote(e.target.checked)} />
                      Mark as Official Note
                    </label>
                  )}
                  <button 
                    onClick={() => submitComment(commentBody)} 
                    disabled={submitting || !commentBody.trim()} 
                    style={{ 
                      marginLeft: 'auto', background: '#2563eb', color: '#fff', 
                      border: 'none', borderRadius: '8px', padding: '8px 20px', 
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      opacity: (submitting || !commentBody.trim()) ? 0.6 : 1
                    }}
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Please <Link to={`/login?redirect=/issues/${id}`} style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>log in</Link> to join the conversation.
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Action Card */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <button 
              onClick={handleUpvote}
              style={{ 
                width: '100%', background: voted ? '#eff6ff' : '#fff', 
                border: voted ? '1px solid #dbeafe' : '1px solid #e2e8f0',
                borderRadius: '12px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isAnimating ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={voted ? '#2563eb' : 'none'} stroke={voted ? '#2563eb' : '#64748b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
              <span style={{ fontSize: '20px', fontWeight: '800', color: voted ? '#2563eb' : '#1e293b' }}>{voteCount}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: voted ? '#2563eb' : '#64748b' }}>
                {voted ? 'UPVOTED' : 'UPVOTE THIS ISSUE'}
              </span>
            </button>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px', marginHorizontal: '8px' }}>
              Upvote to show that this issue also affects you or you support its resolution.
            </p>
          </div>

          {/* SLA Card */}
          {issue.slaDeadline && (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Resolution Target
              </p>
              <SlaTimer deadline={issue.slaDeadline} breached={issue.slaBreached} />
            </div>
          )}

          {/* Map Card */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Location</p>
            </div>
            <div style={{ height: '200px' }}>
              <MapContainer 
                center={[issue.location.lat, issue.location.lng]} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <Marker position={[issue.location.lat, issue.location.lng]} />
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
