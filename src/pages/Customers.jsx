import { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useData();

  const [newRow, setNewRow] = useState({ name: '', taxId: '', phone: '', password: '', discount: 0, email: '' });
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [infoModal, setInfoModal] = useState(null);
  const [showInfoPass, setShowInfoPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatPhoneDynamic = (val) => {
    let digits = val.replace(/\D/g, '');
    const isWithZero = digits.startsWith('0');
    if (isWithZero) {
      if (digits.length > 11) digits = digits.slice(0, 11);
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
    } else {
      if (digits.length > 10) digits = digits.slice(0, 10);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
    }
  };

  const formatPhone = (val) => {
    if (!val) return '';
    let cleaned = ('' + val).replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      cleaned = '0' + cleaned;
    }
    if (cleaned.length >= 11) {
      cleaned = cleaned.slice(0, 11);
      return cleaned.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    return formatPhoneDynamic(val); // Return dynamically formatted if it's less than 11 digits
  };

  const formatTaxId = (val) => {
    if (!val) return '';
    return ('' + val).replace(/\D/g, '');
  };

  const togglePassword = (id, e) => {
    e.stopPropagation();
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = () => {
    setErrorMsg('');
    if (!newRow.name.trim() || !newRow.password || !newRow.email.trim()) {
      setErrorMsg("Müşteri adı, e-posta ve şifre zorunludur!");
      return;
    }

    const cleanedTaxId = formatTaxId(newRow.taxId);
    const cleanedPhone = formatPhone(newRow.phone);

    // Uniqueness checks
    const duplicateEmail = customers.find(c => c.email.toLowerCase() === newRow.email.toLowerCase());
    if (duplicateEmail) { 
      setErrorMsg(`Bu e-posta adresi (${newRow.email}) zaten başka bir müşteriye kayıtlı!`); 
      return; 
    }

    if (cleanedPhone) {
      const duplicatePhone = customers.find(c => c.phone && c.phone.replace(/\s/g, '') === cleanedPhone.replace(/\s/g, ''));
      if (duplicatePhone) { 
        setErrorMsg(`Bu telefon numarası (${cleanedPhone}) zaten sistemde kayıtlı!`); 
        return; 
      }
    }

    if (cleanedTaxId) {
      const duplicateTaxId = customers.find(c => c.taxId === cleanedTaxId);
      if (duplicateTaxId) { 
        setErrorMsg(`Bu TC/VKN numarası (${cleanedTaxId}) zaten sistemde kayıtlı!`); 
        return; 
      }
    }

    addCustomer({ 
      ...newRow, 
      phone: cleanedPhone,
      taxId: cleanedTaxId
    });
    setNewRow({ name: '', taxId: '', phone: '', password: '', discount: 0, email: '' });
  };

  const handleBlur = (id, field, value) => {
    let finalValue = value;
    if (field === 'discount') finalValue = parseFloat(value) || 0;
    if (field === 'phone') finalValue = formatPhone(value);
    if (field === 'taxId') finalValue = formatTaxId(value);

    // Uniqueness check for editing
    if (['email', 'phone', 'taxId'].includes(field) && finalValue) {
      const otherCustomers = customers.filter(c => c.id !== id);
      let duplicateFound = false;

      if (field === 'email') duplicateFound = otherCustomers.find(c => c.email.toLowerCase() === finalValue.toLowerCase());
      if (field === 'phone') duplicateFound = otherCustomers.find(c => c.phone && c.phone.replace(/\s/g, '') === finalValue.replace(/\s/g, ''));
      if (field === 'taxId') duplicateFound = otherCustomers.find(c => c.taxId === finalValue);

      if (duplicateFound) {
        alert(`HATA: Bu ${field === 'taxId' ? 'TC/VKN' : field} zaten başka bir müşteride kayıtlı! Değişiklik iptal edildi.`);
        setEditing(null);
        return;
      }
    }

    updateCustomer(id, { [field]: finalValue });
    setEditing(null);
  };

  return (
    <div className="page-container wide">
      <PageHeader 
        title="👥 Müşteri Yönetimi" 
        sub="Müşteri portföyünüzü ve özel portal erişimlerini hızla yönetin."
        helpContent={
          <div className="help-modal-content">
            <h3 style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '8px', color: '#1e293b' }}>Müşteriler Sisteme Nasıl Giriş Yapar?</h3>
            <p>Müşterilerinizin kendilerine özel indirimli fiyatları görebilmesi ve sisteme giriş yapabilmesi için sistemimiz oldukça basit çalışır:</p>
            <ol style={{ paddingLeft: '20px', lineHeight: '1.6', marginTop: '12px' }}>
              <li><strong>Kullanıcı Adı veya E-posta:</strong> Müşterileriniz giriş yaparken, tabloda yazan <b>Müşteri Adı</b> veya <b>E-posta</b> bilgisini kullanarak giriş yapabilirler.</li>
              <li><strong>Şifre:</strong> Müşterinize burada atadığınız şifreyi kullanarak sisteme erişirler.</li>
              <li><strong>Şifre Sıfırlama:</strong> Müşteri şifresini unutursa, giriş ekranından e-posta adresini girerek şifre sıfırlama talebinde bulunabilir. Bu yüzden <b>E-posta alanı zorunludur.</b></li>
            </ol>
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <strong style={{ color: '#3b82f6' }}>💡 Şifre İpucu:</strong> Şifre sütunundaki göz (👁️) simgesine tıklayarak müşterinizin güncel şifresini görebilirsiniz. Hücreye çift tıklayarak şifreyi veya başka bir bilgiyi anında güncelleyebilirsiniz.
            </div>
            <div style={{ marginTop: '12px', background: '#fff0f2', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
              <strong style={{ color: 'var(--danger)' }}>% İskonto Nedir?</strong> Müşterinize tanımladığınız özel indirim oranıdır. Örneğin "10" yazarsanız, bu müşteri giriş yaptığında sistemdeki tüm fiyatları otomatik olarak %10 indirimli görür.
            </div>
          </div>
        }
      />

      <div className="card excel-card">
        <div className="table-header-toolbar">
          <h2 className="toolbar-title">Kayıtlı Müşteriler <span className="count-badge">{customers.length} Kişi</span></h2>
          <div className="premium-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Müşteri ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap overflow-visible">
          <table className="excel-table">
            <thead>
              <tr className="th-row">
                <th style={{ width: '180px' }}>Müşteri Adı <span style={{ color: 'var(--danger)', fontSize: '14px' }}>*</span></th>
                <th style={{ width: '120px' }}>TC / VKN</th>
                <th style={{ width: '140px' }}>Telefon</th>
                <th style={{ width: '120px' }}>Şifre <span style={{ color: 'var(--danger)', fontSize: '14px' }}>*</span></th>
                <th style={{ width: '100px' }}>İskonto %</th>
                <th style={{ width: '180px' }}>E-posta <span style={{ color: 'var(--danger)', fontSize: '14px' }}>*</span></th>
                <th style={{ width: '100px', textAlign: 'center' }}>İşlem</th>
              </tr>
              {/* EXCEL ADD ROW */}
              <tr className="add-row">
                <td><input className="lite-input" type="text" placeholder="Yeni müşteri..." value={newRow.name} onChange={e => setNewRow({...newRow, name: e.target.value})} /></td>
                <td><input className="lite-input" type="text" placeholder="Max 11 rakam" value={newRow.taxId} onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 11) val = val.slice(0, 11);
                  setNewRow({...newRow, taxId: val});
                }} /></td>
                <td><input className="lite-input" type="text" placeholder="Örn: 0530..." value={newRow.phone} onChange={e => setNewRow({...newRow, phone: formatPhoneDynamic(e.target.value)})} /></td>
                <td><input className="lite-input" type="password" placeholder="••••••" value={newRow.password} onChange={e => setNewRow({...newRow, password: e.target.value})} /></td>
                <td><input className="lite-input" type="number" placeholder="0" value={newRow.discount} onChange={e => setNewRow({...newRow, discount: e.target.value})} /></td>
                <td><input className="lite-input" type="email" placeholder="Zorunlu..." value={newRow.email} onChange={e => setNewRow({...newRow, email: e.target.value})} /></td>
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
              {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                <tr key={c.id} className={editing?.id === c.id ? 'editing-row' : ''}>
                  {/* INLINE EDITABLE CELLS */}
                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'name' })}>
                    {editing?.id === c.id && editing?.field === 'name' ? (
                      <input autoFocus className="lite-input" defaultValue={c.name} onBlur={(e) => handleBlur(c.id, 'name', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt">{c.name}</span>
                    )}
                  </td>
                  
                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'taxId' })}>
                    {editing?.id === c.id && editing?.field === 'taxId' ? (
                      <input autoFocus className="lite-input" defaultValue={c.taxId} onInput={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.slice(0, 11);
                        e.target.value = val;
                      }} onBlur={(e) => handleBlur(c.id, 'taxId', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt">{c.taxId || '-'}</span>
                    )}
                  </td>

                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'phone' })}>
                    {editing?.id === c.id && editing?.field === 'phone' ? (
                      <input autoFocus className="lite-input" defaultValue={c.phone} onInput={e => {
                        const start = e.target.selectionStart;
                        const prevLen = e.target.value.length;
                        e.target.value = formatPhoneDynamic(e.target.value);
                        // Kursor pozisyonunu korumaya çalış, onInput sırasında doğrudan atama kursörü sona atar
                      }} onBlur={(e) => handleBlur(c.id, 'phone', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt">{c.phone || '-'}</span>
                    )}
                  </td>

                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'password' })}>
                    {editing?.id === c.id && editing?.field === 'password' ? (
                      <input autoFocus className="lite-input" defaultValue={c.password} onBlur={(e) => handleBlur(c.id, 'password', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="edit-txt">{showPasswords[c.id] ? c.password : '••••••'}</span>
                        <button 
                          onClick={(e) => togglePassword(c.id, e)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '14px', padding: '2px 6px', transition: 'opacity 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.opacity = 1}
                          onMouseOut={e => e.currentTarget.style.opacity = 0.6}
                          title={showPasswords[c.id] ? "Şifreyi Gizle" : "Şifreyi Göster"}
                        >
                          {showPasswords[c.id] ? '🙈' : '👁️'}
                        </button>
                      </div>
                    )}
                  </td>

                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'discount' })}>
                    {editing?.id === c.id && editing?.field === 'discount' ? (
                      <input autoFocus type="number" className="lite-input" defaultValue={c.discount} onBlur={(e) => handleBlur(c.id, 'discount', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt">%{c.discount || 0}</span>
                    )}
                  </td>

                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'email' })}>
                    {editing?.id === c.id && editing?.field === 'email' ? (
                      <input autoFocus type="email" className="lite-input" defaultValue={c.email} onBlur={(e) => handleBlur(c.id, 'email', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt" style={{ color: '#3b82f6', fontWeight: '500' }}>{c.email || '-'}</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button 
                      className="profile-view-btn" 
                      title="Müşteri Detaylı Profili" 
                      onClick={() => setInfoModal(c)}
                      style={{ 
                        background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', 
                        borderRadius: '8px', width: '32px', height: '32px', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      👤
                    </button>
                    <button className="del-btn-icon" onClick={() => setConfirm(c.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="premium-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <span className="warn-icon">⚠️</span>
              <h3>Müşteriyi Sil?</h3>
            </div>
            <div className="confirm-body">
              <p>Müşteri kaydını kalıcı olarak silmek istediğinizden emin misiniz?</p>
            </div>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={() => setConfirm(null)}>Vazgeç</button>
              <button className="btn-delete" onClick={() => { deleteCustomer(confirm); setConfirm(null); }}>Silmeyi Onayla</button>
            </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ BİLGİ/PROFİL MODALI - PREMİUM REDESIGN */}
      {infoModal && (
        <div className="modal-overlay" onClick={() => setInfoModal(null)} style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="premium-confirm" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
            {/* Header with Gradient */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)', 
              padding: '20px 24px', color: '#fff', position: 'relative' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(10px)' }}>
                  👤
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>{infoModal.name}</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.8, fontWeight: '500' }}>Müşteri Detaylı Bilgi Kartı</p>
                </div>
              </div>
              <button onClick={() => setInfoModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✕</button>
            </div>

            <div style={{ padding: '32px', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Sol Kolon: İletişim Bilgileri */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>İletişim & Hesap</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>📧 E-posta Adresi</span>
                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{infoModal.email}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>📞 Telefon</span>
                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{infoModal.phone || 'Girilmedi'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>🔑 Güncel Şifre</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: '700', background: '#f0f9ff', padding: '4px 8px', borderRadius: '6px' }}>
                        {showInfoPass ? infoModal.password : '••••••'}
                      </span>
                      <button 
                        onClick={() => setShowInfoPass(!showInfoPass)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 }}
                      >
                        {showInfoPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sağ Kolon: Ticari Bilgiler */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Ticari & Vergi</h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>🆔 TC / VKN</span>
                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{infoModal.taxId || 'Girilmedi'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>🏷️ Özel İskonto Oranı</span>
                    <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '800' }}>%{infoModal.discount || 0} İndirim</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>🗓️ Kayıt Tarihi</span>
                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{new Date(infoModal.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              {/* Adres Bölümü */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Kayıtlı Adres</h4>
                <div style={{ 
                  background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0',
                  fontSize: '13px', color: '#475569', lineHeight: '1.6', fontStyle: infoModal.address ? 'normal' : 'italic'
                }}>
                  {infoModal.address || 'Henüz bir adres bilgisi girilmemiş.'}
                </div>
              </div>
            </div>

            {/* Footer Removed as per request (only Close X remains) */}
          </div>
        </div>
      )}
    </div>
  );
}
