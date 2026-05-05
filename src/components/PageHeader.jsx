import { useState, useEffect } from 'react';

export default function PageHeader({ title, sub, helpContent, helpContentMobile, actions }) {
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
        {actions && <div className="header-actions">{actions}</div>}
        <button className="btn-help" onClick={() => setShowHelp(true)}>
          <span>💡</span> Nasıl Kullanılır?
        </button>
      </div>

      {showHelp && (
        <div className="modal-overlay help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            {/* Başlık */}
            <div className="help-modal-head">
              <div className="help-modal-icon">💡</div>
              <div>
                <div className="help-modal-title">Nasıl Kullanılır?</div>
                <div className="help-modal-sub">{title}</div>
              </div>
              <button className="help-modal-close" onClick={() => setShowHelp(false)}>✕</button>
            </div>

            {/* İçerik */}
            <div className="help-modal-body">
              {helpContentMobile ? (
                <>
                  <div className="help-desktop-only">{helpContent}</div>
                  <div className="help-mobile-only">{helpContentMobile}</div>
                </>
              ) : helpContent}
            </div>

            {/* Footer */}
            <div className="help-modal-footer">
              <div className="help-modal-shortcut help-desktop-only">⌨️ <strong>F1</strong> ile de açabilirsiniz</div>
              <div className="help-modal-shortcut help-mobile-only" style={{ fontSize: '11px', color: '#a0aec0' }}>📱 Mobil görünüm</div>
              <button className="help-modal-btn" onClick={() => setShowHelp(false)}>Anladım ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
