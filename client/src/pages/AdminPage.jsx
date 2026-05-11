import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { StatusBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import IssueCardFull from '../components/IssueCardFull';

const WARDS = ['Ward 1 - Central','Ward 2 - North','Ward 3 - South','Ward 4 - East','Ward 5 - West','Ward 6 - Northwest','Ward 7 - Northeast','Ward 8 - Southwest','Ward 9 - Southeast'];
const DEPARTMENTS = ['Roads','Sanitation','Water','Electricity','Parks','General'];

function AddOfficerForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', ward: '', department: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/admin/officers', form);
      toast.success(`✅ Officer "${data.officer.name}" created! They can now log in.`);
      onCreated(data.officer);
      setForm({ name: '', email: '', password: '', ward: '', department: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create officer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <input required placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
        style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
      <input required type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
        style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
      <input required type="password" placeholder="Temporary Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
        style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
      <select required value={form.department} onChange={e => setForm({...form, department: e.target.value})}
        style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}>
        <option value="">Select Department</option>
        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select required value={form.ward} onChange={e => setForm({...form, ward: e.target.value})}
        style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}>
        <option value="">Assign Ward</option>
        {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
      </select>
      <button type="submit" disabled={saving}
        style={{ height: '40px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Creating...' : '➕ Create Officer Account'}
      </button>
    </form>
  );
}

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [issues, setIssues] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', ward: '' });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.announcements);
    } catch (err) { console.error(err); }
  };

  const handleSendAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) return toast.error('Title and message required');
    setSendingAnnouncement(true);
    try {
      await api.post('/announcements', newAnnouncement);
      toast.success('Announcement broadcast successfully!');
      setNewAnnouncement({ title: '', message: '', ward: '' });
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to broadcast');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Announcement removed');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to remove announcement');
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/stats');
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIssues = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filters };
      const res = await api.get('/issues', { params });
      setIssues(res.data.issues);
      setPagination({ page: res.data.page, pages: res.data.pages });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/admin/officers');
      setOfficers(res.data.officers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    try {
      const res = await api.get('/admin/audit-log', { params: { page, limit: 20 } });
      setAuditLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIssues.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await api.patch('/admin/issues/bulk-status', { ids: selectedIssues, status: bulkStatus });
      toast.success(`Updated ${selectedIssues.length} issues to ${bulkStatus}`);
      setSelectedIssues([]);
      setBulkStatus('');
      fetchIssues(pagination.page);
    } catch (err) {
      toast.error('Failed to bulk update issues');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchCategories();
    fetchOfficers();
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTab === 'issues') fetchIssues();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'announcements') fetchAnnouncements();
  }, [activeTab, fetchIssues]);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'issues', label: 'All Issues', icon: '📋' },
    { id: 'officers', label: 'Officers', icon: '👮' },
    { id: 'announcements', label: 'Broadcasts', icon: '📢' },
    { id: 'audit', label: 'Audit Log', icon: '📜' },
  ];

  const StatCard = ({ label, value, subValue, color }) => (
    <div style={{
      background: '#fff',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      flex: 1,
      minWidth: '180px'
    }}>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: '700', color: color || '#1e293b', margin: 0 }}>{value}</h3>
        {subValue && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{subValue}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <div className="admin-sidebar">
        {sidebarItems.map(item => (
          <div
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                {activeTab === 'overview' && 'System-wide statistics and performance'}
                {activeTab === 'issues' && 'Manage and assign community issues'}
                {activeTab === 'officers' && 'Manage field officers and departments'}
                {activeTab === 'audit' && 'System activity and action logs'}
              </p>
            </div>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/issues/export/csv`, '_blank')}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <span style={{ fontSize: '16px' }}>📊</span> Export CSV
                </button>
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/issues/export/pdf`, '_blank')}
                  style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <span style={{ fontSize: '16px' }}>📄</span> Export PDF Report
                </button>
              </div>
            )}
          </div>

          {activeTab === 'overview' && (
            !dashboard ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} height="100px" radius="12px" width="180px" />
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <Skeleton height="300px" radius="12px" />
                  <Skeleton height="300px" radius="12px" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <StatCard label="Total Issues" value={dashboard.stats.totalIssues} />
                  <StatCard label="Open Issues" value={dashboard.stats.openIssues} color="#991b1b" />
                  <StatCard label="Resolved Today" value={dashboard.stats.resolvedToday} color="#166534" />
                  <StatCard label="Avg. Resolution" value={`${(dashboard.stats.avgResolutionTime || 0).toFixed(1)}d`} />
                  <StatCard label="SLA Breached" value={dashboard.stats.slaBreachedCount} color="#92400e" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Category Stats */}
                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Issues by Category</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {dashboard.charts.byCategory.map(cat => (
                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '100px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{cat.name}</div>
                          <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${dashboard.stats.totalIssues > 0 ? (cat.value / dashboard.stats.totalIssues) * 100 : 0}%`, 
                              height: '100%', 
                              background: '#2563eb',
                              borderRadius: '4px'
                            }} />
                          </div>
                          <div style={{ width: '40px', fontSize: '13px', fontWeight: '700', color: '#1e293b', textAlign: 'right' }}>{cat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Stats */}
                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Status Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {dashboard.charts.byStatus.map(status => (
                        <div key={status.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '100px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{status.name}</div>
                          <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${dashboard.stats.totalIssues > 0 ? (status.value / dashboard.stats.totalIssues) * 100 : 0}%`, 
                              height: '100%', 
                              background: status.name === 'Open' ? '#ef4444' : status.name === 'Resolved' ? '#22c55e' : '#f59e0b',
                              borderRadius: '4px'
                            }} />
                          </div>
                          <div style={{ width: '40px', fontSize: '13px', fontWeight: '700', color: '#1e293b', textAlign: 'right' }}>{status.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'issues' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: '12px', background: '#f8fafc', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Search issues by title or ID..." 
                    style={{ 
                      width: '100%', height: '40px', padding: '0 12px', 
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      fontSize: '14px', outline: 'none'
                    }}
                    value={filters.search}
                    onChange={e => setFilters({...filters, search: e.target.value})}
                  />
                </div>
                <select 
                  style={{ 
                    width: '160px', height: '40px', padding: '0 12px', 
                    borderRadius: '8px', border: '1px solid #e2e8f0',
                    fontSize: '14px', background: '#fff', cursor: 'pointer'
                  }}
                  value={filters.status}
                  onChange={e => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="card" style={{ height: '280px' }}>
                      <Skeleton height="100%" radius="12px" />
                    </div>
                  ))}
                </div>
              ) : issues.length > 0 ? (
                <>
                  {selectedIssues.length > 0 && (
                    <div style={{ background: '#e0e7ff', padding: '12px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#3730a3' }}>{selectedIssues.length} issues selected</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <select 
                          value={bulkStatus} 
                          onChange={e => setBulkStatus(e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #c7d2fe', fontSize: '13px' }}
                        >
                          <option value="">Update Status...</option>
                          <option value="Open">Open</option>
                          <option value="InProgress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <button 
                          onClick={handleBulkUpdate}
                          disabled={!bulkStatus || isBulkUpdating}
                          style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', opacity: (!bulkStatus || isBulkUpdating) ? 0.5 : 1 }}
                        >
                          Apply
                        </button>
                        <button 
                          onClick={() => setSelectedIssues([])}
                          style={{ background: 'transparent', color: '#4f46e5', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {issues.map(issue => (
                      <div key={issue._id} style={{ position: 'relative' }}>
                        <IssueCardFull 
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
                        <input 
                          type="checkbox" 
                          checked={selectedIssues.includes(issue._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIssues([...selectedIssues, issue._id]);
                            else setSelectedIssues(selectedIssues.filter(id => id !== issue._id));
                          }}
                          style={{ position: 'absolute', top: '16px', right: '16px', width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState message="No issues matching your filters" />
              )}
            </div>
          )}

          {activeTab === 'officers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Add Officer Form */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>➕ Add New Officer</h3>
                <AddOfficerForm onCreated={(officer) => setOfficers(prev => [...prev, officer])} />
              </div>

              {/* Officers List */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                  Active Officers ({officers.length})
                </h3>
                {officers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No officers added yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {officers.map(officer => (
                      <div key={officer._id} className="card" style={{ padding: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                          <div className="user-avatar" style={{ width: '42px', height: '42px', fontSize: '14px', background: '#dbeafe', color: '#1e40af' }}>
                            {officer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{officer.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{officer.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>Department</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{officer.department || 'General'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>Ward</span>
                            <span style={{ fontWeight: '600', color: '#2563eb' }}>{officer.ward || 'All'}</span>
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Remove ${officer.name} as officer?`)) return;
                              try {
                                await api.delete(`/admin/officers/${officer._id}`);
                                toast.success(`${officer.name} removed`);
                                setOfficers(prev => prev.filter(o => o._id !== officer._id));
                              } catch { toast.error('Failed to remove officer'); }
                            }}
                            style={{ marginTop: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            🗑 Remove Officer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Compose new announcement */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>📢 Broadcast New Announcement</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Title (e.g. Maintenance Alert)"
                    value={newAnnouncement.title}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <textarea
                    placeholder="Message (e.g. Water supply will be cut in Ward 4 tomorrow 9am-1pm)"
                    value={newAnnouncement.message}
                    onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                    style={{ width: '100%', minHeight: '80px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                      value={newAnnouncement.ward}
                      onChange={e => setNewAnnouncement({ ...newAnnouncement, ward: e.target.value })}
                      style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    >
                      <option value="">🌍 Broadcast to ALL Citizens</option>
                      {['Ward 1 - Central','Ward 2 - North','Ward 3 - South','Ward 4 - East','Ward 5 - West'].map(w => (
                        <option key={w} value={w}>{w} only</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSendAnnouncement}
                      disabled={sendingAnnouncement || !newAnnouncement.title || !newAnnouncement.message}
                      style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: (sendingAnnouncement || !newAnnouncement.title || !newAnnouncement.message) ? 0.6 : 1 }}
                    >
                      {sendingAnnouncement ? 'Sending...' : '🚀 Broadcast'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active announcements list */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>Active Announcements ({announcements.length})</h3>
                {announcements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No active announcements.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {announcements.map(a => (
                      <div key={a._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                        <span style={{ fontSize: '20px' }}>📢</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#92400e' }}>{a.title}</span>
                            {a.ward && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>{a.ward}</span>}
                            {!a.ward && <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>All Citizens</span>}
                          </div>
                          <p style={{ fontSize: '13px', color: '#78350f', margin: 0 }}>{a.message}</p>
                          <span style={{ fontSize: '11px', color: '#a16207', marginTop: '4px', display: 'block' }}>{format(new Date(a.createdAt), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteAnnouncement(a._id)}
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin User</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Details</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length > 0 ? auditLogs.map(log => (
                      <tr key={log._id} style={{ borderBottom: '0.5px solid #e2e8f0' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{log.adminId?.name || 'System'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.adminId?.email || 'automated@civicpulse.gov'}</div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ 
                            fontSize: '11px', fontWeight: '700', padding: '2px 8px', 
                            borderRadius: '4px', background: '#f1f5f9', color: '#475569',
                            textTransform: 'capitalize'
                          }}>{log.action.replace('_', ' ')}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748b' }}>
                          {log.issueId?.title ? (
                            <span>Issue: <span style={{ fontWeight: '500', color: '#1e293b' }}>{log.issueId.title}</span></span>
                          ) : (
                            <span>Changed <span style={{ fontWeight: '500' }}>{log.field}</span> to <span style={{ fontWeight: '500' }}>{typeof log.newValue === 'object' ? 'updated value' : log.newValue}</span></span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                          {format(new Date(log.timestamp), 'MMM dd, yyyy · HH:mm')}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px 0' }}>
                          <EmptyState message="No activity logs found" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPage;
