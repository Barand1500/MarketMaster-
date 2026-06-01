import { useState } from 'react';
import '../styles/Login.css';

const API_URL = "/api"; // Production: Aynı domain üzerinden

export default function Login({ onLogin }) {
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Cookie göndermek için gerekli
        body: JSON.stringify({ eposta, sifre })
      });

      const data = await res.json();

      if (!res.ok) {
        // Erişim yoksa özel sayfa
        if (data.erisim_yok) {
          window.location.href = '/erisim-yok';
          return;
        }
        throw new Error(data.error || 'Giriş başarısız');
      }

      // Başarılı giriş - cookie zaten set edildi
      onLogin({
        id: data.kullanici.id,
        eposta: data.kullanici.eposta,
        role: 'customer', // Lisans-based auth için varsayılan
        ilk_giris_mi: data.kullanici.ilk_giris_mi
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Bostan Giriş</h1>
          <p>Lisans doğrulamalı giriş sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="eposta">E-posta</label>
            <input
              id="eposta"
              type="email"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              placeholder="ornek@guzelteknoloji.com"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sifre">Şifre</label>
            <div className="password-input">
              <input
                id="sifre"
                type={showPassword ? 'text' : 'password'}
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <div className="login-footer">
            <p>
              🔒 Bu sistem panel lisans doğrulaması kullanır
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
