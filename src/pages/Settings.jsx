import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

const ALL_SHEETS = [
  { key: 'urunler',                label: 'Ürünler',            desc: 'Ürün adları, fiyatlar ve stok bilgisi',     icon: '🥦' },
  { key: 'kategoriler',            label: 'Kategoriler',        desc: 'Ürün kategori ağacı',                        icon: '📂' },
  { key: 'birimler',               label: 'Birimler',           desc: 'Kg, adet, litre vb.',                        icon: '⚖️' },
  { key: 'musteriler',             label: 'Müşteriler',         desc: 'Müşteri bilgileri ve iskonto oranları',       icon: '👥' },
  { key: 'personeller',            label: 'Personeller',        desc: 'Personel bilgileri ve şifreler',              icon: '👤' },
  { key: 'personel_yetkileri',     label: 'Personel Yetkileri', desc: 'Sayfa erişim yetkileri',                     icon: '🔐' },
  { key: 'urun_kategori_iliskisi', label: 'Ürün-Kategori',      desc: 'Hangi ürün hangi kategoride',                icon: '🔗' },
];

// Bir tabloyu seçince beraber seçilmesi ZORUNLU olan tablolar
const DEPS = {
  urunler:                ['birimler'],
  personel_yetkileri:     ['personeller'],
  urun_kategori_iliskisi: ['urunler', 'kategoriler', 'birimler'],
};

// Bir tabloyu kaldırınca bağımlı olduğu için kaldırılması gereken tablolar
const REQUIRED_BY = {};
Object.entries(DEPS).forEach(([tbl, deps]) => {
  deps.forEach(dep => {
    if (!REQUIRED_BY[dep]) REQUIRED_BY[dep] = [];
    REQUIRED_BY[dep].push(tbl);
  });
});

// Bir tablo seçildiğinde tüm bağımlılıklarını (transitif) döndürür
const collectDeps = (key) => {
  const all = new Set();
  const visit = (k) => (DEPS[k] || []).forEach(d => { if (!all.has(d)) { all.add(d); visit(d); } });
  visit(key);
  return [...all];
};

// Bir tablo kaldırıldığında onu gerektiren tüm tabloları (transitif) döndürür
const collectRequiredBy = (key) => {
  const all = new Set();
  const visit = (k) => (REQUIRED_BY[k] || []).forEach(d => { if (!all.has(d)) { all.add(d); visit(d); } });
  visit(key);
  return [...all];
};

// Her tablo için DB alan adları (export ve import için canonical sıra)
const TABLE_FIELDS = {
  urunler:                ['id','urun_adi','fiyat','birim_id','gorsel_yolu','stok_durumu','bilgi_guncelleme_tarihi'],
  kategoriler:            ['id','kategori_adi','ust_kategori_id'],
  birimler:               ['id','birim_adi'],
  musteriler:             ['id','ad_soyad','vkn_tc','telefon','eposta','sifre','iskonto_orani','adres'],
  personeller:            ['id','ad_soyad','kullanici_adi','sifre'],
  personel_yetkileri:     ['personel_id','sayfa_adi'],
  urun_kategori_iliskisi: ['urun_id','kategori_id'],
};

