import React from 'react';

export default function Skeleton({ width = '100%', height = '1rem', radius = '6px' }) {
  return (
    <div 
      className="skeleton" 
      style={{ 
        width, 
        height, 
        borderRadius: radius,
        display: 'block'
      }} 
    />
  );
}
