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
  const [forgotStep, setForgotStep] = useState('email'); // 'email', 'verify', 'newpass'
  const [resetData, setResetData] = useState({ code: '', newPass: '', confirmNewPass: '' });
  const [showPass, setShowPass] = useState({ reset: false, resetConfirm: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: user, password: pass })
      });

      if (!res.ok) {
        throw new Error('Bilgileriniz hatali. Lütfen kontrol edip tekrar deneyin.');
      }

      const data = await res.json();
      
      // Backend'den gelen veriyi frontend formatina maple
      const mappedUser = {
        id: data.user.id,
        username: data.user.kullanici_adi || data.user.ad_soyad,
        contact: data.user.ad_soyad,
        role: data.role,
        allowedPages: data.role === 'staff' ? (data.user.yetkiler || []) : [],
        ...data.user,
        name: data.user.ad_soyad,
        taxId: data.user.vkn_tc,
        phone: data.user.telefon,
        email: data.user.eposta,
        discount: parseFloat(data.user.iskonto_orani || 0)
      };
      // Hashlenmiş şifreyi session'da saklama
      delete mappedUser.sifre;

      onLogin(mappedUser);
    } catch (err) {
      setError(err.message);
    }
  };

  const API_URL = "http://127.0.0.1:5000/api";

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (forgotStep === 'email') {
      try {
        const res = await fetch(`${API_URL}/send-reset-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail })
        });
        const data = await res.json();
        if (res.ok) {
          setForgotMsg(data.message);
          setForgotStep('verify');
        } else {
          setForgotError(data.error);
        }
      } catch { setForgotError('Bağlantı hatası.'); }
    } else if (forgotStep === 'verify') {
      if (resetData.code.length !== 6) return setForgotError('Lütfen 6 haneli kodu girin.');
      try {
        const res = await fetch(`${API_URL}/verify-reset-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, code: resetData.code })
        });
        if (res.ok) {
          setForgotStep('newpass');
        } else {
          const data = await res.json();
          setForgotError(data.error || 'Kod geçersiz.');
        }
      } catch { setForgotError('Bağlantı hatası.'); }
    } else if (forgotStep === 'newpass') {
      if (resetData.newPass.length < 3) return setForgotError('Şifre en az 3 karakter olmalıdır.');
      if (resetData.newPass !== resetData.confirmNewPass) return setForgotError('Şifreler uyuşmuyor.');
      try {
        const res = await fetch(`${API_URL}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, code: resetData.code, newPassword: resetData.newPass })
        });
        if (res.ok) {
          setForgotMsg('Şifreniz başarıyla güncellendi! Giriş yapabilirsiniz.');
          setTimeout(() => {
            setForgot(false);
            setForgotStep('email');
            setForgotEmail('');
            setResetData({ code: '', newPass: '', confirmNewPass: '' });
          }, 3000);
        } else {
          setForgotError('Bir hata oluştu.');
        }
      } catch { setForgotError('Bağlantı hatası.'); }
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🍉</div>
        <h1 className="login-title">Bostan Manav</h1>
        <p className="login-sub">Yönetim ekranına veya müşteri paneline giriş yapın</p>

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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '10px 12px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px', lineHeight: 1 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: '12px', color: '#92400e', fontWeight: '600', lineHeight: '1.5' }}>
                Kullanıcı adı ve şifre <strong>büyük/küçük harf duyarlıdır.</strong><br/>
                Örneğin: <em>"Nimet Demir"</em> ile <em>"nimet demir"</em> farklıdır.
              </p>
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn">Giriş Yap</button>
            <button type="button" className="forgot-link" onClick={() => setForgot(true)}>
              Şifremi Unuttum
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="login-form">
            <p className="forgot-info">
              {forgotStep === 'email' && 'Şifrenizi sıfırlamak için sisteme kayıtlı olan e-posta adresinizi giriniz.'}
              {forgotStep === 'verify' && `${forgotEmail} adresine gönderilen 6 haneli kodu giriniz.`}
              {forgotStep === 'newpass' && 'Lütfen yeni şifrenizi belirleyiniz.'}
            </p>

            {forgotStep === 'email' && (
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
            )}

            {forgotStep === 'verify' && (
              <div className="field">
                <label>Doğrulama Kodu</label>
                <input 
                  type="text" 
                  placeholder="000000" 
                  maxLength="6"
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
                  value={resetData.code}
                  onChange={e => { setResetData({ ...resetData, code: e.target.value }); setForgotError(''); }}
                  autoFocus 
                  required
                />
              </div>
            )}

            {forgotStep === 'newpass' && (
              <>
                <div className="field">
                  <label>Yeni Şifre</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPass.reset ? 'text' : 'password'}
                      placeholder="Yeni şifre" 
                      value={resetData.newPass}
                      onChange={e => { setResetData({ ...resetData, newPass: e.target.value }); setForgotError(''); }}
                      autoFocus 
                      required
                    />
                    <button type="button" onClick={() => setShowPass(p => ({ ...p, reset: !p.reset }))} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                      {showPass.reset ? '🐵' : '🙈'}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Yeni Şifre (Tekrar)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPass.resetConfirm ? 'text' : 'password'}
                      placeholder="Yeni şifre tekrar" 
                      value={resetData.confirmNewPass}
                      onChange={e => { setResetData({ ...resetData, confirmNewPass: e.target.value }); setForgotError(''); }}
                      required
                    />
                    <button type="button" onClick={() => setShowPass(p => ({ ...p, resetConfirm: !p.resetConfirm }))} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                      {showPass.resetConfirm ? '🐵' : '🙈'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {forgotError && <p className="login-error" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>⚠️ {forgotError}</p>}
            {forgotMsg && <p className="login-success" style={{ color: 'var(--primary)', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>✅ {forgotMsg}</p>}
            
            <button type="submit" className="login-btn" style={{ marginTop: '16px' }}>
              {forgotStep === 'email' ? 'Kod Gönder' : (forgotStep === 'verify' ? 'Kodu Doğrula' : 'Şifreyi Güncelle')}
            </button>
            <button type="button" className="forgot-link" onClick={() => { setForgot(false); setForgotStep('email'); setForgotError(''); setForgotMsg(''); }}>
              ← Giriş Ekranına Dön
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