export default function Settings() {
  const { siteSettings, updateSiteSettings } = useData();

  const [siteAdi, setSiteAdi] = useState(siteSettings.site_adi || 'Bostan Manav');
  const [logo, setLogo] = useState(siteSettings.logo || '');
  const [favicon, setFavicon] = useState(siteSettings.favicon || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  // YEDEKLEME
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(null); // { type:'excel'|'sql', payload:... }
  const [restoreResult, setRestoreResult] = useState(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelSelections, setExcelSelections] = useState(
    Object.fromEntries(ALL_SHEETS.map(s => [s.key, true]))
  );
  const restoreExcelFileRef = useRef(null);
  const restoreSqlFileRef = useRef(null);

  const logoRef = useRef(null);
  const faviconRef = useRef(null);

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setMsg({ ok: false, text: 'Logo dosyası en fazla 500 KB olabilir.' }); return; }
    const b64 = await readFileAsBase64(file);
    setLogo(b64);
    e.target.value = '';
  };

  const handleFaviconChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) { setMsg({ ok: false, text: 'Favicon dosyası en fazla 200 KB olabilir.' }); return; }
    const b64 = await readFileAsBase64(file);
    setFavicon(b64);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!siteAdi.trim()) return setMsg({ ok: false, text: 'Site adı boş bırakılamaz.' });
    setSaving(true); setMsg(null);
    const result = await updateSiteSettings({ site_adi: siteAdi, logo, favicon });
    if (result.success) {
      setMsg({ ok: true, text: 'Ayarlar başarıyla kaydedildi.' });
      // Favicon güncelle
      if (favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = favicon;
      }
      // Sayfa başlığı güncelle
      if (siteAdi) document.title = siteAdi;
    } else {
      setMsg({ ok: false, text: result.error || 'Ayarlar kaydedilemedi.' });
    }
    setSaving(false);
  };

  const handleReset = async () => {    if (!window.confirm('Tüm ayarlar varsayılana sıfırlanacak (site adı, logo, favicon). Emin misiniz?')) return;
    setSiteAdi('Bostan Manav');
    setLogo('');
    setFavicon('');
    setSaving(true); setMsg(null);
    const result = await updateSiteSettings({ site_adi: 'Bostan Manav', logo: '', favicon: '' });
    if (result.success) {
      setMsg({ ok: true, text: 'Ayarlar varsayılana sıfırlandı.' });
      document.title = 'Bostan Manav';
    } else {
      setMsg({ ok: false, text: result.error || 'Sıfırlama başarısız.' });
    }
    setSaving(false);
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' };

  // ── Yedekleme işleyicileri ──────────────────────────────

  // Excel İndir — modal onayından sonra çalışır
  const handleExcelDownload = async () => {
    const selected = ALL_SHEETS.filter(s => excelSelections[s.key]);
    if (selected.length === 0) return;
    setShowExcelModal(false);
    setBackupLoading(true);
    setRestoreResult(null);
    try {
      const r = await fetch('/api/backup');
      if (!r.ok) throw new Error(`Sunucu hatası: ${r.status}`);
      const backupData = await r.json();
      const wb = XLSX.utils.book_new();
      selected.forEach(({ key, label }) => {
        // gorsel_yolu base64 resim içerdiğinden Excel 32767 char limitini aşıyor — SQL yedeği kullanın
        const fields = (TABLE_FIELDS[key] || []).filter(f => f !== 'gorsel_yolu');
        const rows = (backupData.data[key] || []).map(row => {
          const mapped = {};
          fields.forEach(f => { mapped[f] = row[f] !== undefined ? row[f] : null; });
          return mapped;
        });
        // json_to_sheet ile satırları yazarken sütun sırasını koru
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}], { header: fields });
        ws['!cols'] = fields.map(f => ({ wch: Math.max(f.length + 2, 14) }));
        XLSX.utils.book_append_sheet(wb, ws, label);
      });
      XLSX.writeFile(wb, `bostan_yedek_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setRestoreResult({ ok: false, msg: 'Excel oluşturulamadı: ' + (e.message || 'bilinmeyen hata') });
    }
    setBackupLoading(false);
  };

  // SQL İndir
  const handleBackupSql = async () => {
    setBackupLoading(true);
    setRestoreResult(null);
    try {
      const r = await fetch('/api/backup-sql');
      if (!r.ok) throw new Error(`Sunucu hatası: ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bostan_yedek_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setRestoreResult({ ok: false, msg: 'SQL indirilemedi: ' + (e.message || '') });
    }
    setBackupLoading(false);
  };

  // Excel Geri Yükle
  const handleRestoreExcelFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: false, raw: true });
        const data = {};
        ALL_SHEETS.forEach(({ key, label }) => {
          const ws = wb.Sheets[label];
          if (!ws) return;
          // defval: null — boş hücreler null gelsin, raw: true — değer dönüşümü yapma
          const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
          // Sütun adları DB alan adları olduğundan doğrudan kullan
          data[key] = rows;
        });
        if (!ALL_SHEETS.some(s => data[s.key] && data[s.key].length > 0)) throw new Error('Boş dosya');
        setRestoreConfirm({ type: 'excel', payload: { version: 2, createdAt: new Date().toISOString(), data } });
      } catch (err) {
        setRestoreResult({ ok: false, msg: 'Geçersiz Excel yedek dosyası. Bostan Manav Excel yedeği seçiniz.' + (err.message ? ' (' + err.message + ')' : '') });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // SQL Geri Yükle
  const handleRestoreSqlFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const sql = ev.target.result;
      if (!sql || !sql.includes('-- Bostan Manav SQL Yedeği')) {
        setRestoreResult({ ok: false, msg: 'Geçersiz SQL dosyası. Yalnızca bu sistemden alınan .sql yedekleri yüklenebilir.' });
        return;
      }
      setRestoreConfirm({ type: 'sql', payload: sql });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Onaylı Geri Yükleme
  const handleRestoreConfirmed = async () => {
    const confirm = restoreConfirm;
    setRestoreConfirm(null);
    setRestoreLoading(true);
    try {
      let r;
      if (confirm.type === 'excel') {
        r = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(confirm.payload),
        });
      } else {
        r = await fetch('/api/restore-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: confirm.payload,
        });
      }
      const json = await r.json();
      if (json.success) {
        setRestoreResult({ ok: true, msg: 'Veriler başarıyla geri yüklendi. Sayfa yenilenecek...' });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRestoreResult({ ok: false, msg: json.error || 'Geri yükleme başarısız.' });
      }
    } catch {
      setRestoreResult({ ok: false, msg: 'Sunucuya bağlanılamadı.' });
    }
    setRestoreLoading(false);
  };

  const helpContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: '700', color: '#c2410c', marginBottom: '3px' }}>Dikkat</div>
          <div style={{ fontSize: '13px', color: '#7c2d12' }}>Buradaki değişiklikler tüm kullanıcılar için geçerli olur. Site adı ve logo, yükleme ekranında, navbar'da ve tarayıcı başlığında görünür.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#e0f2fe', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>🏷️</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Site Adı</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Uygulamanın adı — yükleme ekranında büyük yazı olarak, navbar'da küçük yazı olarak, tarayıcı sekmesinde ise başlık olarak görünür.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#f0fdf4', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>🖼️</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Logo</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>PNG, JPG veya SVG formatında yükleyin. En fazla <strong>500 KB</strong>. Yükleme ekranında büyük, navbar'da küçük olarak gösterilir. "✕ Kaldır" ile varsayılan 🍉 ikonuna döner.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#faf5ff', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>🔖</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Favicon</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Tarayıcı sekmesinde görünen küçük ikon. PNG veya ICO formatında yükleyin. En fazla <strong>200 KB</strong>, ideal boyut <strong>32×32 px</strong>.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#fff1f2', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>🔄</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Sıfırla</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>"Sıfırla" butonuna basarsanız site adı, logo ve favicon varsayılan değerlere döner. Bu işlem geri alınamaz.</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '18px' }}>💡</span>
        <div style={{ fontSize: '13px', color: '#166534' }}>Değişiklikler <strong>anında</strong> uygulanır. Sayfayı yenilemenize gerek yoktur.</div>
      </div>
    </div>
  );

  return (
    <div className="page-container wide">
      <PageHeader
        title="⚙️ Site Ayarları"
        sub="Sitenin adını, logosunu ve favicon'ını buradan yönetin."
        helpContent={helpContent}
      />

      {/* Uyarı Bandı */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px',
        padding: '14px 18px', maxWidth: '600px', marginBottom: '18px'
      }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>🚨</span>
        <div>
          <div style={{ fontWeight: '800', color: '#dc2626', fontSize: '14px', marginBottom: '2px' }}>Dikkat — Bu ayarlar tüm sistemi etkiler!</div>
          <div style={{ fontSize: '13px', color: '#b91c1c' }}>
            Site adı, logo ve favicon değiştirildiğinde tüm kullanıcılar için anında geçerli olur. Yanlış bir değişiklik görsel bozukluğa yol açabilir. Kaydetmeden önce iki kez kontrol edin.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      <div className="card excel-card" style={{ flex: '1 1 380px', minWidth: '320px' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
          <h2 className="toolbar-title">🎨 Görünüm Ayarları</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 4px 8px' }}>

          {/* Site Adı */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Site Adı
            </label>
            <input
              style={inputStyle}
              value={siteAdi}
              onChange={e => setSiteAdi(e.target.value)}
              placeholder="Bostan Manav"
            />
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Yükleme ekranında ve tarayıcı başlığında görünür.</div>
          </div>

          {/* Logo */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Logo <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(PNG / JPG / SVG — maks. 500 KB)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {logo ? (
                <img src={logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', padding: '6px' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', background: '#f8fafc' }}>🍉</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => logoRef.current && logoRef.current.click()}
                >
                  📂 Logo Seç
                </button>
                {logo && (
                  <button
                    onClick={() => setLogo('')}
                    style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                  >
                    ✕ Kaldır
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Yükleme ekranında ve navbar'da kullanılır.</div>
          </div>

          {/* Favicon */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Favicon <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(PNG / ICO — maks. 200 KB, ideal 32×32 px)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {favicon ? (
                <img src={favicon} alt="Favicon" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', padding: '4px' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: '#f8fafc' }}>🔖</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input ref={faviconRef} type="file" accept="image/*,.ico" style={{ display: 'none' }} onChange={handleFaviconChange} />
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => faviconRef.current && faviconRef.current.click()}
                >
                  📂 Favicon Seç
                </button>
                {favicon && (
                  <button
                    onClick={() => setFavicon('')}
                    style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                  >
                    ✕ Kaldır
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Tarayıcı sekmesinde görünen küçük ikon.</div>
          </div>

          {/* Mesaj */}
          {msg && (
            <div style={{
              padding: '11px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: msg.ok ? '#f0fdf4' : '#fef2f2',
              color: msg.ok ? '#15803d' : '#dc2626',
              border: `1px solid ${msg.ok ? '#86efac' : '#fca5a5'}`
            }}>
              {msg.ok ? '✅ ' : '❌ '}{msg.text}
            </div>
          )}

          {/* Kaydet + Sıfırla */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ minWidth: '160px', opacity: saving ? 0.7 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '⏳ Kaydediliyor...' : '💾 Ayarları Kaydet'}
            </button>
            <button
              onClick={handleReset}
              disabled={saving}
              style={{ padding: '10px 18px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              🔄 Sıfırla
            </button>
          </div>
        </div>
      </div>

      {/* VERİ YEDEKLEMESİ KARTI */}
      <div className="card excel-card" style={{ flex: '1 1 320px', minWidth: '280px' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
          <h2 className="toolbar-title">💾 Veri Yedekleme</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 4px 8px' }}>

          {/* Açıklama */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
              <span>�</span><span><strong>Excel</strong> — Seçtiğiniz tabloları ayrı sekmelerde indirir. Türkçe başlıklıdır.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
              <span>🗄️</span><span><strong>SQL</strong> — Tam veritabanı yedeği. Geri yükleme için önerilir.</span>
            </div>
          </div>

          {/* İNDİR */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '8px' }}>Yedeği İndir</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => { setRestoreResult(null); setShowExcelModal(true); }}
                disabled={backupLoading}
                style={{ padding: '11px 8px', borderRadius: '10px', border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontWeight: '700', fontSize: '13px', cursor: backupLoading ? 'not-allowed' : 'pointer', opacity: backupLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                {backupLoading ? '⏳' : '📊'} Excel İndir
              </button>
              <button
                onClick={handleBackupSql}
                disabled={backupLoading}
                style={{ padding: '11px 8px', borderRadius: '10px', border: '1.5px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontWeight: '700', fontSize: '13px', cursor: backupLoading ? 'not-allowed' : 'pointer', opacity: backupLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                {backupLoading ? '⏳' : '🗄️'} SQL İndir
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* GERİ YÜKLE */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '8px' }}>Yedekten Geri Yükle</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input ref={restoreExcelFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleRestoreExcelFile} />
              <button
                onClick={() => { setRestoreResult(null); restoreExcelFileRef.current?.click(); }}
                disabled={restoreLoading}
                style={{ padding: '11px 8px', borderRadius: '10px', border: '1.5px solid #bbf7d0', background: '#fff', color: '#15803d', fontWeight: '700', fontSize: '13px', cursor: restoreLoading ? 'not-allowed' : 'pointer', opacity: restoreLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                {restoreLoading ? '⏳' : '📊'} Excel Yükle
              </button>
              <input ref={restoreSqlFileRef} type="file" accept=".sql" style={{ display: 'none' }} onChange={handleRestoreSqlFile} />
              <button
                onClick={() => { setRestoreResult(null); restoreSqlFileRef.current?.click(); }}
                disabled={restoreLoading}
                style={{ padding: '11px 8px', borderRadius: '10px', border: '1.5px solid #c7d2fe', background: '#fff', color: '#4338ca', fontWeight: '700', fontSize: '13px', cursor: restoreLoading ? 'not-allowed' : 'pointer', opacity: restoreLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                {restoreLoading ? '⏳' : '🗄️'} SQL Yükle
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '8px', padding: '9px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <span style={{ fontSize: '13px', flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.5' }}>Geri yükleme <strong>mevcut tüm verilerin üzerine yazar</strong> ve geri alınamaz. Admin hesabı korunur.</span>
            </div>
          </div>

          {/* Sonuç */}
          {restoreResult && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: restoreResult.ok ? '#f0fdf4' : '#fef2f2', color: restoreResult.ok ? '#15803d' : '#dc2626', border: `1px solid ${restoreResult.ok ? '#86efac' : '#fca5a5'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {restoreResult.ok ? '✅' : '❌'} {restoreResult.msg}
            </div>
          )}

        </div>
      </div>

      </div>{/* /flex row */}

      {/* EXCEL TABLO SEÇİM MODALI */}
      {showExcelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowExcelModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            {/* Başlık */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', background: '#f0fdf4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📊</div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Excel Yedeği İndir</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>Hangi tabloları dahil etmek istiyorsunuz?</div>
                </div>
              </div>
              <button onClick={() => setShowExcelModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>

            {/* Tümünü seç/kaldır */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', marginTop: '6px' }}>
              {Object.values(excelSelections).every(Boolean)
                ? <button onClick={() => setExcelSelections(Object.fromEntries(ALL_SHEETS.map(s => [s.key, false])))} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Tümünü Kaldır</button>
                : <button onClick={() => setExcelSelections(Object.fromEntries(ALL_SHEETS.map(s => [s.key, true])))} style={{ fontSize: '12px', color: '#0369a1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Tümünü Seç</button>
              }
            </div>

            {/* Tablo listesi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {ALL_SHEETS.map(({ key, label, desc, icon }) => {
                const myDeps = collectDeps(key);          // bu seçilince zorunlu olan tablolar
                const neededBy = collectRequiredBy(key);  // bu kaldırılınca silinecek tablolar
                const isForced = ALL_SHEETS.some(s => excelSelections[s.key] && (DEPS[s.key] || []).includes(key)); // başka bir seçili tablo beni zorunlu kılıyor
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', border: `2px solid ${excelSelections[key] ? (isForced ? '#fbbf24' : '#86efac') : '#e2e8f0'}`, background: excelSelections[key] ? (isForced ? '#fffbeb' : '#f0fdf4') : '#f8fafc', cursor: 'pointer', transition: 'all .15s' }}>
                    <input
                      type="checkbox"
                      checked={excelSelections[key]}
                      onChange={ev => {
                        setExcelSelections(prev => {
                          const next = { ...prev, [key]: ev.target.checked };
                          if (ev.target.checked) {
                            // seçince bağımlılıkları da aç
                            collectDeps(key).forEach(d => { next[d] = true; });
                          } else {
                            // kaldırınca beni gerektirenleri de kapat
                            collectRequiredBy(key).forEach(d => { next[d] = false; });
                          }
                          return next;
                        });
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#22c55e', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {label}
                        {isForced && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', borderRadius: '5px', padding: '1px 6px', fontWeight: '600' }}>zorunlu</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{desc}</div>
                      {myDeps.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '3px' }}>
                          Gerektirir: {myDeps.map(d => ALL_SHEETS.find(s => s.key === d)?.label).join(', ')}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Resim uyarısı */}
            <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>🖼️</span>
              <span><strong>Ürün görselleri Excel'e dahil edilmez</strong> (Excel'in 32.767 karakter limiti aşılıyor). Görselleri de yedeklemek için <strong>SQL İndir</strong> seçeneğini kullanın.</span>
            </div>

            {/* Butonlar */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleExcelDownload}
                disabled={!Object.values(excelSelections).some(Boolean)}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', border: 'none', background: Object.values(excelSelections).some(Boolean) ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#e2e8f0', color: Object.values(excelSelections).some(Boolean) ? '#fff' : '#94a3b8', fontWeight: '800', fontSize: '14px', cursor: Object.values(excelSelections).some(Boolean) ? 'pointer' : 'not-allowed' }}
              >
                📥 Excel İndir ({Object.values(excelSelections).filter(Boolean).length} tablo)
              </button>
              <button onClick={() => setShowExcelModal(false)} style={{ padding: '13px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Onay Dialogu */}
      {restoreConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setRestoreConfirm(null)}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '28px 24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', textAlign: 'center', marginBottom: '8px' }}>Geri Yükleme Onayı</div>
            <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '20px', lineHeight: '1.6' }}>Tüm mevcut veriler silinip yedekteki verilerle değiştirilecek. Bu işlem <strong>geri alınamaz</strong>. Admin hesabı korunur.</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleRestoreConfirmed} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Evet, Geri Yükle</button>
              <button onClick={() => setRestoreConfirm(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
