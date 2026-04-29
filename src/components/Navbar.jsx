import React from 'react';
import { useData } from '../context/DataContext';
import './Navbar.css';

export default function Navbar({ active, onNav, onLogout, session }) {
  const isSysAdmin = session?.id === 'admin';
  const allowed = session?.allowedPages || [];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-left">
          <div className="nav-logo">🍉 Bostan Manav</div>
          <div className="nav-links">
            {(isSysAdmin || allowed.includes('products')) && (
              <button className={`nav-link ${active === 'products' ? 'active' : ''}`} onClick={() => onNav('products')}>Ürünler</button>
            )}
            {(isSysAdmin || allowed.includes('customers')) && (
              <button className={`nav-link ${active === 'customers' ? 'active' : ''}`} onClick={() => onNav('customers')}>Müşteriler</button>
            )}
            {(isSysAdmin || allowed.includes('users')) && (
              <button className={`nav-link ${active === 'users' ? 'active' : ''}`} onClick={() => onNav('users')}>Kullanıcılar</button>
            )}
          </div>
        </div>
        
        <div className="nav-right">
          <div className="nav-profile">
            <div className="profile-info">
              <span className="profile-name">{session?.contact || session?.username}</span>
              <span className="profile-role">{isSysAdmin ? 'Yönetici' : 'Personel'}</span>
            </div>
            <div className="profile-avatar">👤</div>
          </div>
          <button className="nav-logout" onClick={onLogout} title="Çıkış Yap">🚪</button>
        </div>
      </div>
    </nav>
  );
}
