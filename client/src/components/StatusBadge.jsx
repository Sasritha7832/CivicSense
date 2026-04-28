import React from 'react';

const STATUS_STYLES = {
  open:        { bg: '#fee2e2', color: '#991b1b', label: 'Open' },
  in_progress: { bg: '#fef3c7', color: '#92400e', label: 'In Progress' },
  resolved:    { bg: '#dcfce7', color: '#166534', label: 'Resolved' },
  rejected:    { bg: '#f1f5f9', color: '#475569', label: 'Rejected' },
};

const CATEGORY_STYLES = {
  road:       { bg: '#dbeafe', color: '#1e40af' },
  lighting:   { bg: '#fef3c7', color: '#92400e' },
  water:      { bg: '#e0f2fe', color: '#0369a1' },
  sanitation: { bg: '#f1f5f9', color: '#475569' },
};

export const StatusBadge = ({ status }) => {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_');
  const s = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.rejected;
  return (
    <span style={{
      padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '500',
      background: s.bg, color: s.color,
      display: 'inline-block'
    }}>{s.label}</span>
  );
};

export const CategoryBadge = ({ category }) => {
  const normalizedCat = category?.toLowerCase();
  const c = CATEGORY_STYLES[normalizedCat] || CATEGORY_STYLES.sanitation;
  return (
    <span style={{
      padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '500',
      background: c.bg, color: c.color,
      display: 'inline-block',
      textTransform: 'capitalize'
    }}>{category}</span>
  );
};
