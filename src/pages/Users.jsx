import { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

const AVAILABLE_PAGES = [
  { id: 'products', label: '🍎 Ürün ve Stok' },
  { id: 'customers', label: '👥 Müşteriler' },
  { id: 'users', label: '🛡️ Personel Yönetimi' }
];

export default function Users() {
  const { users, addUser, updateUser, deleteUser } = useData();

  const [newRow, setNewRow] = useState({ contact: '', username: '', password: '', allowedPages: ['products'] });
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  // MOBİL state
  const [mobileEdit, setMobileEdit] = useState(null);
  const [showMobileAdd, setShowMobileAdd] = useState(false);
  const [mobileAddData, setMobileAddData] = useState({ contact: '', username: '', password: '', allowedPages: ['products'] });
  const [mobileAddError, setMobileAddError] = useState('');
  const [mobileEditError, setMobileEditError] = useState('');
  const [mobileEditPass, setMobileEditPass] = useState(false);
  const [mobileAddPass, setMobileAddPass] = useState(false);

  const togglePassword = (id, e) => {
    e.stopPropagation();
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = () => {
    setErrorMsg('');
    if (!newRow.contact.trim() || !newRow.username.trim() || !newRow.password) {
      setErrorMsg("Ad Soyad, Kullanıcı Adı ve Şifre zorunludur!");
      return;
    }
    if (users.some(u => u.username.toLowerCase() === newRow.username.toLowerCase())) {
      setErrorMsg(`Bu kullanıcı adı (${newRow.username}) zaten kullanılıyor!`);
      return;
    }
    addUser(newRow);
    setNewRow({ contact: '', username: '', password: '', allowedPages: ['products'] });
  };

  const handleBlur = (id, field, value) => {
    // Uniqueness check for editing username
    if (field === 'username' && value) {
      const otherUsers = users.filter(u => u.id !== id);
      if (otherUsers.some(u => u.username.toLowerCase() === value.toLowerCase())) {
        alert(`HATA: '${value}' kullanıcı adı zaten başka bir personelde kayıtlı! Değişiklik geri alındı.`);
        setEditing(null);
        return;
      }
    }

    updateUser(id, { [field]: value });
    setEditing(null);
  };

  const togglePageRole = (userId, pageId, currentPages) => {
    if (userId === 1 || userId === '1' || userId === 'admin') return; // Admin rolleri değiştirilemez
    let newPages = [...(currentPages || [])];
    if (newPages.includes(pageId)) {
      newPages = newPages.filter(p => p !== pageId);
    } else {
      newPages.push(pageId);
    }
    updateUser(userId, { allowedPages: newPages });
  };

  const toggleNewRowPage = (pageId) => {
    setNewRow(prev => {
      let newPages = [...prev.allowedPages];
      if (newPages.includes(pageId)) newPages = newPages.filter(p => p !== pageId);
      else newPages.push(pageId);
      return { ...prev, allowedPages: newPages };
    });
  };

  return (
    <div className="page-container wide">
      <PageHeader 
        title="🛡️ Personel Yönetimi" 
        sub="Sisteme girebilecek personelleri ve erişebilecekleri sayfaları belirleyin."
        helpContent={
          <div>
            <p>Sisteme giriş yapabilecek çalışanlarınızı veya ortaklarınızı buradan ekleyebilirsiniz.</p>
            <ul>
              <li><strong>👤 Ad Soyad:</strong> Personelin gerçek adı (bilgi amaçlı).</li>
              <li><strong>🔤 Kullanıcı Adı:</strong> Sisteme girişte kullanacağı benzersiz ad. (Örn: ali123)</li>
              <li><strong>🔑 Şifre:</strong> Sisteme girişte kullanacağı şifre.</li>
              <li><strong>🔒 Erişim İzinleri:</strong> Hangi sayfalara girebileceğini kutucuklarla seçersiniz. Örn. sadece "Ürün ve Stok" seçilirse Müşteriler sayfasını göremez.</li>
            </ul>
            <div className="help-tip" style={{ borderLeftColor: '#e53e3e', background: '#fff5f5', color: '#742a2a' }}>
              <strong>⚠️ Önemli:</strong> "admin" hesabı silinemez ve kısıtlanamaz — yönetici her zaman tüm sayfalara erişir.
            </div>
          </div>
        }
        helpContentMobile={
          <div>
            <p style={{ marginBottom: '10px' }}>Sisteme giriş yapacak personelleri buradan yönetirsiniz.</p>
            <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li><strong>🧑‍💼 Kart:</strong> Her personel bir kart olarak görünür. Ad, kullanıcı adı ve yetkili sayfalar kartın üzerinde yazar.</li>
              <li><strong>✏️ Düzenle:</strong> Kart üzerindeki kalem ikonuna basarak personelin bilgilerini ve sayfa erişimlerini güncelleyin.</li>
              <li><strong>🗑 Sil:</strong> Çöp kutusu ikonuna basarak personeli kaldırın.</li>
              <li><strong>＋ Ekle:</strong> Sağ alttaki yeşil yuvarlak butona basarak yeni personel ekleyin.</li>
            </ul>
            <div className="help-tip" style={{ borderLeftColor: '#e53e3e', background: '#fff5f5', color: '#742a2a', marginTop: '10px' }}>
              <strong>⚠️ Not:</strong> 👑 Admin hesabı düzenlenemez ve silinemez.
            </div>
          </div>
        }
      />

      <div className="card excel-card">
        <div className="table-header-toolbar">
          <h2 className="toolbar-title">Sistem Kullanıcıları <span className="count-badge">{users.length} Kişi</span></h2>
          <div className="premium-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Personel ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap overflow-visible">
          <table className="excel-table">
            <thead>
              <tr className="th-row">
                <th style={{ width: '180px' }}>Ad Soyad</th>
                <th style={{ width: '150px' }}>Kullanıcı Adı</th>
                <th style={{ width: '140px' }}>Şifre</th>
                <th>Sayfa Erişim Yetkileri (Roller)</th>
                <th style={{ width: '80px', textAlign: 'center' }}>İşlem</th>
              </tr>
              {/* EXCEL ADD ROW */}
              <tr className="add-row">
                <td><input className="lite-input" type="text" placeholder="Örn: Ali Yılmaz" value={newRow.contact} onChange={e => setNewRow({...newRow, contact: e.target.value})} /></td>
                <td><input className="lite-input" type="text" placeholder="Kullanıcı adı" value={newRow.username} onChange={e => setNewRow({...newRow, username: e.target.value})} /></td>
                <td><input className="lite-input" type="password" placeholder="••••••" value={newRow.password} onChange={e => setNewRow({...newRow, password: e.target.value})} /></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {AVAILABLE_PAGES.map(page => (
                      <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <input type="checkbox" checked={newRow.allowedPages.includes(page.id)} onChange={() => toggleNewRowPage(page.id)} />
                        {page.label}
                      </label>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center', position: 'relative' }}>
                  <button className="lite-add-btn" onClick={handleAdd}>EKLE</button>
                  {errorMsg && <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    background: '#fee2e2', 
                    color: '#ef4444', 
                    fontSize: '11px', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    marginTop: '8px', 
                    fontWeight: '700', 
                    zIndex: 100, 
                    border: '1px solid #fca5a5', 
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>⚠️</span> {errorMsg}
                  </div>}
                </td>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.contact?.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())).map(u => {
                const isSysAdmin = u.id === 1 || u.id === '1' || u.id === 'admin' || u.username === 'baran';
                const userPages = u.allowedPages || [];
                
                return (
                  <tr key={u.id} className={editing?.id === u.id ? 'editing-row' : ''} style={{ background: isSysAdmin ? '#f8fafc' : 'transparent' }}>
                    <td onDoubleClick={() => !isSysAdmin && setEditing({ id: u.id, field: 'contact' })}>
                      {editing?.id === u.id && editing?.field === 'contact' ? (
                        <input autoFocus className="lite-input" defaultValue={u.contact} onBlur={(e) => handleBlur(u.id, 'contact', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <span className="edit-txt">
                          {isSysAdmin && <span title="Sistem Yöneticisi" style={{ marginRight: '6px' }}>👑</span>}
                          {u.contact}
                        </span>
                      )}
                    </td>
                    
                    <td onDoubleClick={() => !isSysAdmin && setEditing({ id: u.id, field: 'username' })}>
                      {editing?.id === u.id && editing?.field === 'username' ? (
                        <input autoFocus className="lite-input" defaultValue={u.username} onBlur={(e) => handleBlur(u.id, 'username', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <span className="edit-txt" style={{ fontWeight: '600', color: '#3b82f6' }}>{u.username}</span>
                      )}
                    </td>

                    <td onDoubleClick={() => setEditing({ id: u.id, field: 'password' })}>
                      {editing?.id === u.id && editing?.field === 'password' ? (
                        <input autoFocus className="lite-input" defaultValue={u.password} onBlur={(e) => handleBlur(u.id, 'password', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className="edit-txt">{showPasswords[u.id] ? u.password : '••••••'}</span>
                          <button 
                            onClick={(e) => togglePassword(u.id, e)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '14px', padding: '2px 6px', transition: 'opacity 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.opacity = 1}
                            onMouseOut={e => e.currentTarget.style.opacity = 0.6}
                            title={showPasswords[u.id] ? "Şifreyi Gizle" : "Şifreyi Göster"}
                          >
                            {showPasswords[u.id] ? '🙈' : '👁️'}
                          </button>
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {isSysAdmin ? (
                          <span style={{ fontSize: '11px', background: '#3b82f6', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>🛡️ SİSTEM ADMİNİ</span>
                        ) : (
                          AVAILABLE_PAGES.map(page => (
                            <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', background: userPages.includes(page.id) ? 'rgba(0, 184, 148, 0.1)' : '#f1f5f9', color: userPages.includes(page.id) ? 'var(--primary)' : '#64748b', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${userPages.includes(page.id) ? 'var(--primary)' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                              <input 
                                type="checkbox" 
                                checked={userPages.includes(page.id)} 
                                onChange={() => togglePageRole(u.id, page.id, userPages)} 
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              {page.label}
                            </label>
                          ))
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {!isSysAdmin ? (
                        <button className="del-btn-icon" onClick={() => setConfirm(u.id)}>🗑</button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== MOBİL PERSONEL LİSTESİ ===================== */}
      <div className="mobile-product-list">
        <div className="mobile-search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Personel ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {users.filter(u => u.contact?.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())).map(u => {
          const isSysAdmin = u.id === 1 || u.id === '1' || u.id === 'admin' || u.username === 'baran';
          const userPages = u.allowedPages || [];
          return (
            <div key={u.id} className="mobile-product-card" style={{ background: isSysAdmin ? '#f0f7ff' : '#fff' }}>
              <div className="mobile-card-img" style={{ background: isSysAdmin ? '#dbeafe' : '#f0fdf4', fontSize: '20px' }}>
                {isSysAdmin ? '👑' : '🧑‍💼'}
              </div>
              <div className="mobile-card-info">
                <div className="mobile-card-name">{u.contact || u.username}</div>
                <div className="mobile-card-meta">
                  <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>@{u.username}</span>
                </div>
                <div className="mobile-user-pages">
                  {isSysAdmin
                    ? <span className="mobile-page-badge admin">🛡️ Sistem Admini</span>
                    : AVAILABLE_PAGES.filter(p => userPages.includes(p.id)).map(p => (
                        <span key={p.id} className="mobile-page-badge">{p.label}</span>
                      ))
                  }
                </div>
              </div>
              <div className="mobile-card-actions">
                {!isSysAdmin && (
                  <>
                    <button className="mobile-edit-btn" onClick={() => {
                      setMobileEdit({ id: u.id, contact: u.contact || '', username: u.username, password: u.password || '', allowedPages: [...(u.allowedPages || [])] });
                      setMobileEditError('');
                      setMobileEditPass(false);
                    }}>✏️</button>
                    <button className="mobile-del-btn" onClick={() => setConfirm(u.id)}>🗑</button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <button className="mobile-fab" onClick={() => { setMobileAddData({ contact: '', username: '', password: '', allowedPages: ['products'] }); setMobileAddError(''); setMobileAddPass(false); setShowMobileAdd(true); }}>＋</button>
      </div>

      {/* ===================== MOBİL DÜZENLEME MODALI ===================== */}
      {mobileEdit && (
        <div className="modal-overlay" onClick={() => setMobileEdit(null)}>
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Personeli Düzenle</span>
              <button onClick={() => setMobileEdit(null)}>✕</button>
            </div>
            <div className="mobile-modal-body">
              <label className="mobile-label">Ad Soyad</label>
              <input className="mobile-input" value={mobileEdit.contact} onChange={e => setMobileEdit(p => ({ ...p, contact: e.target.value }))} placeholder="Ali Yılmaz" />

              <label className="mobile-label">Kullanıcı Adı</label>
              <input className="mobile-input" value={mobileEdit.username} onChange={e => setMobileEdit(p => ({ ...p, username: e.target.value }))} placeholder="aliyilmaz" />

              <label className="mobile-label">Şifre</label>
              <div style={{ position: 'relative' }}>
                <input className="mobile-input" type={mobileEditPass ? 'text' : 'password'} value={mobileEdit.password} onChange={e => setMobileEdit(p => ({ ...p, password: e.target.value }))} placeholder="••••••" style={{ paddingRight: '44px' }} />
                <button onClick={() => setMobileEditPass(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>{mobileEditPass ? '🙈' : '👁️'}</button>
              </div>

              <label className="mobile-label">Sayfa Erişim Yetkileri</label>
              <div className="mobile-perm-list">
                {AVAILABLE_PAGES.map(page => {
                  const checked = mobileEdit.allowedPages.includes(page.id);
                  return (
                    <label key={page.id} className={`mobile-perm-row ${checked ? 'active' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => setMobileEdit(p => ({
                        ...p,
                        allowedPages: p.allowedPages.includes(page.id)
                          ? p.allowedPages.filter(x => x !== page.id)
                          : [...p.allowedPages, page.id]
                      }))} />
                      <span>{page.label}</span>
                    </label>
                  );
                })}
              </div>

              {mobileEditError && <div style={{ marginTop: '8px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', color: '#742a2a', fontSize: '13px' }}>⚠️ {mobileEditError}</div>}
            </div>
            <div className="mobile-modal-footer">
              <button className="mobile-btn-cancel" onClick={() => setMobileEdit(null)}>Vazgeç</button>
              <button className="mobile-btn-save" onClick={() => {
                if (!mobileEdit.contact.trim() || !mobileEdit.username.trim() || !mobileEdit.password.trim()) {
                  setMobileEditError('Tüm alanlar zorunludur!'); return;
                }
                const others = users.filter(u => u.id !== mobileEdit.id);
                if (others.some(u => u.username.toLowerCase() === mobileEdit.username.toLowerCase())) {
                  setMobileEditError('Bu kullanıcı adı zaten kullanılıyor!'); return;
                }
                updateUser(mobileEdit.id, { contact: mobileEdit.contact, username: mobileEdit.username, password: mobileEdit.password, allowedPages: mobileEdit.allowedPages });
                setMobileEdit(null);
              }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MOBİL YENİ PERSONEL MODALI ===================== */}
      {showMobileAdd && (
        <div className="modal-overlay" onClick={() => setShowMobileAdd(false)}>
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Yeni Personel Ekle</span>
              <button onClick={() => setShowMobileAdd(false)}>✕</button>
            </div>
            <div className="mobile-modal-body">
              <label className="mobile-label">Ad Soyad *</label>
              <input className="mobile-input" value={mobileAddData.contact} onChange={e => setMobileAddData(p => ({ ...p, contact: e.target.value }))} placeholder="Ali Yılmaz" />

              <label className="mobile-label">Kullanıcı Adı *</label>
              <input className="mobile-input" value={mobileAddData.username} onChange={e => setMobileAddData(p => ({ ...p, username: e.target.value }))} placeholder="aliyilmaz" />

              <label className="mobile-label">Şifre *</label>
              <div style={{ position: 'relative' }}>
                <input className="mobile-input" type={mobileAddPass ? 'text' : 'password'} value={mobileAddData.password} onChange={e => setMobileAddData(p => ({ ...p, password: e.target.value }))} placeholder="••••••" style={{ paddingRight: '44px' }} />
                <button onClick={() => setMobileAddPass(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>{mobileAddPass ? '🙈' : '👁️'}</button>
              </div>

              <label className="mobile-label">Sayfa Erişim Yetkileri</label>
              <div className="mobile-perm-list">
                {AVAILABLE_PAGES.map(page => {
                  const checked = mobileAddData.allowedPages.includes(page.id);
                  return (
                    <label key={page.id} className={`mobile-perm-row ${checked ? 'active' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => setMobileAddData(p => ({
                        ...p,
                        allowedPages: p.allowedPages.includes(page.id)
                          ? p.allowedPages.filter(x => x !== page.id)
                          : [...p.allowedPages, page.id]
                      }))} />
                      <span>{page.label}</span>
                    </label>
                  );
                })}
              </div>

              {mobileAddError && <div style={{ marginTop: '8px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', color: '#742a2a', fontSize: '13px' }}>⚠️ {mobileAddError}</div>}
            </div>
            <div className="mobile-modal-footer">
              <button className="mobile-btn-cancel" onClick={() => setShowMobileAdd(false)}>Vazgeç</button>
              <button className="mobile-btn-save" onClick={() => {
                setMobileAddError('');
                if (!mobileAddData.contact.trim() || !mobileAddData.username.trim() || !mobileAddData.password.trim()) {
                  setMobileAddError('Tüm alanlar zorunludur!'); return;
                }
                if (users.some(u => u.username.toLowerCase() === mobileAddData.username.toLowerCase())) {
                  setMobileAddError('Bu kullanıcı adı zaten kullanılıyor!'); return;
                }
                addUser(mobileAddData);
                setShowMobileAdd(false);
              }}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="premium-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <span className="warn-icon">⚠️</span>
              <h3>Personeli Sil?</h3>
            </div>
            <div className="confirm-body">
              <p>Personel kaydını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            </div>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={() => setConfirm(null)}>Vazgeç</button>
              <button className="btn-delete" onClick={() => { deleteUser(confirm); setConfirm(null); }}>Silmeyi Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
