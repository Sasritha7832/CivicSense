import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import api from '../api/axios'
import Skeleton from '../components/Skeleton'

const STATUS_COLORS = {
  Open: '#ef4444', 
  InProgress: '#f59e0b', 
  Resolved: '#22c55e', 
  Rejected: '#6b7280',
  Closed: '#6b7280',
}

const PIE_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#6b7280']

export default function StatsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/public')
        setStats(res.data)
      } catch (err) {
        console.error('Failed to fetch stats')
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 20px' }}>
      <Skeleton height="40px" width="200px" radius="8px" style={{ marginBottom: '32px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <Skeleton height="320px" radius="16px" />
        <Skeleton height="320px" radius="16px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '32px' }}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} height="100px" radius="12px" />
        ))}
      </div>
    </div>
  )

  if (!stats) return null

  // Prepare data for charts
  const statusData = [
    { name: 'Open', value: stats.totals?.open || 0 },
    { name: 'In Progress', value: stats.totals?.inProgress || 0 },
    { name: 'Resolved', value: stats.totals?.resolved || 0 },
  ]
  const categoryData = (stats.byCategory || []).map(c => ({ name: c.category, value: c.total }))
  const wardData = (stats.wardStats || [])
    .filter(w => w.ward !== 'Unknown')
    .map(w => ({
      name: w.ward,
      rate: Math.round(w.closedRatio * 100),
      avgTime: w.avgResolutionHours
    }))

  const STATUS_COLORS_CHART = {
    'Open': '#ef4444', 
    'In Progress': '#f59e0b', 
    'Resolved': '#22c55e',
  }

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 20px', minHeight: '100vh', background: '#f1f5f9' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '32px' }}>Community Statistics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lg: { gridTemplateColumns: '1fr 1fr' }, gap: '24px' }}>
        {/* Issues by Status */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Issues by Status</h3>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS_CHART[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Category */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Issues by Category</h3>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '32px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Issues</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{stats.totals?.total || 0}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '8px' }}>Resolved</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#166534', margin: 0 }}>{stats.totals?.resolved || 0}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '8px' }}>In Progress</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#92400e', margin: 0 }}>{stats.totals?.inProgress || 0}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '8px' }}>Categories</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', margin: 0 }}>{stats.byCategory?.length || 0}</p>
        </div>
      </div>

      {/* Ward Resolution Rates */}
      <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Resolution Rate per Ward (%) & Avg Time (Hours)</h3>
        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wardData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} angle={-45} textAnchor="end" />
              <YAxis yAxisId="left" orientation="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontSize: '12px', color: '#1e293b' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" name="Resolution Rate (%)" dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar yAxisId="right" name="Avg Resolution (Hours)" dataKey="avgTime" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
