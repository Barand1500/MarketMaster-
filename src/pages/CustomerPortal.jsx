import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

export default function CustomerPortal({ customer, onLogout }) {
  const { categories, products, updateCustomer } = useData();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [profileData, setProfileData] = useState({
    title: customer.name || '',
    taxId: customer.taxId || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || '',
    currentPass: '',
    confirmCurrentPass: '',
    newPass: ''
  });

  // 20 Saniyede bir sayfayı yeniler
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshed(new Date());
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const discount = customer.discount || 0;

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategories.length > 0 
      ? selectedCategories.some(cid => p.categoryIds.includes(cid)) 
      : true;
    return matchSearch && matchCat;
  });

  const fmtPrice = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  // Eğer kategori seçiliyse sadece o kategoriyi başlık yap, değilse ana kategorileri (roots) göster
  const roots = categories.filter(c => !c.parentId);
  const displayCategories = selectedCategories.length > 0 
    ? categories.filter(c => selectedCategories.includes(c.id)) 
    : roots;

  return (
    <div className="page-container wide">
      {/* COMPACT RESPONSIVE HEADER */}
      <div className="customer-header">
        <div className="header-left">
          <div className="nav-logo" style={{ fontSize: '18px', margin: 0 }}>🍉 Bostan</div>
          <div className="header-divider"></div>
          <div className="customer-name-display">{customer.name}</div>
        </div>

        {/* SEARCH & FILTER AREA */}
        <div className="header-center">
          <div className="search-wrapper">
            <span style={{ fontSize: '14px', opacity: 0.5 }}>🔍</span>
            <input 
              type="text" placeholder="Ürün ara..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="header-search-input"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowCatDrop(!showCatDrop)} className="header-filter-btn">
              📂 {selectedCategories.length > 0 ? `${selectedCategories.length}` : 'Kategoriler'}
            </button>
            {showCatDrop && (
              <>
                <div className="dropdown-overlay" onClick={() => setShowCatDrop(false)} />
                <div className="header-dropdown">
                  <div className="dropdown-scroll">
                    {categories.map(c => (
                      <label key={c.id} className="dropdown-item">
                        <input type="checkbox" checked={selectedCategories.includes(c.id)} onChange={() => setSelectedCategories(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} />
                        {c.name}
                      </label>
                    ))}
                  </div>
                  {selectedCategories.length > 0 && (
                    <button onClick={() => { setSelectedCategories([]); setShowCatDrop(false); }} className="dropdown-clear-btn">Temizle</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="header-right">
          <button onClick={() => setShowProfile(true)} className="profile-btn-header">👤 Profil</button>
          <button onClick={onLogout} className="logout-btn-header">🚪 Çıkış</button>
        </div>
      </div>

      {/* REFRESH & INFO STRIP */}
      <div className="info-strip">
        <div className="info-left">
          {discount > 0 && (
            <div className="discount-badge-premium">
              <span className="badge-icon">✨</span>
              <span className="badge-text">
                Hesabınıza Özel <strong className="discount-value">%{discount}</strong> İndirim Uygulanıyor
              </span>
            </div>
          )}
          {selectedCategories.length > 0 && (
            <div className="selected-cats-list">
              {selectedCategories.slice(0, 2).map(cid => (
                <span key={cid} className="cat-chip-small">
                  {categories.find(c => c.id === cid)?.name}
                </span>
              ))}
              {selectedCategories.length > 2 && <span className="cat-more-count">+{selectedCategories.length - 2}</span>}
            </div>
          )}
        </div>

        <div className="info-right">
          <div className="update-time-box">
            <span className="pulse-dot"></span>
            Son Güncelleme: <strong>{lastRefreshed.toLocaleTimeString('tr-TR')}</strong>
          </div>
          <button onClick={() => setLastRefreshed(new Date())} className="refresh-btn-link">🔄 Yenile</button>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .customer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          background: #fff;
          padding: 12px 20px;
          border-radius: 16px;
          box-shadow: var(--shadow-sm);
          flex-wrap: wrap;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-divider { height: 24px; width: 1px; background: #e2e8f0; }
        .customer-name-display { font-size: 14px; font-weight: 700; color: #1e293b; }
        
        .header-center { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          flex: 1; 
          max-width: 600px; 
        }
        .search-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 0 12px;
        }
        .header-search-input {
          border: none;
          background: transparent;
          padding: 8px;
          font-size: 13px;
          width: 100%;
          outline: none;
        }
        .header-filter-btn {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .profile-btn-header { background: #f1f5f9; color: #475569; border: none; padding: 8px 12px; font-weight: 700; font-size: 12px; border-radius: 10px; cursor: pointer; }
        .logout-btn-header { background: #fee2e2; color: #ef4444; border: none; padding: 8px 12px; font-weight: 700; font-size: 12px; border-radius: 10px; cursor: pointer; }
        
        .header-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 50; width: 220px; padding: 12px; border: 1px solid #e2e8f0; }
        .dropdown-scroll { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .dropdown-item { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #475569; padding: 4px 0; }
        .dropdown-clear-btn { width: 100%; margin-top: 10px; padding: 6px; border: none; background: #fee2e2; color: #ef4444; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .dropdown-overlay { position: fixed; inset: 0; z-index: 40; }

        .info-strip { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 4px; flex-wrap: wrap; gap: 12px; }
        .info-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .discount-badge-premium { display: flex; align-items: center; gap: 8px; background: rgba(0, 184, 148, 0.06); padding: 5px 14px; border-radius: 30px; border: 1px solid rgba(0, 184, 148, 0.2); }
        .badge-icon { font-size: 14px; }
        .badge-text { font-size: 12px; font-weight: 600; color: var(--primary); letter-spacing: -0.1px; }
        .discount-value { background: var(--primary); color: #fff; padding: 1px 6px; border-radius: 6px; font-size: 11px; margin: 0 2px; }
        .selected-cats-list { display: flex; gap: 4px; align-items: center; }
        .cat-chip-small { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; }
        .cat-more-count { font-size: 11px; color: #94a3b8; }
        
        .info-right { display: flex; align-items: center; gap: 12px; }
        .update-time-box { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 8px; background: #fff; padding: 4px 10px; border-radius: 20px; border: 1px solid #f1f5f9; }
        .pulse-dot { 
          width: 8px; height: 8px; 
          background: var(--primary); 
          border-radius: 50%; 
          display: inline-block;
          box-shadow: 0 0 0 0 rgba(0, 184, 148, 0.4);
          animation: status-pulse 2s infinite;
        }
        @keyframes status-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 184, 148, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(0, 184, 148, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 184, 148, 0); }
        }
        .refresh-btn-link { background: transparent; border: none; color: var(--primary); font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }

        @media (max-width: 768px) {
          .customer-header {
            padding: 10px 15px;
            gap: 8px;
          }
          .header-center {
            order: 3;
            max-width: none;
            width: 100%;
          }
          .header-left {
            flex: 1;
          }
          .customer-name-display {
            font-size: 12px;
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .header-divider { display: none; }
          .nav-logo { font-size: 16px !important; }

          .info-strip {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .info-left, .info-right {
            width: 100%;
            justify-content: space-between;
          }
          .discount-badge-premium {
            padding: 4px 10px;
          }
          .badge-text { font-size: 11px; }
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .product-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          border: 1px solid #f1f5f9;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .product-image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .product-card:hover .product-image {
          transform: scale(1.05);
        }
      `}</style>

      {displayCategories.map(cat => {
        const catProducts = filteredProducts.filter(p => p.categoryIds.includes(cat.id));
        if (catProducts.length === 0) return null;

        return (
          <div key={cat.id} className="customer-category-section" style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <span style={{ width: '5px', height: '24px', background: 'var(--primary)', borderRadius: '3px' }}></span>
              {cat.name}
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', background: '#f1f5f9', padding: '4px 10px', borderRadius: '10px', marginLeft: 'auto' }}>{catProducts.length} Ürün</span>
            </h2>
            
            <div className="product-grid">
              {catProducts.map(p => {
                const discountedPrice = p.price * (1 - discount / 100);
                const lastUpdate = p.priceHistory && p.priceHistory.length > 0 
                  ? new Date(p.priceHistory[p.priceHistory.length - 1].date).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })
                  : 'Yeni';

                return (
                  <div key={p.id} className="product-card" style={{ opacity: p.inStock === false ? 0.6 : 1, filter: p.inStock === false ? 'grayscale(0.3)' : 'none' }}>
                    <div className="product-image-container">
                      {discount > 0 && p.inStock !== false && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--danger)', color: '#fff', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', zIndex: 2, boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }}>
                          %{discount}
                        </div>
                      )}
                      {p.inStock === false && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                          <span style={{ background: 'var(--danger)', color: '#fff', padding: '6px 16px', borderRadius: '8px', fontWeight: '900', fontSize: '13px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>STOKTA YOK</span>
                        </div>
                      )}
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="product-image" />
                      ) : (
                        <span style={{ fontSize: '60px' }}>🍎</span>
                      )}
                    </div>
                    
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a', lineHeight: '1.2' }}>{p.name}</strong>
                        <span className="badge-unit" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: '600', fontSize: '11px', padding: '2px 6px' }}>{p.unit || 'Kg'}</span>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '8px', textAlign: 'right' }}>
                        {discount > 0 ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>{fmtPrice(p.price)}</span>
                              <span style={{ fontSize: '9px', color: 'var(--danger)', fontWeight: '800', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '6px' }}>SANA ÖZEL</span>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.5px' }}>{fmtPrice(discountedPrice)}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>{fmtPrice(p.price)}</div>
                        )}
                      </div>

                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <span style={{ opacity: 0.7 }}>🕒</span> Son Fiyat Güncelleme: {lastUpdate}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* PROFILE MODAL */}
      {/* PREMIUM PROFILE MODAL */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="premium-confirm" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '550px', width: '100%', padding: '0', borderRadius: '24px', 
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: 'none'
          }}>
            {/* MODAL HEADER */}
            <div style={{ 
              padding: '32px 32px 24px', 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              borderBottom: '1px solid #e2e8f0',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ 
                  width: '56px', height: '56px', 
                  background: 'linear-gradient(135deg, var(--primary) 0%, #00d2ab 100%)', 
                  borderRadius: '16px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: '#fff', fontSize: '24px',
                  boxShadow: '0 8px 16px rgba(0, 184, 148, 0.2)'
                }}>👤</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>Profil & Fatura</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Kişisel bilgilerinizi ve fatura detaylarını yönetin</p>
                </div>
              </div>
              <button onClick={() => setShowProfile(false)} style={{ 
                position: 'absolute', top: '24px', right: '24px', 
                background: '#fff', border: '1px solid #e2e8f0', width: '32px', height: '32px',
                borderRadius: '50%', fontSize: '14px', cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}>✕</button>
            </div>
            
            <div className="confirm-body" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="field-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>🏢</span> Ticari Ünvan / Ad Soyad
                </label>
                <input type="text" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.title} onChange={e => setProfileData({...profileData, title: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="field-group">
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>🆔</span> TC / VKN
                  </label>
                  <input type="text" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.taxId} onChange={e => setProfileData({...profileData, taxId: e.target.value})} />
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>📞</span> Telefon No
                  </label>
                  <input type="text" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                </div>
              </div>

              <div className="field-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>📧</span> E-posta Adresi
                </label>
                <input type="email" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
              </div>

              <div className="field-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>📍</span> Kayıtlı Fatura Adresi
                </label>
                <textarea 
                  className="lite-input" 
                  style={{ minHeight: '100px', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0', resize: 'none', lineHeight: '1.6' }} 
                  value={profileData.address} 
                  onChange={e => setProfileData({...profileData, address: e.target.value})}
                  placeholder="Detaylı adresinizi buraya yazın..."
                ></textarea>
              </div>

              {/* PASSWORD CHANGE SECTION */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px' }}>
                <button 
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showPasswordSection ? '✕ Şifre Değişikliğini Kapat' : '🔐 Şifremi Değiştirmek İstiyorum'}
                </button>

                {showPasswordSection && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="field-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block' }}>Mevcut Şifre</label>
                        <input type="password" placeholder="••••••" className="lite-input" style={{ padding: '8px 12px', fontSize: '13px' }} value={profileData.currentPass} onChange={e => setProfileData({...profileData, currentPass: e.target.value})} />
                      </div>
                      <div className="field-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block' }}>Mevcut Şifre (Tekrar)</label>
                        <input type="password" placeholder="••••••" className="lite-input" style={{ padding: '8px 12px', fontSize: '13px' }} value={profileData.confirmCurrentPass} onChange={e => setProfileData({...profileData, confirmCurrentPass: e.target.value})} />
                      </div>
                    </div>

                    {/* VALIDATION ERROR */}
                    {(profileData.currentPass || profileData.confirmCurrentPass) && (profileData.currentPass !== customer.password || profileData.confirmCurrentPass !== customer.password) && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>⚠️ Mevcut şifreniz uyuşmuyor veya hatalı!</p>
                    )}

                    <div className="field-group">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', opacity: (profileData.currentPass === customer.password && profileData.confirmCurrentPass === customer.password) ? 1 : 0.5 }}>Yeni Şifre</label>
                      <input 
                        type="password" 
                        placeholder="Yeni şifrenizi girin" 
                        className="lite-input" 
                        style={{ padding: '8px 12px', fontSize: '13px' }} 
                        value={profileData.newPass} 
                        onChange={e => setProfileData({...profileData, newPass: e.target.value})}
                        disabled={profileData.currentPass !== customer.password || profileData.confirmCurrentPass !== customer.password}
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        if (profileData.newPass.length < 3) {
                          alert('Yeni şifre en az 3 karakter olmalıdır!');
                          return;
                        }
                        if (window.confirm('Şifrenizi güncellemek istediğinizden emin misiniz?')) {
                          updateCustomer(customer.id, { ...customer, password: profileData.newPass });
                          alert('Şifreniz başarıyla güncellendi!');
                          setProfileData({...profileData, currentPass: '', confirmCurrentPass: '', newPass: ''});
                          setShowPasswordSection(false);
                        }
                      }}
                      disabled={profileData.currentPass !== customer.password || profileData.confirmCurrentPass !== customer.password || !profileData.newPass}
                      style={{ 
                        background: 'var(--primary)', color: '#fff', border: 'none', 
                        padding: '10px', borderRadius: '10px', fontWeight: '800', fontSize: '12px',
                        cursor: 'pointer', opacity: (profileData.currentPass === customer.password && profileData.confirmCurrentPass === customer.password && profileData.newPass) ? 1 : 0.5
                      }}
                    >
                      ŞİFREYİ GÜNCELLE ✅
                    </button>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                        Mevcut şifrenizi hatırlamıyor musunuz? <br/>
                        <button type="button" onClick={() => alert('Şifre sıfırlama talebiniz e-posta adresinize gönderilecektir (Yakında).')} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}>Buraya tıklayarak sıfırlama linki isteyebilirsiniz.</button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="confirm-footer" style={{ 
              padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', 
              display: 'flex', justifyContent: 'flex-end', gap: '12px' 
            }}>
              <button onClick={() => {
                setShowProfile(false);
                setShowPasswordSection(false);
              }} style={{ 
                background: 'transparent', color: '#64748b', border: 'none', 
                padding: '12px 20px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' 
              }}>Vazgeç</button>
              <button onClick={() => {
                const updates = {
                  name: profileData.title,
                  taxId: profileData.taxId,
                  email: profileData.email,
                  phone: profileData.phone,
                  address: profileData.address
                };
                updateCustomer(customer.id, updates);
                alert('Profil bilgileriniz başarıyla güncellendi!');
                setShowProfile(false);
              }} style={{ 
                background: 'var(--primary)', color: '#fff', border: 'none', 
                padding: '12px 28px', fontWeight: '800', fontSize: '14px', 
                borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 184, 148, 0.2)'
              }}>Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
