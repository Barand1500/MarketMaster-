import { useState } from 'react';
import { useData } from '../context/DataContext';
import '../styles/Login.css';

export default function Login({ onLogin }) {
  const { users, customers } = useData();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // 1. Check Staff/Admins (Strict Username Check)
    const isErcan = user === 'ercan' && pass === '123';
    // Personel sadece Kullanıcı Adı (username) ile girebilir
    const foundStaff = users.find(u => u.username === user && u.password === pass);

    if (isErcan) {
      onLogin({ id: 'admin', username: 'ercan', contact: 'Yönetici Ercan', role: 'staff', allowedPages: ['products', 'customers', 'users'] });
      return;
    }
    
    if (foundStaff) {
      onLogin({ ...foundStaff, role: 'staff' });
      return;
    }

    // 2. Check Customers (Flexible Search: Name, Tax ID, Email, or Phone)
    const foundCust = customers.find(c => 
      (c.name === user || c.taxId === user || c.email === user || c.phone === user) && 
      c.password === pass
    );

    if (foundCust) {
      onLogin({ ...foundCust, role: 'customer' });
      return;
    }

    setError('Bilgileriniz hatalı. Lütfen kontrol edip tekrar deneyin.');
  };

  const handleForgot = (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    // Check if exists
    const existsInUsers = users.some(u => u.username === forgotEmail || (u.contact && u.contact.includes('@') && u.contact === forgotEmail));
    const existsInCustomers = customers.some(c => c.email === forgotEmail);

    if (!existsInUsers && !existsInCustomers) {
      setForgotError('Bu e-posta adresi sistemde kayıtlı görünmüyor.');
      return;
    }

    setForgotMsg('Şifre sıfırlama bağlantısı e-posta adresinize başarıyla gönderildi!');
    setTimeout(() => { 
      setForgot(false); 
      setForgotMsg(''); 
      setForgotEmail('');
    }, 3000);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🥦</div>
        <h1 className="login-title">Manav Paneli</h1>
        <p className="login-sub">Yönetim ekranına giriş yapın</p>

        {!forgot ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label>Kullanıcı Adı</label>
              <input
                type="text"
                placeholder="Kullanıcı adı, telefon veya e-posta"
                value={user}
                onChange={e => { setUser(e.target.value); setError(''); }}
                autoFocus
              />
            </div>
            <div className="field">
              <label>Şifre</label>
              <input
                type="password"
                placeholder="••••••"
                value={pass}
                onChange={e => { setPass(e.target.value); setError(''); }}
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn">Giriş Yap</button>
            <button type="button" className="forgot-link" onClick={() => setForgot(true)}>
              Şifremi Unuttum
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="login-form">
            <p className="forgot-info">Şifrenizi sıfırlamak için sisteme kayıtlı olan e-posta adresinizi giriniz.</p>
            <div className="field">
              <label>E-posta Adresi</label>
              <input 
                type="email" 
                placeholder="ornek@mail.com" 
                value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                autoFocus 
                required
              />
            </div>
            {forgotError && <p className="login-error" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>⚠️ {forgotError}</p>}
            {forgotMsg && <p className="login-success" style={{ color: 'var(--primary)', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>✅ {forgotMsg}</p>}
            <button type="submit" className="login-btn" style={{ marginTop: '16px' }}>Sıfırlama Bağlantısı Gönder</button>
            <button type="button" className="forgot-link" onClick={() => { setForgot(false); setForgotError(''); setForgotMsg(''); }}>
              ← Giriş Ekranına Dön
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
