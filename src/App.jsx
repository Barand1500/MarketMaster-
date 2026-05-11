import { useState, useEffect } from 'react';
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid var(--border)',
          borderTop: '4px solid var(--primary, #00b894)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  return (
    <>
      {errorToast}
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

