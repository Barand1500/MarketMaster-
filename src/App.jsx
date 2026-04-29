import { useState } from 'react';
import Login from './pages/Login';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Users from './pages/Users';
import './styles/global.css';

import CustomerPortal from './pages/CustomerPortal';

import Navbar from './components/Navbar';
import './components/Navbar.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('products');

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  // CUSTOMER VIEW
  if (session.role === 'customer') {
    return (
      <div className="main-content" style={{ marginLeft: 0, padding: '40px' }}>
        <CustomerPortal customer={session} onLogout={() => setSession(null)} />
      </div>
    );
  }

  // STAFF VIEW
  const renderPage = () => {
    const isSysAdmin = session.id === 'admin';
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
      default: return <Products />;
    }
  };

  return (
    <div className="app-container">
      <Navbar
        active={page}
        onNav={setPage}
        onLogout={() => setSession(null)}
        session={session}
      />
      <main className="main-content" style={{ marginLeft: 0 }}>
        {renderPage()}
      </main>
    </div>
  );
}

