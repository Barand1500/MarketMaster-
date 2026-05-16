import { useState, useEffect } from 'react';
import { getSections } from './utils/helpRegistry';
import Login from './pages/Login';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Users from './pages/Users';
import Settings from './pages/Settings';
import './styles/global.css';

import CustomerPortal from './pages/CustomerPortal';

import Navbar from './components/Navbar';
import './components/Navbar.css';
import { useData } from './context/DataContext';

// Session storage key
const SESSION_KEY = 'bostan_session';

// localStorage'dan session oku
const getStoredSession = () => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// localStorage'a session kaydet
const setStoredSession = (session) => {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // localStorage full olabilir, görmezden gel
  }
};

export default function App() {
  const { loading, apiError, clearApiError, siteSettings } = useData();
  const [session, setSessionState] = useState(getStoredSession);
  const [page, setPage] = useState('products');
  const [showF1Help, setShowF1Help] = useState(false);
  const [f1Sections, setF1Sections] = useState([]);

  // F1 → tüm bölümlerin yardımını toplu göster
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        const secs = getSections();
        if (secs.length > 0) { setF1Sections(secs); setShowF1Help(true); }
      }
      if (e.key === 'Escape') setShowF1Help(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Session değiştiğinde localStorage'a kaydet
  const setSession = (newSession) => {
    setSessionState(prev => {
      const resolved = typeof newSession === 'function' ? newSession(prev) : newSession;
      setStoredSession(resolved);
      return resolved;
    });
  };

  // Sayfa yüklendiğinde localStorage'dan session kontrol et
  useEffect(() => {
    const stored = getStoredSession();
    if (stored && !session) {
      setSessionState(stored);
    }
  }, []);

  // siteSettings geldiğinde favicon ve sayfa başlığını uygula
  useEffect(() => {
    if (siteSettings?.site_adi) document.title = siteSettings.site_adi;
    if (siteSettings?.favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = siteSettings.favicon;
    }
  }, [siteSettings]);

  if (loading) {
    const cachedSettings = (() => { try { const s = localStorage.getItem('siteSettings'); return s ? JSON.parse(s) : null; } catch { return null; } })();
    const hasCache = cachedSettings && cachedSettings.site_adi;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)', flexDirection: 'column', gap: '16px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {hasCache ? (
          <>
            {cachedSettings.logo
              ? <img src={cachedSettings.logo} alt={cachedSettings.site_adi} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              : <div style={{ fontSize: '56px' }}>🍉</div>}
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{cachedSettings.site_adi}</div>
          </>
        ) : null}
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid var(--border)',
          borderTop: '4px solid var(--primary, #00b894)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  const errorToast = apiError ? (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '14px 18px', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <span style={{ fontSize: '20px' }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#991b1b', fontSize: '14px' }}>Bağlantı Hatası</div>
        <div style={{ color: '#b91c1c', fontSize: '13px', marginTop: '2px' }}>{apiError}</div>
      </div>
      <button onClick={clearApiError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '20px', lineHeight: 1, padding: '0' }}>×</button>
    </div>
  ) : null;

  if (!session) {
    return <>{errorToast}<Login onLogin={setSession} /></>;
  }

  // CUSTOMER VIEW
  if (session.role === 'customer') {
    return (
      <>
        {errorToast}
        <div className="main-content" style={{ marginLeft: 0, padding: '0 20px 20px' }}>
          <CustomerPortal customer={session} onLogout={() => setSession(null)} onSessionUpdate={setSession} />
        </div>
      </>
    );
  }

  // STAFF VIEW
  const renderPage = () => {
    const isSysAdmin = session.role === 'admin';
    const allowed = session.allowedPages || [];
    
    // Güvenlik: Eğer sayfa yetkisi yoksa veya ilk girişse, izinli olduğu ilk sayfaya yönlendir
    if (!isSysAdmin && !allowed.includes(page)) {
      if (allowed.length > 0) {
        setPage(allowed[0]);
      } else {
        return <div style={{ padding: '40px', textAlign: 'center' }}><h2>Yetkiniz Bulunmuyor</h2><p>Hiçbir sayfaya erişim yetkiniz yok. Lütfen yönetici ile iletişime geçin.</p></div>;
      }
    }

    switch (page) {
      case 'products': return <Products />;
      case 'customers': return <Customers />;
      case 'users': return <Users />;
      case 'settings': return (isSysAdmin || allowed.includes('settings')) ? <Settings /> : <div style={{ padding: '40px', textAlign: 'center' }}><h2>Yetkiniz Bulunmuyor</h2></div>;
      default: return <Products />;
    }
  };

  // F1 toplu yardım modalı
  const f1Modal = showF1Help ? (
    <div className="modal-overlay help-overlay" style={{ zIndex: 10000 }}>
      <div className="help-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="help-modal-head">
          <div className="help-modal-icon">💡</div>
          <div>
            <div className="help-modal-title">Sayfa Rehberi</div>
            <div className="help-modal-sub">Tüm bölümlerin açıklamaları</div>
          </div>
          <button className="help-modal-close" onClick={() => setShowF1Help(false)}>
            ✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span>
          </button>
        </div>
        <div className="help-modal-body" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
          {f1Sections.map((sec, i) => (
            <div key={sec.id}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '20px', background: 'var(--primary)', borderRadius: '2px', flexShrink: 0, display: 'inline-block' }} />
                {sec.title}
              </div>
              {sec.content}
              {i < f1Sections.length - 1 && <div style={{ height: '1px', background: '#f1f5f9', margin: '20px 0' }} />}
            </div>
          ))}
        </div>
        <div className="help-modal-footer">
          <div className="help-modal-shortcut">⌨️ <strong>F1</strong> veya <strong>ESC</strong> ile kapat</div>
          <button className="help-modal-btn" onClick={() => setShowF1Help(false)}>Anladım ✓</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {errorToast}
      {f1Modal}
      <div className="app-container">
        <Navbar
          active={page}
          onNav={setPage}
          onLogout={() => setSession(null)}
          session={session}
          onSessionUpdate={setSession}
        />
        <main className="main-content" style={{ marginLeft: 0 }}>
          {renderPage()}
        </main>
      </div>
    </>
  );
}

