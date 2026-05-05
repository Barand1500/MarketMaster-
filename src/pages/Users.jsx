import { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

const AVAILABLE_PAGES = [
  { id: 'products', label: '🍎 Ürün ve Stok' },
  { id: 'customers', label: '👥 Müşteriler' },
  { id: 'users', label: '🛡️ Kullanıcı Yönetimi' },
  { id: 'settings', label: '⚙️ Site Ayarları' }
];

function PaginationBar({ currentPage, totalPages, pageSize, totalCount, onPageChange, onPageSizeChange, label = 'kayıt', mobile }) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
  const containerStyle = mobile
    ? { display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 4px 80px', alignItems: 'center' }
    : { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' };
  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
        <span>Sayfa başına:</span>
        {[5, 10, 20].map(n => (
          <button key={n} onClick={() => onPageSizeChange(n)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid', borderColor: pageSize === n ? 'var(--primary)' : '#e2e8f0', background: pageSize === n ? 'rgba(0,184,148,0.08)' : '#fff', color: pageSize === n ? 'var(--primary)' : '#64748b', fontWeight: pageSize === n ? '800' : '600', cursor: 'pointer', fontSize: '12px' }}>{n}</button>
        ))}
        <span style={{ marginLeft: '8px', color: '#94a3b8' }}>{totalCount > 0 ? `${start}–${end} / ${totalCount} ${label}` : `0 ${label}`}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} style={pBtn(currentPage === 1)}>«</button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={pBtn(currentPage === 1)}>‹</button>
        {pages[0] > 1 && <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>}
        {pages.map(p => <button key={p} onClick={() => onPageChange(p)} style={pBtn(false, p === currentPage)}>{p}</button>)}
        {pages[pages.length - 1] < totalPages && <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={pBtn(currentPage === totalPages)}>›</button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} style={pBtn(currentPage === totalPages)}>»</button>
      </div>
    </div>
  );
}
function pBtn(disabled, active = false) {
  return { minWidth: '32px', height: '32px', borderRadius: '8px', border: '1px solid', borderColor: active ? 'var(--primary)' : '#e2e8f0', background: active ? 'var(--primary)' : disabled ? '#f8fafc' : '#fff', color: active ? '#fff' : disabled ? '#cbd5e1' : '#475569', fontWeight: '700', cursor: disabled ? 'default' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' };
}

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

  // SAYFALAMA
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const filteredUsers = users.filter(u => u.contact?.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (confirm) { setConfirm(null); return; }
      if (showMobileAdd) { setShowMobileAdd(false); return; }
      if (mobileEdit) { setMobileEdit(null); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [confirm, showMobileAdd, mobileEdit]);

  const togglePassword = (id, e) => {
    e.stopPropagation();
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = async () => {
    setErrorMsg('');
    if (!newRow.contact.trim() || !newRow.username.trim() || !newRow.password) {
      setErrorMsg("Ad Soyad, Kullanıcı Adı ve Şifre zorunludur!");
      return;
    }
    if (users.some(u => u.username.toLowerCase() === newRow.username.toLowerCase())) {
      setErrorMsg(`Bu kullanıcı adı (${newRow.username}) zaten kullanılıyor!`);
      return;
    }
    const result = await addUser(newRow);
    if (result?.ok === false) {
      setErrorMsg(result.error || 'Kullanıcı eklenemedi.');
      return;
    }
    setNewRow({ contact: '', username: '', password: '', allowedPages: ['products'] });
  };

  const handleBlur = (id, field, value) => {
    // Uniqueness check for editing username
    if (field === 'username' && value) {
      const otherUsers = users.filter(u => u.id !== id);
      if (otherUsers.some(u => u.username.toLowerCase() === value.toLowerCase())) {
        alert(`HATA: '${value}' kullanıcı adı zaten başka bir kullanıcıda kayıtlı! Değişiklik geri alındı.`);
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
        title="🛡️ Kullanıcı Yönetimi" 
        sub="Sisteme girebilecek kullanıcıları ve erişebilecekleri sayfaları belirleyin."
        helpContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Kullanıcı Nasıl Eklenir?</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Tablonun en üst satırındaki boş alanlara kullanıcının <strong>Ad Soyad</strong>, <strong>Kullanıcı Adı</strong> ve <strong>Şifre</strong> bilgilerini girin. Ardından hangi sayfalara girebileceğini kutucuklardan seçip <strong>EKLE</strong> butonuna basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔤 Kullanıcı Adı Nedir?</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>kullanıcının sisteme giriş yaparken kullanacağı özel isimdir. Her kullanıcının kullanıcı adı <strong>birbirinden farklı</strong> olmak zorundadır. Örnek: <em>ali123</em>, <em>mehmet_depo</em></div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔒 Sayfa Erişim Yetkileri Nedir?</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Her kullanıcı yalnızca izin verilen sayfalara girebilir. Örneğin; <strong>Ürün ve Stok</strong> seçilip <strong>Müşteriler</strong> seçilmezse o kullanıcı müşteri listesini hiç göremez. Yetkileri istediğiniz zaman güncelleyebilirsiniz.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Bilgileri Güncellemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ad Soyad, Kullanıcı Adı veya Şifre alanlarının üzerine <strong>çift tıklayın</strong> — alan düzenleme moduna geçer. Değişikliği yazıp Enter'a basın veya başka bir yere tıklayın, otomatik kaydedilir. Yetki kutucuklarına tıklayarak da erişim haklarını anında değiştirebilirsiniz.</div>
            </div>
            <div style={{ background: '#fff5f5', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>⚠️ Dikkat: Admin Hesabı</div>
              <div style={{ fontSize: '13px', color: '#b91c1c', lineHeight: '1.6' }}><strong>admin</strong> hesabı silinemez, yetkileri kısıtlanamaz ve her zaman tüm sayfalara erişir. Bu hesap sistemin yönetici hesabıdır.</div>
            </div>
          </div>
        }
        helpContentMobile={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Kullanıcı Eklemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ekranın sağ alt köşesindeki yeşil <strong>+</strong> butonuna dokunun. Açılan formda Ad Soyad, Kullanıcı Adı ve Şifre girin, yetkileri seçin, <strong>Ekle</strong>'ye basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Kullanıcı Bilgilerini Değiştirmek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Kullanıcı kartındaki kalem <strong>✏️</strong> ikonuna dokunun. Açılan ekranda bilgileri ve sayfa erişimlerini düzenleyip <strong>Kaydet</strong>'e basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🗑️ Kullanıcı Silmek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Kullanıcı kartındaki çöp kutusu <strong>🗑️</strong> ikonuna dokunun. Silmek istediğinizden emin olup olmadığınız sorulacak, onayladıktan sonra silinir.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔒 Sayfa Yetkileri Nedir?</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Kullanıcı yalnızca yetkili olduğu sayfalara girebilir. Düzenleme ekranındaki kutucuklarla hangi sayfalara erişebileceğini ayarlayabilirsiniz.</div>
            </div>
            <div style={{ background: '#fff5f5', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>⚠️ Admin Hesabı</div>
              <div style={{ fontSize: '13px', color: '#b91c1c', lineHeight: '1.6' }}>👑 Admin hesabı düzenlenemez ve silinemez. Her zaman tüm sayfalara erişimi vardır.</div>
            </div>
          </div>
        }
      />

      <div className="card excel-card">
        <div className="table-header-toolbar">
          <h2 className="toolbar-title">Sistem Kullanıcıları <span className="count-badge">{users.length} Kişi</span></h2>
          <div className="premium-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Kullanıcı ara..." value={search} onChange={e => setSearch(e.target.value)} />
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
              {pagedUsers.map(u => {
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
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredUsers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={v => { setPageSize(v); setCurrentPage(1); }}
          label="kullanıcı"
        />
      </div>

      {/* ===================== MOBİL KULLANICI LİSTESİ ===================== */}
      <div className="mobile-product-list">
        <div className="mobile-search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Kullanıcı ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize).map(u => {
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

        {/* MOBİL SAYFALAMA */}
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredUsers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={v => { setPageSize(v); setCurrentPage(1); }}
          label="kullanıcı"
          mobile
        />

        <button className="mobile-fab" onClick={() => { setMobileAddData({ contact: '', username: '', password: '', allowedPages: ['products'] }); setMobileAddError(''); setMobileAddPass(false); setShowMobileAdd(true); }}>＋</button>
      </div>

      {/* ===================== MOBİL DÜZENLEME MODALI ===================== */}
      {mobileEdit && (
        <div className="modal-overlay">
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Kullanıcıyı Düzenle</span>
              <button onClick={() => setMobileEdit(null)}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
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

      {/* ===================== MOBİL YENİ KULLANICI MODALİ ===================== */}
      {showMobileAdd && (
        <div className="modal-overlay">
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Yeni Kullanıcı Ekle</span>
              <button onClick={() => setShowMobileAdd(false)}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
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
        <div className="modal-overlay">
          <div className="premium-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <span className="warn-icon">⚠️</span>
              <h3>Kullanıcıyı Sil?</h3>
            </div>
            <div className="confirm-body">
              <p>Kullanıcı kaydını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
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
