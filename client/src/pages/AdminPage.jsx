import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { StatusBadge } from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import IssueCardFull from '../components/IssueCardFull';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, issues, audit, officers
  const [dashboard, setDashboard] = useState(null);
  const [issues, setIssues] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

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

  useEffect(() => {
    fetchDashboard();
    fetchCategories();
    fetchOfficers();
  }, []);

  useEffect(() => {
    if (activeTab === 'issues') fetchIssues();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchIssues]);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'issues', label: 'All Issues', icon: '📋' },
    { id: 'officers', label: 'Officers', icon: '👮' },
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
          <div style={{ marginBottom: '32px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                  {issues.map(issue => (
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
              ) : (
                <EmptyState message="No issues matching your filters" />
              )}
            </div>
          )}

          {activeTab === 'officers' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {officers.map(officer => (
                <div key={officer._id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="user-avatar" style={{ width: '42px', height: '42px', fontSize: '14px' }}>
                      {officer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{officer.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{officer.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>Department</span>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{officer.department || 'General'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '500' }}>Assigned Ward</span>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{officer.ward || 'All Wards'}</span>
                    </div>
                  </div>
                </div>
              ))}
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
