import React from 'react';

const EmptyState = ({ message = "No issues found", subMessage = "Try adjusting your filters or search terms.", icon = "🔍" }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
      <p style={{ 
        fontSize: '15px', 
        fontWeight: '500', 
        color: '#1e293b',
        margin: '0 0 4px'
      }}>{message}</p>
      <p style={{ 
        fontSize: '13px', 
        color: '#64748b',
        margin: 0
      }}>{subMessage}</p>
    </div>
  );
};

export default EmptyState;
