import { useState, useEffect, useRef } from 'react';
import { createHelpId, registerSection, unregisterSection } from '../utils/helpRegistry';

/**
 * Her sayfa bölümünün sağ üstüne yerleştirilen 💡 yardım butonu.
 * Sadece masaüstünde görünür (help-desktop-only).
 * Tıklanınca o bölümün yardım modalını açar.
 * F1'de App.jsx registry'den tümünü okuyarak toplu modal açar.
 */
export default function SectionHelpButton({ title, content }) {
  const [showHelp, setShowHelp] = useState(false);
  const id = useRef(createHelpId()).current;

  useEffect(() => {
    registerSection(id, title, content);
    return () => unregisterSection(id);
  // content kasıtlı bağımlılıktan çıkarıldı; başlık yeterlice render bağlamını temsil eder
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, title]);

  useEffect(() => {
    if (!showHelp) return;
    const handler = (e) => { if (e.key === 'Escape') setShowHelp(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp]);

  return (
    <>
      <button
        className="section-help-btn help-desktop-only"
        onClick={() => setShowHelp(true)}
        title={`Nasıl Kullanılır? — ${title}`}
        type="button"
      >💡</button>

      {showHelp && (
        <div className="modal-overlay help-overlay">
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <div className="help-modal-head">
              <div className="help-modal-icon">💡</div>
              <div>
                <div className="help-modal-title">Nasıl Kullanılır?</div>
                <div className="help-modal-sub">{title}</div>
              </div>
              <button className="help-modal-close" onClick={() => setShowHelp(false)}>
                ✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span>
              </button>
            </div>
            <div className="help-modal-body">{content}</div>
            <div className="help-modal-footer">
              <div className="help-modal-shortcut help-desktop-only">
                ⌨️ <strong>F1</strong> ile tüm bölümler
              </div>
              <button className="help-modal-btn" onClick={() => setShowHelp(false)}>Anladım ✓</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
