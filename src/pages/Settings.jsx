import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

const KUR_TURU_LABEL = {
  doviz_alis: 'Döviz Alış',
  doviz_satis: 'Döviz Satış',
  efektif_alis: 'Efektif Alış',
  efektif_satis: 'Efektif Satış',
};

export default function Settings() {
  const { siteSettings, updateSiteSettings, products } = useData();

  const [siteAdi, setSiteAdi] = useState(siteSettings.site_adi || 'Bostan Manav');
  const [logo, setLogo] = useState(siteSettings.logo || '');
  const [favicon, setFavicon] = useState(siteSettings.favicon || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  // YEDEKLEME
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(null); // { type:'sql', payload:... }
  const [restoreResult, setRestoreResult] = useState(null);
  const restoreSqlFileRef = useRef(null);

  // ── Para Birimi ──────────────────────────────────────────
  const [paraBirimleri, setParaBirimleri] = useState([]);
  const [pbLoading, setPbLoading] = useState(false);
  const [pbMsg, setPbMsg] = useState(null);
  const [yeniPb, setYeniPb] = useState({ ad: '', kisa_ad: '', sembol: '', kur_tipi: 'manuel', kur: '', kur_turu: 'doviz_satis' });
  const [tcmbKurlar, setTcmbKurlar] = useState({});
  const [tcmbYukleniyor, setTcmbYukleniyor] = useState(false);
  const [apiGuncellemeYukleniyor, setApiGuncellemeYukleniyor] = useState({});
  const [tumunuGuncelleYukleniyor, setTumunuGuncelleYukleniyor] = useState(false);
  const [duzenlenenPb, setDuzenlenenPb] = useState(null); // { id, ad, kisa_ad, sembol, kur_tipi, kur }
  const [pbKaydetYukleniyor, setPbKaydetYukleniyor] = useState(false);
  const [pbSilOnay, setPbSilOnay] = useState(null); // { id, ad, kullananSayi }

  // pbMsg auto-dismiss
  useEffect(() => {
    if (!pbMsg) return;
    const t = setTimeout(() => setPbMsg(null), 3500);
    return () => clearTimeout(t);
  }, [pbMsg]);

  const paraBirimleriniYukle = useCallback(async () => {
    try {
      const r = await fetch('/api/para-birimleri');
      const data = await r.json();
      if (Array.isArray(data)) setParaBirimleri(data);
    } catch (e) { /* sessiz */ }
  }, []);

  useEffect(() => { paraBirimleriniYukle(); }, [paraBirimleriniYukle]);

  const tcmbKurlariCek = async () => {
    setTcmbYukleniyor(true);
    try {
      const r = await fetch('/api/tcmb-kur');
      const data = await r.json();
      if (data && typeof data === 'object' && !data.error) {
        // Backend eski düz format ({ USD: 38.8 }) veya yeni nested format
        // ({ USD: { doviz_alis, doviz_satis, efektif_alis, efektif_satis } }) döndürebilir.
        // Her iki formatı da normalize et.
        const normalized = {};
        for (const [kod, val] of Object.entries(data)) {
          if (typeof val === 'number' && val > 0) {
            // Eski düz format — tüm kur türlerine aynı değeri at
            normalized[kod] = { doviz_alis: val, doviz_satis: val, efektif_alis: val, efektif_satis: val };
          } else if (val && typeof val === 'object') {
            normalized[kod] = val;
          }
        }
        setTcmbKurlar(normalized);
      }
    } catch (e) { /* sessiz */ }
    setTcmbYukleniyor(false);
  };

  const handleYeniPbDegisim = (field, val) => {
    // kur_tipi 'api' seçilince otomatik TCMB getir
    if (field === 'kur_tipi' && val === 'api' && Object.keys(tcmbKurlar).length === 0) {
      tcmbKurlariCek();
    }
    setYeniPb(prev => {
      const updated = { ...prev, [field]: val };
      // API seçiliyse TCMB'den seçilen kur türüne göre öner
      const getKur = (kod, turu) => {
        const entry = tcmbKurlar[kod];
        return entry ? (entry[turu] || null) : null;
      };
      if (['kur_tipi', 'kisa_ad', 'kur_turu'].includes(field) && updated.kur_tipi === 'api' && updated.kisa_ad) {
        const kur = getKur(updated.kisa_ad.toUpperCase(), updated.kur_turu || 'doviz_satis');
        if (kur) updated.kur = kur.toString();
      }
      return updated;
    });
  };

  const handlePbEkle = async () => {
    if (!yeniPb.ad.trim() || !yeniPb.kisa_ad.trim() || !yeniPb.sembol.trim()) {
      return setPbMsg({ ok: false, text: 'Ad, kısa ad ve sembol zorunludur.' });
    }
    if (yeniPb.kur_tipi === 'manuel' && (!yeniPb.kur || isNaN(parseFloat(yeniPb.kur)))) {
      return setPbMsg({ ok: false, text: 'Geçerli bir kur değeri girin.' });
    }
    setPbLoading(true); setPbMsg(null);
    try {
      let kurDegeri = yeniPb.kur;
      if (yeniPb.kur_tipi === 'api') {
        const kod = yeniPb.kisa_ad.toUpperCase();
        const turu = yeniPb.kur_turu || 'doviz_satis';
        const entry = tcmbKurlar[kod];
        kurDegeri = (entry && entry[turu]) || 1;
      }
      const r = await fetch('/api/para-birimleri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...yeniPb, kur: kurDegeri }),
      });
      const data = await r.json();
      if (!r.ok) return setPbMsg({ ok: false, text: data.error || 'Eklenemedi.' });
      await paraBirimleriniYukle();
      setYeniPb({ ad: '', kisa_ad: '', sembol: '', kur_tipi: 'manuel', kur: '', kur_turu: 'doviz_satis' });
      setPbMsg({ ok: true, text: `${data.ad} eklendi.` });
    } catch (e) { setPbMsg({ ok: false, text: 'Sunucuya bağlanılamadı.' }); }
    setPbLoading(false);
  };

  const handlePbSil = (id) => {
    const pb = paraBirimleri.find(p => p.id === id);
    const kullananSayi = products.filter(p => p.para_birimi_id === id).length;
    setPbSilOnay({ id, ad: pb?.ad || '', kullananSayi });
  };

  const handlePbSilOnayla = async () => {
    const { id } = pbSilOnay;
    setPbSilOnay(null);
    try {
      const r = await fetch(`/api/para-birimleri/${id}`, { method: 'DELETE' });
      const data = await r.json();
      if (!r.ok) return setPbMsg({ ok: false, text: data.error || 'Silinemedi.' });
      await paraBirimleriniYukle();
      setPbMsg({ ok: true, text: 'Para birimi silindi.' });
    } catch (e) { setPbMsg({ ok: false, text: 'Sunucuya bağlanılamadı.' }); }
  };

  const handleTumunuGuncelle = async () => {
    const apiPbList = paraBirimleri.filter(p => p.kur_tipi === 'api');
    if (apiPbList.length === 0) return setPbMsg({ ok: false, text: 'Güncellenecek API tipi para birimi yok.' });
    setTumunuGuncelleYukleniyor(true);
    let hatalar = 0;
    for (const pb of apiPbList) {
      try {
        const r = await fetch(`/api/para-birimleri/${pb.id}/guncelle-api`, { method: 'PUT' });
        if (!r.ok) hatalar++;
      } catch (e) { hatalar++; }
    }
    await paraBirimleriniYukle();
    setTumunuGuncelleYukleniyor(false);
    if (hatalar === 0) setPbMsg({ ok: true, text: `${apiPbList.length} para birimi kuru başarıyla güncellendi.` });
    else setPbMsg({ ok: false, text: `${apiPbList.length - hatalar}/${apiPbList.length} para birimi güncellendi. ${hatalar} hata oluştu.` });
  };

  const handleApiGuncelle = async (pb) => {
    setApiGuncellemeYukleniyor(prev => ({ ...prev, [pb.id]: true }));
    try {
      const r = await fetch(`/api/para-birimleri/${pb.id}/guncelle-api`, { method: 'PUT' });
      const data = await r.json();
      if (!r.ok) { setPbMsg({ ok: false, text: data.error || 'Güncellenemedi.' }); }
      else { await paraBirimleriniYukle(); setPbMsg({ ok: true, text: `${pb.ad} kuru güncellendi: ${parseFloat(data.kur).toFixed(4)} ₺` }); }
    } catch (e) { setPbMsg({ ok: false, text: 'Sunucuya bağlanılamadı.' }); }
    setApiGuncellemeYukleniyor(prev => ({ ...prev, [pb.id]: false }));
  };

  const handlePbDuzenlemeAc = (pb) => {
    setDuzenlenenPb({ id: pb.id, ad: pb.ad, kisa_ad: pb.kisa_ad, sembol: pb.sembol, kur_tipi: pb.kur_tipi, kur: parseFloat(pb.kur).toString(), kur_turu: pb.kur_turu || 'doviz_satis' });
  };

  const handlePbKaydet = async () => {
    if (!duzenlenenPb) return;
    if (!duzenlenenPb.ad.trim() || !duzenlenenPb.kisa_ad.trim() || !duzenlenenPb.sembol.trim()) {
      return setPbMsg({ ok: false, text: 'Ad, kısa ad ve sembol zorunludur.' });
    }
    if (duzenlenenPb.kur_tipi === 'manuel' && (!duzenlenenPb.kur || isNaN(parseFloat(duzenlenenPb.kur)))) {
      return setPbMsg({ ok: false, text: 'Geçerli bir kur değeri girin.' });
    }
    setPbKaydetYukleniyor(true);
    try {
      let kurDegeri = duzenlenenPb.kur;
      if (duzenlenenPb.kur_tipi === 'api') {
        const kod = duzenlenenPb.kisa_ad.toUpperCase();
        const turu = duzenlenenPb.kur_turu || 'doviz_satis';
        const entry = tcmbKurlar[kod];
        kurDegeri = (entry && entry[turu]) || duzenlenenPb.kur;
      }
      const r = await fetch(`/api/para-birimleri/${duzenlenenPb.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...duzenlenenPb, kur: kurDegeri }),
      });
      const data = await r.json();
      if (!r.ok) { setPbMsg({ ok: false, text: data.error || 'Kaydedilemedi.' }); }
      else { await paraBirimleriniYukle(); setDuzenlenenPb(null); setPbMsg({ ok: true, text: `${duzenlenenPb.ad} güncellendi.` }); }
    } catch (e) { setPbMsg({ ok: false, text: 'Sunucuya bağlanılamadı.' }); }
    setPbKaydetYukleniyor(false);
  };

  const formatSonGuncelleme = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

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
      const r = await fetch('/api/restore-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: confirm.payload,
      });
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

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>💱 Para Birimi Yönetimi</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#eff6ff', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>➕</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>Para Birimi Ekle</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Ad, kısa ad (örn. USD) ve sembol girerek yeni para birimi tanımlayın. Kur tipini <strong>Manuel</strong> yaparsanız kuru kendiniz girersiniz; <strong>API (TCMB)</strong> seçerseniz kur otomatik güncellenir.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#faf5ff', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>📡</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>Kur Türü</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>API tipinde <strong>Döviz Alış / Döviz Satış / Efektif Alış / Efektif Satış</strong> seçeneklerinden birini seçin. Müşteri portalında fiyatın altında hangi kur türüyle hesaplandığı küçük yazıyla gösterilir.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#fff7ed', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>🔄</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>Kur Güncelleme</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}><strong>TCMB Kurlarını Getir</strong> ile günün resmi kurlarını çekin. <strong>Tümünü Güncelle</strong> ile API tipi tüm para birimlerini tek seferde kaydedin.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ background: '#fff1f2', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>Para Birimi Silme</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Bir para birimini silerseniz o para birimiyle etiketlenmiş ürünlerin fiyatları otomatik olarak <strong>güncel kur × fiyat</strong> şeklinde <strong>Türk Lirası</strong>'na dönüştürülür.</div>
          </div>
        </div>
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
        padding: '14px 18px', marginBottom: '18px'
      }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>🚨</span>
        <div>
          <div style={{ fontWeight: '800', color: '#dc2626', fontSize: '14px', marginBottom: '2px' }}>Dikkat — Bu ayarlar tüm sistemi etkiler!</div>
          <div style={{ fontSize: '13px', color: '#b91c1c' }}>
            Site adı, logo ve favicon değiştirildiğinde tüm kullanıcılar için anında geçerli olur. Yanlış bir değişiklik görsel bozukluğa yol açabilir. Kaydetmeden önce iki kez kontrol edin.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flexWrap: 'wrap' }}>

      <div className="card settings-card" style={{ flex: '1 1 320px', minWidth: 0, width: '100%' }}>
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

          {/* Logo + Favicon yan yana */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Logo */}
          <div style={{ flex: '1 1 180px' }}>
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
          <div style={{ flex: '1 1 180px' }}>
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

          </div>{/* /Logo + Favicon yan yana */}

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
      <div className="card settings-card" style={{ flex: '1 1 320px', minWidth: 0, width: '100%' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
          <h2 className="toolbar-title">💾 Veri Yedekleme</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 4px 8px' }}>

          {/* Açıklama */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
              <span>🗄️</span><span><strong>SQL</strong> — Tam veritabanı yedeği (tablolar, resimler, tüm veriler). Geri yükleme için önerilir.</span>
            </div>
          </div>

          {/* İNDİR */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '8px' }}>Yedeği İndir</div>
            <button
              onClick={handleBackupSql}
              disabled={backupLoading}
              style={{ width: '100%', padding: '11px 8px', borderRadius: '10px', border: '1.5px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontWeight: '700', fontSize: '13px', cursor: backupLoading ? 'not-allowed' : 'pointer', opacity: backupLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              {backupLoading ? '⏳' : '🗄️'} SQL İndir
            </button>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* GERİ YÜKLE */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '8px' }}>Yedekten Geri Yükle</div>
            <input ref={restoreSqlFileRef} type="file" accept=".sql" style={{ display: 'none' }} onChange={handleRestoreSqlFile} />
            <button
              onClick={() => { setRestoreResult(null); restoreSqlFileRef.current?.click(); }}
              disabled={restoreLoading}
              style={{ width: '100%', padding: '11px 8px', borderRadius: '10px', border: '1.5px solid #c7d2fe', background: '#fff', color: '#4338ca', fontWeight: '700', fontSize: '13px', cursor: restoreLoading ? 'not-allowed' : 'pointer', opacity: restoreLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              {restoreLoading ? '⏳' : '🗄️'} SQL Yükle
            </button>
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

      {/* PARA BİRİMİ YÖNETİMİ KARTI */}
      <div className="card" style={{ marginTop: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '18px' }}>
          <h2 className="toolbar-title">💱 Para Birimi Yönetimi</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {paraBirimleri.length > 0 && (
              <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', borderRadius: '8px', padding: '4px 10px' }}>
                🕐 Son kur güncellemesi: <strong>{formatSonGuncelleme(paraBirimleri.filter(p => p.kur_tipi === 'api' && p.son_guncelleme).sort((a, b) => new Date(b.son_guncelleme) - new Date(a.son_guncelleme))[0]?.son_guncelleme)}</strong>
              </span>
            )}
            <button
              onClick={handleTumunuGuncelle}
              disabled={tumunuGuncelleYukleniyor || paraBirimleri.filter(p => p.kur_tipi === 'api').length === 0}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontWeight: '700', fontSize: '12px', cursor: 'pointer', opacity: (tumunuGuncelleYukleniyor || paraBirimleri.filter(p => p.kur_tipi === 'api').length === 0) ? 0.5 : 1 }}
            >
              {tumunuGuncelleYukleniyor ? '⏳' : '🔄'} Tümünü Güncelle
            </button>
            <button
              onClick={tcmbKurlariCek}
              disabled={tcmbYukleniyor}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontWeight: '700', fontSize: '12px', cursor: 'pointer', opacity: tcmbYukleniyor ? 0.6 : 1 }}
            >
              {tcmbYukleniyor ? '⏳' : '📡'} TCMB Kurlarını Getir
            </button>
          </div>
        </div>

        {/* Mevcut para birimleri listesi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {paraBirimleri.map(pb => {
            const duzenleniyor = duzenlenenPb && duzenlenenPb.id === pb.id;
            if (duzenleniyor) return (
              <div key={pb.id} style={{ display: 'flex', gap: '8px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1.5px solid #86efac', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '2 1 130px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>Ad</div>
                  <input style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} value={duzenlenenPb.ad} onChange={e => setDuzenlenenPb(p => ({ ...p, ad: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 70px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>Kısa Ad</div>
                  <input style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} value={duzenlenenPb.kisa_ad} onChange={e => setDuzenlenenPb(p => ({ ...p, kisa_ad: e.target.value.toUpperCase() }))} maxLength={10} />
                </div>
                <div style={{ flex: '1 1 55px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>Sembol</div>
                  <input style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} value={duzenlenenPb.sembol} onChange={e => setDuzenlenenPb(p => ({ ...p, sembol: e.target.value }))} maxLength={5} />
                </div>
                <div style={{ flex: '1 1 130px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>Kur Tipi</div>
                  <select style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} value={duzenlenenPb.kur_tipi} onChange={e => setDuzenlenenPb(p => ({ ...p, kur_tipi: e.target.value }))}>
                    <option value="manuel">✋ Manuel</option>
                    <option value="api">📡 API (TCMB)</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>Kur Türü</div>
                  <select style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} value={duzenlenenPb.kur_turu || 'doviz_satis'} onChange={e => setDuzenlenenPb(p => ({ ...p, kur_turu: e.target.value }))}>
                    {Object.entries(KUR_TURU_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 100px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>Kur (₺)</div>
                  <input style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: duzenlenenPb.kur_tipi === 'api' ? '#f1f5f9' : '#fff' }} value={duzenlenenPb.kur} onChange={e => setDuzenlenenPb(p => ({ ...p, kur: e.target.value }))} disabled={duzenlenenPb.kur_tipi === 'api'} type="number" min="0" step="0.01" />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handlePbKaydet} disabled={pbKaydetYukleniyor} style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{pbKaydetYukleniyor ? '⏳' : '✔ Kaydet'}</button>
                  <button onClick={() => setDuzenlenenPb(null)} style={{ padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            );
            return (
              <div key={pb.id} onDoubleClick={() => pb.id !== 1 && handlePbDuzenlemeAc(pb)} title={pb.id !== 1 ? 'Düzenlemek için çift tıklayın' : ''} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: pb.id !== 1 ? 'default' : 'default' }}>
                <div style={{ fontWeight: '700', fontSize: '20px', width: '32px', textAlign: 'center', flexShrink: 0 }}>{pb.sembol}</div>
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{pb.ad}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{pb.kisa_ad} · {pb.kur_tipi === 'api' ? '📡 API (TCMB)' : '✋ Manuel'} · {KUR_TURU_LABEL[pb.kur_turu] || 'Döviz Satış'}</div>
                </div>
                {/* Güncelle önce, sonra fiyat */}
                {/* Güncelle butonu kaldırıldı — yukarıdaki Tümünü Güncelle kullanılır */}
                <div style={{ fontSize: '13px', color: '#475569', fontWeight: '700', width: '110px', textAlign: 'right', flexShrink: 0 }}>
                  {pb.id === 1 ? '— (Sabit)' : `${parseFloat(pb.kur).toFixed(4)} ₺`}
                </div>
                {pb.id !== 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePbSil(pb.id); }}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: '700', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Yeni para birimi ekleme formu */}
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1.5px dashed #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px' }}>Yeni Para Birimi Ekle</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 160px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Ad</label>
              <input
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                placeholder="Örn: Dolar"
                value={yeniPb.ad}
                onChange={e => handleYeniPbDegisim('ad', e.target.value)}
              />
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kısa Ad</label>
              <input
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                placeholder="USD"
                value={yeniPb.kisa_ad}
                onChange={e => handleYeniPbDegisim('kisa_ad', e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>
            <div style={{ flex: '1 1 70px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: yeniPb.sembol.trim() === '' && yeniPb.ad ? '#dc2626' : '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Sembol {yeniPb.sembol.trim() === '' && yeniPb.ad && <span style={{ fontSize: '10px', fontWeight: '600' }}>⚠️ Zorunlu!</span>}</label>
              <input
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${yeniPb.sembol.trim() === '' && yeniPb.ad ? '#fca5a5' : '#e2e8f0'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                placeholder="$, ₺, €..."
                value={yeniPb.sembol}
                onChange={e => handleYeniPbDegisim('sembol', e.target.value)}
                maxLength={5}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kur Tipi</label>
              <select
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                value={yeniPb.kur_tipi}
                onChange={e => handleYeniPbDegisim('kur_tipi', e.target.value)}
              >
                <option value="manuel">✋ Manuel</option>
                <option value="api">📡 API (TCMB)</option>
              </select>
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kur Türü</label>
              <select
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                value={yeniPb.kur_turu || 'doviz_satis'}
                onChange={e => handleYeniPbDegisim('kur_turu', e.target.value)}
              >
                {Object.entries(KUR_TURU_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kur (₺)</label>
              <input
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: yeniPb.kur_tipi === 'api' ? '#f1f5f9' : '#fff', color: yeniPb.kur_tipi === 'api' ? '#94a3b8' : '#0f172a' }}
                placeholder={yeniPb.kur_tipi === 'api' ? 'API\'den gelecek' : '35.00'}
                value={yeniPb.kur}
                onChange={e => handleYeniPbDegisim('kur', e.target.value)}
                disabled={yeniPb.kur_tipi === 'api'}
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <button
              onClick={handlePbEkle}
              disabled={pbLoading}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: pbLoading ? 0.7 : 1, whiteSpace: 'nowrap' }}
            >
              {pbLoading ? '⏳' : '➕ Ekle'}
            </button>
          </div>
          {yeniPb.kur_tipi === 'api' && Object.keys(tcmbKurlar).length === 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#f59e0b' }}>
              {tcmbYukleniyor ? '⏳ TCMB kurları çekiliyor...' : '⚠️ TCMB kurları henüz yüklenmedi. Yukarıdaki "🔄 Tümünü Güncelle" butonuna basın.'}
            </div>
          )}
          {yeniPb.kur_tipi === 'api' && yeniPb.kisa_ad && !tcmbKurlar[yeniPb.kisa_ad.toUpperCase()] && Object.keys(tcmbKurlar).length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>❌ "{yeniPb.kisa_ad}" TCMB'de bulunamadı. Mevcut kodlar: {Object.keys(tcmbKurlar).slice(0, 10).join(', ')}...</div>
          )}
          {yeniPb.kur_tipi === 'api' && yeniPb.kisa_ad && tcmbKurlar[yeniPb.kisa_ad.toUpperCase()] && (() => {
            const entry = tcmbKurlar[yeniPb.kisa_ad.toUpperCase()];
            const kur = entry[yeniPb.kur_turu || 'doviz_satis'];
            return kur
              ? <div style={{ marginTop: '8px', fontSize: '12px', color: '#15803d' }}>✅ TCMB {KUR_TURU_LABEL[yeniPb.kur_turu || 'doviz_satis']}: <strong>1 {yeniPb.kisa_ad.toUpperCase()} = {kur.toFixed(4)} ₺</strong></div>
              : <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>❌ Bu kur türü için TCMB verisi yok.</div>;
          })()}
        </div>

        {/* Mesaj */}
        {pbMsg && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: pbMsg.ok ? '#f0fdf4' : '#fef2f2', color: pbMsg.ok ? '#15803d' : '#dc2626', border: `1px solid ${pbMsg.ok ? '#86efac' : '#fca5a5'}` }}>
            {pbMsg.ok ? '✅ ' : '❌ '}{pbMsg.text}
          </div>
        )}
      </div>

      {/* Para Birimi Silme Onay Modali */}
      {pbSilOnay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPbSilOnay(null)}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '28px 24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', textAlign: 'center', marginBottom: '10px' }}>
              "{pbSilOnay.ad}" para birimini silmek üzeresisiniz
            </div>
            {pbSilOnay.kullananSayi > 0 ? (
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: '#92400e', lineHeight: '1.7', textAlign: 'center' }}>
                Bu para birimini kullanan <strong>{pbSilOnay.kullananSayi} ürün</strong> bulunmaktadır.<br />
                Silerseniz bu ürünler otomatik olarak <strong>Türk Lirası</strong>'na geçirilecektir.<br />
                <span style={{ color: '#b45309' }}>Kontrol etmeyi unutmayınız.</span>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: '#166534', textAlign: 'center', lineHeight: '1.6' }}>
                Bu para birimini kullanan hiçbir ürün bulunmamaktadır. Güvenle silebilirsiniz.
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handlePbSilOnayla} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Evet, Sil</button>
              <button onClick={() => setPbSilOnay(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
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
