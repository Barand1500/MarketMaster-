import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

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

export default function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useData();

  const [newRow, setNewRow] = useState({ name: '', taxId: '', phone: '', password: '', discount: '', email: '' });
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [infoModal, setInfoModal] = useState(null);
  const [showInfoPass, setShowInfoPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // MOBİL state
  const [mobileEdit, setMobileEdit] = useState(null); // customer being edited
  const [showMobileAdd, setShowMobileAdd] = useState(false);
  const [mobileAddData, setMobileAddData] = useState({ name: '', taxId: '', phone: '', password: '', discount: '0', email: '' });
  const [mobileAddError, setMobileAddError] = useState('');
  const [mobileEditError, setMobileEditError] = useState('');
  const [mobileEditPass, setMobileEditPass] = useState(false);

  // SAYFALAMA
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCustomers = filteredCustomers.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (infoModal) { setInfoModal(null); return; }
      if (confirm) { setConfirm(null); return; }
      if (showMobileAdd) { setShowMobileAdd(false); return; }
      if (mobileEdit) { setMobileEdit(null); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [infoModal, confirm, showMobileAdd, mobileEdit]);

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

  // Zincirleme iskonto hesaplayıcı: "20+20" → 36, "10" → 10
  const parseDiscount = (text) => {
    const str = String(text || '0').trim();
    if (str.includes('+')) {
      const parts = str.split('+').map(p => parseFloat(p.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 100);
      if (parts.length >= 2) {
        let remaining = 100;
        for (const p of parts) remaining = remaining * (1 - p / 100);
        return Math.round((100 - remaining) * 100) / 100;
      }
    }
    const n = parseFloat(str);
    return (!isNaN(n) && n >= 0) ? Math.min(n, 100) : 0;
  };

  // Admin tabloda gösterim: "20+20" → "20+20 (%36)", "10" → "%10"
  const displayDiscount = (val) => {
    const raw = String(val || '0').trim();
    const rate = parseDiscount(raw);
    if (raw.includes('+')) return `${raw} (%${rate})`;
    return `%${rate}`;
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
      taxId: cleanedTaxId,
      discount: newRow.discount || '0'
    });
    setNewRow({ name: '', taxId: '', phone: '', password: '', discount: '', email: '' });
  };

  const handleBlur = (id, field, value) => {
    let finalValue = value;
    if (field === 'discount') finalValue = value || '0';
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Müşteri Eklemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Tablonun en üst satırı yeni müşteri eklemek içindir. Ad, e-posta ve şifre alanlarını doldurup <strong>EKLE</strong> butonuna basın veya <strong>Enter</strong>'a tıklayın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Mevcut Müşteri Bilgisini Değiştirmek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Herhangi bir hücreye <strong>çift tıklayın</strong> — alan anında düzenleme moduna geçer. Değişikliği yazıp <strong>Enter</strong>'a basın, otomatik kaydedilir.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔑 Giriş Bilgileri ve Şifre</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Müşteriler, <strong>Müşteri Adı</strong> veya <strong>E-posta</strong> + şifre ile sisteme giriş yapar. Göz (👁️) simgesine tıklayarak mevcut şifreyi görebilirsiniz.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>% İskonto (Özel İndirim)</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Müşteriye özel indirim oranıdır. Örneğin <strong>10</strong> yazarsanız, o müşteri tüm fiyatları %10 indirimli görür.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📧 Şifre Sıfırlama</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Müşteri şifresini unutursa giriş ekranından e-posta ile sıfırlama yapabilir. Bunun için <strong>e-posta alanının dolu olması zorunludur.</strong></div>
            </div>
            <div className="help-tip">
              <strong>💡 İpucu:</strong> Üstteki arama kutusuna yazarak müşterileri anında filtreleyebilirsiniz.
            </div>
          </div>
        }
        helpContentMobile={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Müşteri Eklemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Sağ alttaki yeşil <strong>+</strong> butonuna dokunun. Açılan formda bilgileri doldurup <strong>Kaydet</strong>'e basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Müşteri Bilgisini Düzenlemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Kartın sağındaki kalem <strong>✏️</strong> ikonuna dokunun. Açılan ekranda ad, e-posta, şifre, telefon ve iskonto bilgilerini değiştirip <strong>Kaydet</strong>'e basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔑 Şifre ve Giriş</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Müşteriler, <strong>Müşteri Adı</strong> veya <strong>E-posta</strong> + şifre ile giriş yapar. Göz (👁️) ikonuna dokunarak şifreyi görebilirsiniz.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>% İskonto ve 🗑️ Silme</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Düzenleme ekranında iskonto oranı girerek müşteriye özel indirim tanımlayabilirsiniz. Silmek için 🗑️ ikonuna dokunun, onay istenir.</div>
            </div>
            <div className="help-tip">
              <strong>💡 İpucu:</strong> Müşteri adı veya e-posta ile arama yapabilirsiniz.
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
                <th style={{ width: '180px' }}>Müşteri Adı / Ünvan <span style={{ color: 'var(--danger)', fontSize: '14px' }}>*</span></th>
                <th style={{ width: '120px' }}>TC / VKN</th>
                <th style={{ width: '140px' }}>Telefon</th>
                <th style={{ width: '180px' }}>E-posta <span style={{ color: 'var(--danger)', fontSize: '14px' }}>*</span></th>
                <th style={{ width: '120px' }}>Şifre <span style={{ color: 'var(--danger)', fontSize: '14px' }}>*</span></th>
                <th style={{ width: '130px' }}>İskonto %</th>
                <th style={{ width: '100px', textAlign: 'center' }}>İşlem</th>
              </tr>
              {/* EXCEL ADD ROW */}
              <tr className="add-row">
                <td><input className="lite-input" type="text" placeholder="Yeni müşteri..." value={newRow.name} onChange={e => { const el=e.target, s=el.selectionStart, n=el.selectionEnd, v=el.value.toLocaleUpperCase('tr-TR'); setNewRow({...newRow, name:v}); requestAnimationFrame(()=>{ if(document.activeElement===el) el.setSelectionRange(s,n); }); }} /></td>
                <td><input className="lite-input" type="text" placeholder="Max 11 rakam" value={newRow.taxId} onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 11) val = val.slice(0, 11);
                  setNewRow({...newRow, taxId: val});
                }} /></td>
                <td><input className="lite-input" type="text" placeholder="Örn: 0530..." value={newRow.phone} onChange={e => setNewRow({...newRow, phone: formatPhoneDynamic(e.target.value)})} /></td>
                <td><input className="lite-input" type="email" placeholder="Zorunlu..." value={newRow.email} onChange={e => setNewRow({...newRow, email: e.target.value})} /></td>
                <td><input className="lite-input" type="password" placeholder="••••••" value={newRow.password} onChange={e => setNewRow({...newRow, password: e.target.value})} /></td>
                <td><input className="lite-input" type="text" placeholder="0 veya 20+20" value={newRow.discount} onChange={e => setNewRow({...newRow, discount: e.target.value})} /></td>
                <td style={{ textAlign: 'center', position: 'relative' }}>
                  <button className="lite-add-btn" onClick={handleAdd} title="Müşteri ekle">+</button>
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
              {pagedCustomers.map(c => (
                <tr key={c.id} className={editing?.id === c.id ? 'editing-row' : ''}>
                  {/* INLINE EDITABLE CELLS */}
                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'name' })}>
                    {editing?.id === c.id && editing?.field === 'name' ? (
                      <input autoFocus className="lite-input" defaultValue={c.name} onChange={e => { const s=e.target.selectionStart, n=e.target.selectionEnd; e.target.value=e.target.value.toLocaleUpperCase('tr-TR'); e.target.setSelectionRange(s,n); }} onBlur={(e) => handleBlur(c.id, 'name', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
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



                  <td onDoubleClick={() => setEditing({ id: c.id, field: 'email' })}>
                    {editing?.id === c.id && editing?.field === 'email' ? (
                      <input autoFocus type="email" className="lite-input" defaultValue={c.email} onBlur={(e) => handleBlur(c.id, 'email', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt" style={{ color: '#3b82f6', fontWeight: '500' }}>{c.email || '-'}</span>
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
                      <input autoFocus type="text" className="lite-input" defaultValue={c.discount} placeholder="0 veya 20+20" onBlur={(e) => handleBlur(c.id, 'discount', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                    ) : (
                      <span className="edit-txt">{displayDiscount(c.discount)}</span>
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
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredCustomers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={v => { setPageSize(v); setCurrentPage(1); }}
          label="müşteri"
        />
      </div>

      {/* ===================== MOBİL MÜŞTERİ LİSTESİ ===================== */}
      <div className="mobile-product-list">
        <div className="mobile-search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Müşteri ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filteredCustomers.slice((safePage - 1) * pageSize, safePage * pageSize).map(c => (
          <div key={c.id} className="mobile-product-card">
            <div className="mobile-card-img" style={{ background: '#ebf4ff', fontSize: '22px' }}>👤</div>
            <div className="mobile-card-info">
              <div className="mobile-card-name">{c.name}</div>
              <div className="mobile-card-meta">
                {c.email && <span style={{ fontSize: '11px', color: '#718096' }}>{c.email}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {c.phone && <span className="mobile-info-chip">📞 {c.phone}</span>}
                {parseDiscount(String(c.discount || '0')) > 0 && (
                  <span className="mobile-discount-badge">
                    <span className="mobile-discount-pct">%{parseDiscount(String(c.discount || '0'))}</span>
                    <span className="mobile-discount-label">İndirim</span>
                  </span>
                )}
              </div>
            </div>
            <div className="mobile-card-actions">
              <button className="mobile-edit-btn" style={{ background: '#ebf8ff' }} onClick={() => setInfoModal(c)}>👤</button>
              <button className="mobile-edit-btn" onClick={() => {
                setMobileEdit({ id: c.id, name: c.name, taxId: c.taxId || '', phone: c.phone || '', email: c.email || '', password: c.password || '', discount: String(c.discount || 0) });
                setMobileEditError('');
                setMobileEditPass(false);
              }}>✏️</button>
              <button className="mobile-del-btn" onClick={() => setConfirm(c.id)}>🗑</button>
            </div>
          </div>
        ))}

        {/* MOBİL SAYFALAMA */}
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredCustomers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={v => { setPageSize(v); setCurrentPage(1); }}
          label="müşteri"
          mobile
        />

        <button className="mobile-fab" onClick={() => { setMobileAddData({ name: '', taxId: '', phone: '', password: '', discount: '0', email: '' }); setMobileAddError(''); setShowMobileAdd(true); }}>＋</button>
      </div>

      {/* ===================== MOBİL DÜZENLEME MODALI ===================== */}
      {mobileEdit && (
        <div className="modal-overlay">
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Müşteriyi Düzenle</span>
              <button onClick={() => setMobileEdit(null)}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
            </div>
            <div className="mobile-modal-body">
              <label className="mobile-label">Müşteri Adı / Ünvan *</label>
              <input className="mobile-input" value={mobileEdit.name} onChange={e => { const el=e.target, s=el.selectionStart, n=el.selectionEnd, v=el.value.toLocaleUpperCase('tr-TR'); setMobileEdit(p=>({...p, name:v})); requestAnimationFrame(()=>{ if(document.activeElement===el) el.setSelectionRange(s,n); }); }} placeholder="Müşteri adı..." />

              <label className="mobile-label">E-posta *</label>
              <input className="mobile-input" type="email" value={mobileEdit.email} onChange={e => setMobileEdit(p => ({ ...p, email: e.target.value }))} placeholder="ornek@email.com" />

              <label className="mobile-label">Şifre *</label>
              <div style={{ position: 'relative' }}>
                <input className="mobile-input" type={mobileEditPass ? 'text' : 'password'} value={mobileEdit.password} onChange={e => setMobileEdit(p => ({ ...p, password: e.target.value }))} placeholder="Şifre..." style={{ paddingRight: '40px' }} />
                <button onClick={() => setMobileEditPass(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>{mobileEditPass ? '🙈' : '👁️'}</button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Telefon</label>
                  <input className="mobile-input" value={mobileEdit.phone} onChange={e => setMobileEdit(p => ({ ...p, phone: formatPhoneDynamic(e.target.value) }))} placeholder="05xx xxx xx xx" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">İskonto %</label>
                  <input className="mobile-input" type="text" value={mobileEdit.discount} onChange={e => setMobileEdit(p => ({ ...p, discount: e.target.value }))} placeholder="0 veya 20+20" />
                </div>
              </div>

              <label className="mobile-label">TC / VKN</label>
              <input className="mobile-input" value={mobileEdit.taxId} onChange={e => setMobileEdit(p => ({ ...p, taxId: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="TC veya Vergi No..." />

              {mobileEditError && <div style={{ marginTop: '8px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', color: '#742a2a', fontSize: '13px' }}>⚠️ {mobileEditError}</div>}
            </div>
            <div className="mobile-modal-footer">
              <button className="mobile-btn-cancel" onClick={() => setMobileEdit(null)}>Vazgeç</button>
              <button className="mobile-btn-save" onClick={() => {
                if (!mobileEdit.name.trim() || !mobileEdit.email.trim() || !mobileEdit.password.trim()) {
                  setMobileEditError('Ad, e-posta ve şifre zorunludur!'); return;
                }
                const others = customers.filter(c => c.id !== mobileEdit.id);
                if (others.find(c => c.email.toLowerCase() === mobileEdit.email.toLowerCase())) {
                  setMobileEditError('Bu e-posta zaten kayıtlı!'); return;
                }
                updateCustomer(mobileEdit.id, { name: mobileEdit.name, email: mobileEdit.email, password: mobileEdit.password, phone: formatPhone(mobileEdit.phone), taxId: formatTaxId(mobileEdit.taxId), discount: mobileEdit.discount || '0' });
                setMobileEdit(null);
              }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MOBİL YENİ MÜŞTERİ MODALI ===================== */}
      {showMobileAdd && (
        <div className="modal-overlay">
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Yeni Müşteri Ekle</span>
              <button onClick={() => setShowMobileAdd(false)}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
            </div>
            <div className="mobile-modal-body">
              <label className="mobile-label">Müşteri Adı / Ünvan *</label>
              <input className="mobile-input" value={mobileAddData.name} onChange={e => { const el=e.target, s=el.selectionStart, n=el.selectionEnd, v=el.value.toLocaleUpperCase('tr-TR'); setMobileAddData(p=>({...p, name:v})); requestAnimationFrame(()=>{ if(document.activeElement===el) el.setSelectionRange(s,n); }); }} placeholder="Müşteri adı..." />

              <label className="mobile-label">E-posta *</label>
              <input className="mobile-input" type="email" value={mobileAddData.email} onChange={e => setMobileAddData(p => ({ ...p, email: e.target.value }))} placeholder="ornek@email.com" />

              <label className="mobile-label">Şifre *</label>
              <input className="mobile-input" type="text" value={mobileAddData.password} onChange={e => setMobileAddData(p => ({ ...p, password: e.target.value }))} placeholder="Şifre..." />

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Telefon</label>
                  <input className="mobile-input" value={mobileAddData.phone} onChange={e => setMobileAddData(p => ({ ...p, phone: formatPhoneDynamic(e.target.value) }))} placeholder="05xx xxx xx xx" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">İskonto %</label>
                  <input className="mobile-input" type="text" value={mobileAddData.discount} onChange={e => setMobileAddData(p => ({ ...p, discount: e.target.value }))} placeholder="0 veya 20+20" />
                </div>
              </div>

              <label className="mobile-label">TC / VKN</label>
              <input className="mobile-input" value={mobileAddData.taxId} onChange={e => setMobileAddData(p => ({ ...p, taxId: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="TC veya Vergi No..." />

              {mobileAddError && <div style={{ marginTop: '8px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', color: '#742a2a', fontSize: '13px' }}>⚠️ {mobileAddError}</div>}
            </div>
            <div className="mobile-modal-footer">
              <button className="mobile-btn-cancel" onClick={() => setShowMobileAdd(false)}>Vazgeç</button>
              <button className="mobile-btn-save" onClick={() => {
                setMobileAddError('');
                if (!mobileAddData.name.trim() || !mobileAddData.email.trim() || !mobileAddData.password.trim()) {
                  setMobileAddError('Ad, e-posta ve şifre zorunludur!'); return;
                }
                if (customers.find(c => c.email.toLowerCase() === mobileAddData.email.toLowerCase())) {
                  setMobileAddError('Bu e-posta zaten kayıtlı!'); return;
                }
                addCustomer({ name: mobileAddData.name, email: mobileAddData.email, password: mobileAddData.password, phone: formatPhone(mobileAddData.phone), taxId: formatTaxId(mobileAddData.taxId), discount: mobileAddData.discount || '0' });
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
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
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
              <button onClick={() => setInfoModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
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
                    <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '800' }}>{displayDiscount(infoModal.discount)} İndirim</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>🗓️ Kayıt Tarihi</span>
                    <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                      {infoModal.createdAt && !isNaN(new Date(infoModal.createdAt).getTime()) 
                        ? new Date(infoModal.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Bilinmiyor'}
                    </span>
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
