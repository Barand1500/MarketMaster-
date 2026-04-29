import { useState, useEffect } from 'react';

export default function PageHeader({ title, sub, helpContent }) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault(); // Browser yardımını engelle
        setShowHelp(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="page-header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{sub}</p>
      </div>
      <div className="header-right">
        <button className="btn-help" onClick={() => setShowHelp(true)}>
          <span>💡</span> Nasıl Kullanılır?
        </button>
      </div>

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>📖 Yardım: {title}</h3>
              <button 
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>
            <div style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
              {helpContent}
            </div>
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setShowHelp(false)}>Anladım</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
