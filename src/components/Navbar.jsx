import React, { useState, useEffect } from 'react';
import './Navbar.css';
import { useData } from '../context/DataContext';

export default function Navbar({ active, onNav, onLogout, session, onSessionUpdate }) {
  const { siteSettings, updateUserState } = useData();
  const isSysAdmin = session?.role === 'admin';
  const allowed = session?.allowedPages || [];
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profil modal state
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState('info'); // 'info' | 'pass'
  const [infoData, setInfoData] = useState({ ad_soyad: session?.contact || '', eposta: session?.eposta || '' });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null); // { ok, text }
  const [passData, setPassData] = useState({ current: '', new1: '', new2: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState(null);
  const [showPass, setShowPass] = useState({ current: false, new1: false, new2: false });

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (showProfile) { setShowProfile(false); return; }
      if (showLogoutConfirm) { setShowLogoutConfirm(false); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showProfile, showLogoutConfirm]);
  // E-posta ile sıfırlama
  const [resetStep, setResetStep] = useState(0); // 0=kapalı/form, 1=kod, 2=yeni şifre
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const openProfile = () => {
    setInfoData({ ad_soyad: session?.contact || '', eposta: session?.eposta || '' });
    setInfoMsg(null); setPassMsg(null); setResetMsg('');
    setPassData({ current: '', new1: '', new2: '' });
    setResetStep(0); setResetEmail(session?.eposta || ''); setResetCode(''); setResetNewPass('');
    setProfileTab('info');
    setShowProfile(true);
  };

  const handleInfoSave = async () => {
    if (!infoData.ad_soyad.trim()) return setInfoMsg({ ok: false, text: 'Ad Soyad boş bırakılamaz.' });
    setInfoLoading(true); setInfoMsg(null);
    try {
      const r = await fetch(`/api/personeller/${session.id}/profil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_soyad: infoData.ad_soyad, eposta: infoData.eposta })
      });
      const json = await r.json();
      if (!r.ok) { setInfoMsg({ ok: false, text: json.error || 'Kayıt başarısız.' }); }
      else {
        setInfoMsg({ ok: true, text: 'Bilgiler güncellendi.' });
        onSessionUpdate && onSessionUpdate(prev => ({ ...prev, contact: infoData.ad_soyad, eposta: infoData.eposta }));
      }
    } catch { setInfoMsg({ ok: false, text: 'Sunucuya bağlanılamadı.' }); }
    setInfoLoading(false);
  };

  const handlePassChange = async () => {
    if (!passData.current) return setPassMsg({ ok: false, text: 'Mevcut şifreyi girin.' });

    if (passData.new1 !== passData.new2) return setPassMsg({ ok: false, text: 'Yeni şifreler eşleşmiyor.' });
    setPassLoading(true); setPassMsg(null);
    try {
      const r = await fetch(`/api/personeller/${session.id}/sifre-degistir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passData.current, newPassword: passData.new1 })
      });
      const json = await r.json();
      if (!r.ok) setPassMsg({ ok: false, text: json.error || 'Şifre değiştirilemedi.' });
      else {
        setPassMsg({ ok: true, text: 'Şifre başarıyla değiştirildi.' });
        setPassData({ current: '', new1: '', new2: '' });
        updateUserState && updateUserState(session.id, { password: passData.new1 });
      }
    } catch { setPassMsg({ ok: false, text: 'Sunucuya bağlanılamadı.' }); }
    setPassLoading(false);
  };

  const handleResetSendCode = async () => {
    if (!resetEmail.trim()) return setResetMsg('E-posta adresi girin.');
    setResetLoading(true); setResetMsg('');
    try {
      const r = await fetch('/api/personeller-reset/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const json = await r.json();
      if (!r.ok) setResetMsg(json.error || 'Kod gönderilemedi.');
      else setResetStep(1);
    } catch { setResetMsg('Sunucuya bağlanılamadı.'); }
    setResetLoading(false);
  };

  const handleResetVerify = async () => {
    if (!resetCode.trim()) return setResetMsg('Kodu girin.');
    setResetLoading(true); setResetMsg('');
    try {
      const r = await fetch('/api/verify-reset-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode })
      });
      const json = await r.json();
      if (!r.ok || !json.valid) setResetMsg(json.error || 'Hatalı kod.');
      else setResetStep(2);
    } catch { setResetMsg('Sunucuya bağlanılamadı.'); }
    setResetLoading(false);
  };

  const handleResetNewPass = async () => {

    setResetLoading(true); setResetMsg('');
    try {
      const r = await fetch('/api/personeller-reset/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPass })
      });
      const json = await r.json();
      if (!r.ok) setResetMsg(json.error || 'Sıfırlama başarısız.');
      else { setResetMsg(''); setPassMsg({ ok: true, text: 'Şifre e-posta ile sıfırlandı. Lütfen tekrar giriş yapın.' }); setResetStep(0); }
    } catch { setResetMsg('Sunucuya bağlanılamadı.'); }
    setResetLoading(false);
  };

  // Ortak stil objeler
  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
  const cardStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' };
  const btnPrimary = { padding: '11px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary, #00b894)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'opacity .15s' };
  const btnSec = { padding: '11px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '14px', cursor: 'pointer' };

  return (
    <>
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-left">
          <div className="nav-logo">
            {siteSettings?.logo
              ? <img src={siteSettings.logo} alt="logo" style={{ height: '28px', width: '28px', objectFit: 'contain', borderRadius: '4px' }} />
              : <span>🍉</span>
            }
            <span className="nav-logo-text">{siteSettings?.site_adi || 'Bostan Manav'}</span>
          </div>
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
            {(isSysAdmin || allowed.includes('settings')) && (
              <button className={`nav-link ${active === 'settings' ? 'active' : ''}`} onClick={() => onNav('settings')}>Ayarlar</button>
            )}
          </div>
        </div>
        
        <div className="nav-right">
          <div className="nav-profile" onClick={openProfile} style={{ cursor: 'pointer' }} title="Profilimi Düzenle">
            <div className="profile-info">
              <span className="profile-name">{session?.contact || session?.username}</span>
              <span className="profile-role">{isSysAdmin ? 'Yönetici' : 'Personel'}</span>
            </div>
            <div className="profile-avatar">👤</div>
          </div>
          <button className="nav-logout" onClick={() => setShowLogoutConfirm(true)} title="Çıkış Yap">🚪</button>
        </div>
      </div>
    </nav>

    {/* PROFİL MODAL */}
    {showProfile && (
      <div style={overlayStyle}>
        <div style={cardStyle} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>👤</span>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Profilim</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>@{session?.username}</div>
              </div>
            </div>
            <button onClick={() => setShowProfile(false)} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>× <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
          </div>

          {/* Tab Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
            {[['info', '📋 Bilgilerim'], ['pass', '🔑 Şifre']].map(([tab, label]) => (
              <button key={tab} onClick={() => { setProfileTab(tab); setInfoMsg(null); setPassMsg(null); setResetStep(0); setResetMsg(''); }}
                style={{ flex: 1, padding: '12px', border: 'none', background: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                  color: profileTab === tab ? 'var(--primary, #00b894)' : '#94a3b8',
                  borderBottom: profileTab === tab ? '2px solid var(--primary, #00b894)' : '2px solid transparent',
                  transition: 'all .15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Bilgilerim */}
          {profileTab === 'info' && (
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>AD SOYAD</label>
                <input style={inputStyle} value={infoData.ad_soyad}
                  onChange={e => setInfoData(p => ({ ...p, ad_soyad: e.target.value }))} placeholder="Ad Soyad" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>KULLANICI ADI <span style={{ color: '#cbd5e1' }}>(değiştirilemez)</span></label>
                <input style={{ ...inputStyle, color: '#94a3b8', cursor: 'not-allowed' }} value={session?.username || ''} readOnly />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>E-POSTA <span style={{ color: '#cbd5e1' }}>(isteğe bağlı)</span></label>
                <input style={inputStyle} type="email" value={infoData.eposta}
                  onChange={e => setInfoData(p => ({ ...p, eposta: e.target.value }))} placeholder="ornek@eposta.com" />
              </div>
              {infoMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  background: infoMsg.ok ? '#f0fdf4' : '#fef2f2', color: infoMsg.ok ? '#15803d' : '#dc2626',
                  border: `1px solid ${infoMsg.ok ? '#86efac' : '#fca5a5'}` }}>
                  {infoMsg.ok ? '✅ ' : '❌ '}{infoMsg.text}
                </div>
              )}
              <button style={{ ...btnPrimary, opacity: infoLoading ? 0.7 : 1 }} onClick={handleInfoSave} disabled={infoLoading}>
                {infoLoading ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          )}

          {/* Tab: Şifre */}
          {profileTab === 'pass' && (
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Mevcut şifre ile değiştir */}
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Mevcut Şifre ile Değiştir</div>
              {[['current', 'MEVCUT ŞİFRE'], ['new1', 'YENİ ŞİFRE'], ['new2', 'YENİ ŞİFRE (TEKRAR)']].map(([field, label]) => (
                <div key={field}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...inputStyle, paddingRight: '40px' }}
                      type={showPass[field] ? 'text' : 'password'}
                      value={passData[field]}
                      onChange={e => setPassData(p => ({ ...p, [field]: e.target.value }))}
                      placeholder="••••••" />
                    <button onClick={() => setShowPass(p => ({ ...p, [field]: !p[field] }))}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}>
                      {showPass[field] ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              ))}
              {passMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  background: passMsg.ok ? '#f0fdf4' : '#fef2f2', color: passMsg.ok ? '#15803d' : '#dc2626',
                  border: `1px solid ${passMsg.ok ? '#86efac' : '#fca5a5'}` }}>
                  {passMsg.ok ? '✅ ' : '❌ '}{passMsg.text}
                </div>
              )}
              <button style={{ ...btnPrimary, opacity: passLoading ? 0.7 : 1 }} onClick={handlePassChange} disabled={passLoading}>
                {passLoading ? '⏳ Değiştiriliyor...' : '🔑 Şifreyi Değiştir'}
              </button>

              {/* E-posta ile sıfırla */}
              {(session?.eposta || infoData.eposta) && (
                <>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>E-posta ile Sıfırla</div>

                  {resetStep === 0 && (
                    <>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>E-POSTA</label>
                        <input style={inputStyle} type="email" value={resetEmail}
                          onChange={e => setResetEmail(e.target.value)} placeholder="e-posta adresiniz" />
                      </div>
                      {resetMsg && <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>❌ {resetMsg}</div>}
                      <button style={{ ...btnSec, opacity: resetLoading ? 0.7 : 1 }} onClick={handleResetSendCode} disabled={resetLoading}>
                        {resetLoading ? '⏳ Gönderiliyor...' : '📧 Kod Gönder'}
                      </button>
                    </>
                  )}

                  {resetStep === 1 && (
                    <>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>📬 <strong>{resetEmail}</strong> adresine kod gönderildi.</div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>DOĞRULAMA KODU</label>
                        <input style={inputStyle} value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="6 haneli kod" maxLength={6} />
                      </div>
                      {resetMsg && <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>❌ {resetMsg}</div>}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ ...btnSec, flex: 1, opacity: resetLoading ? 0.7 : 1 }} onClick={() => { setResetStep(0); setResetMsg(''); }}>Geri</button>
                        <button style={{ ...btnPrimary, flex: 2, opacity: resetLoading ? 0.7 : 1 }} onClick={handleResetVerify} disabled={resetLoading}>
                          {resetLoading ? '⏳...' : 'Kodu Doğrula'}
                        </button>
                      </div>
                    </>
                  )}

                  {resetStep === 2 && (
                    <>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>YENİ ŞİFRE</label>
                        <input style={inputStyle} type="password" value={resetNewPass}
                          onChange={e => setResetNewPass(e.target.value)} placeholder="••••••" minLength={6} />
                      </div>
                      {resetMsg && <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>❌ {resetMsg}</div>}
                      <button style={{ ...btnPrimary, opacity: resetLoading ? 0.7 : 1 }} onClick={handleResetNewPass} disabled={resetLoading}>
                        {resetLoading ? '⏳ Sıfırlanıyor...' : '✅ Şifreyi Sıfırla'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ÇIKIŞ ONAY MODALI */}
    {showLogoutConfirm && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '32px 28px', maxWidth: '360px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚪</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>Çıkış Yap</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: '1.5' }}>Sistemden çıkmak istediğinizden emin misiniz?</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
            <button onClick={onLogout} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Çıkış Yap</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
