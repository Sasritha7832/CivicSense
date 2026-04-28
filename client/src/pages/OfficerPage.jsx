import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Skeleton from '../components/Skeleton'
import IssueCardFull from '../components/IssueCardFull'
import EmptyState from '../components/EmptyState'

export default function OfficerPage() {
  const { user } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '' })

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/officer/assigned', { 
        params: { 
          page: 1,
          limit: 50,
          ...filters 
        } 
      })
      setIssues(res.data.issues)
    } catch (err) {
      toast.error('Failed to load assigned issues')
    }
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  const handleStatusUpdate = async (issueId, status) => {
    try {
      // For Resolved status, we should ideally allow uploading proof images.
      // But for a quick update from the list, we'll just send the status.
      await api.patch(`/officer/issues/${issueId}/status`, { status })
      toast.success(`Status updated to ${status}`)
      fetchIssues()
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Officer Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your assigned tasks and update status.</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="input-field py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select 
            value={filters.priority}
            onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
            className="input-field py-2 text-sm"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} height="128px" radius="12px" />
          ))
        ) : issues.length === 0 ? (
          <EmptyState message="No issues assigned to you at the moment." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {issues.map((issue) => (
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
                <div style={{ 
                  position: 'absolute', top: '16px', right: '16px', 
                  display: 'flex', gap: '8px', zIndex: 10 
                }}>
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
                    style={{ 
                      height: '32px', fontSize: '12px', fontWeight: '600',
                      padding: '0 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                      background: '#fff', cursor: 'pointer', outline: 'none'
                    }}
                  >
                    <option value="InProgress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
