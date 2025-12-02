import React, { useEffect, useState } from 'react';

const Notification = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Colors based on type
  const bgColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px', /* MOVED TO BOTTOM */
      right: '20px',  /* KEPT ON RIGHT */
      backgroundColor: bgColor,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 10002,
      fontWeight: '600',
      // Animation from bottom-up
      transform: visible ? 'translateY(0)' : 'translateY(100px)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      maxWidth: '400px'
    }}>
      <span>
        {type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️')}
      </span>
      
      <span style={{ flex: 1 }}>{message}</span>
      
      <button 
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0 0 0 8px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Notification;