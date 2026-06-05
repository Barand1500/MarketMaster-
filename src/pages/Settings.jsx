import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import SectionHelpButton from '../components/SectionHelpButton';
import '../styles/ExcelTable.css';

const KUR_TURU_LABEL = {
  doviz_alis: 'Döviz Alış',
  doviz_satis: 'Döviz Satış',
  efektif_alis: 'Efektif Alış',
  efektif_satis: 'Efektif Satış',
};

const DEFAULT_ISKONTO_SIRASI = ['urun', 'kategori', 'marka', 'musteri'];
const ISKONTO_LABELS = {
  urun:     { icon: '📦', label: 'Ürün İskontosu',     desc: 'Ürün kartına doğrudan tanımlanan iskonto' },
  kategori: { icon: '📁', label: 'Kategori İskontosu', desc: 'Ürünün ait olduğu kategoriye tanımlanan iskonto' },
  marka:    { icon: '🏷️', label: 'Marka İskontosu',    desc: 'Ürünün markasına tanımlanan iskonto' },
  musteri:  { icon: '👤', label: 'Müşteri İskontosu',  desc: 'Müşteriye doğrudan tanımlanan kişisel iskonto' },
};

export default function Settings() {
  const { siteSettings, updateSiteSettings, products, categories, markalar, fetchData } = useData();

  const [siteAdi, setSiteAdi] = useState(siteSettings.site_adi || 'Bostan Manav');
  const [logo, setLogo] = useState(siteSettings.logo || '');
  const [favicon, setFavicon] = useState(siteSettings.favicon || '');
  const [varsayilanGorselTipi, setVarsayilanGorselTipi] = useState(siteSettings.varsayilan_gorsel_tipi || 'elma');
  const [varsayilanGorselUrl, setVarsayilanGorselUrl] = useState(siteSettings.varsayilan_gorsel_url || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  // ── İskonto Öncelik Sırası ──────────────────────────────────────────
  const parseIskontoSirasi = (raw) => {
    if (!raw) return DEFAULT_ISKONTO_SIRASI;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === 4 && arr.every(k => ISKONTO_LABELS[k])) return arr;
    } catch {}
    return DEFAULT_ISKONTO_SIRASI;
  };
  const [iskontoSirasi, setIskontoSirasi] = useState(() => parseIskontoSirasi(siteSettings?.iskonto_sirasi));
  const [iskontoSirasiDirty, setIskontoSirasiDirty] = useState(false);
  const [iskontoUyariModal, setIskontoUyariModal] = useState(false);
  const [iskontoKaydetYukleniyor, setIskontoKaydetYukleniyor] = useState(false);
  const [iskontoKaydetMsg, setIskontoKaydetMsg] = useState(null);
  const iskontoDragItem = useRef(null);
  const iskontoDragOver = useRef(null);
  const [iskontoDragIdx, setIskontoDragIdx] = useState(null);

  useEffect(() => {
    if (siteSettings?.iskonto_sirasi) setIskontoSirasi(parseIskontoSirasi(siteSettings.iskonto_sirasi));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSettings?.iskonto_sirasi]);

  const handleIskontoMove = (from, to) => {
    const arr = [...iskontoSirasi];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setIskontoSirasi(arr);
    setIskontoSirasiDirty(true);
  };

  const handleIskontoSirasiKaydet = async () => {
    setIskontoUyariModal(false);
    setIskontoKaydetYukleniyor(true);
    setIskontoKaydetMsg(null);
    const result = await updateSiteSettings({ iskonto_sirasi: JSON.stringify(iskontoSirasi) });
    if (result.success) {
      setIskontoKaydetMsg({ ok: true, text: 'İndirim sıralaması başarıyla kaydedildi.' });
      setIskontoSirasiDirty(false);
    } else {
      setIskontoKaydetMsg({ ok: false, text: result.error || 'Kaydedilemedi.' });
    }
    setIskontoKaydetYukleniyor(false);
  };

  // GÖRSEL SAKLAMA
  const [gorselTipi, setGorselTipi] = useState(siteSettings?.gorsel_kayit_tipi || 'veritabani');
  const [gorselDurum, setGorselDurum] = useState(null);
  const [gorselOnayModal, setGorselOnayModal] = useState(null); // { hedef }
  const [gorselMigrasyonSonuc, setGorselMigrasyonSonuc] = useState(null);
  const [gorselMigrasyonYukleniyor, setGorselMigrasyonYukleniyor] = useState(false);

  // Sayfa yüklenince DB'den doğrudan oku (Ctrl+Shift+R sonrası doğru değeri göster)
  useEffect(() => {
    fetch('/api/ayarlar').then(r => r.json()).then(data => {
      if (data.gorsel_kayit_tipi) setGorselTipi(data.gorsel_kayit_tipi);
    }).catch(() => {});
  }, []);

  // DataContext siteSettings güncellenince de sync et
  useEffect(() => {
    if (siteSettings?.gorsel_kayit_tipi) setGorselTipi(siteSettings.gorsel_kayit_tipi);
  }, [siteSettings?.gorsel_kayit_tipi]);

  const refreshGorselDurum = () =>
    fetch('/api/gorsel-durum')
      .then(r => r.json())
      .then(setGorselDurum)
      .catch(() => setGorselDurum({ urunDb: 0, urunDosya: 0, markaDb: 0, markaDosya: 0 }));

  useEffect(() => { refreshGorselDurum(); }, []);

  const kaydetGorselTercih = async (hedef) => {
    await updateSiteSettings({ gorsel_kayit_tipi: hedef });
    setGorselTipi(hedef);
  };

  // sadeceTercih: true → sadece kaydet, false → migrate et
  const handleGorselOnay = async (sadeceTercih) => {
    const { hedef } = gorselOnayModal;
    setGorselOnayModal(null);
    if (sadeceTercih) {
      await kaydetGorselTercih(hedef);
      setGorselMigrasyonSonuc({ ok: true, text: 'Tercih kaydedildi.' });
      return;
    }
    setGorselMigrasyonYukleniyor(true);
    setGorselMigrasyonSonuc(null);
    try {
      const endpoint = hedef === 'dosya' ? '/api/migrate-gorsel' : '/api/migrate-gorsel-geri';
      const r = await fetch(endpoint, { method: 'POST' });
      const data = await r.json();
      await kaydetGorselTercih(hedef);
      await refreshGorselDurum();
      if (data.ok) {
        setGorselMigrasyonSonuc({ ok: true, urunSayisi: data.urunSayisi, markaSayisi: data.markaSayisi, hata: data.hata });
      } else {
        setGorselMigrasyonSonuc({ ok: false, text: data.error || 'Geçiş sırasında bir hata oluştu. Tercih yine de kaydedildi.' });
      }
    } catch {
      await kaydetGorselTercih(hedef);
      await refreshGorselDurum();
      setGorselMigrasyonSonuc({ ok: false, text: 'Sunucu yanıt vermedi — görseller taşınmamış olabilir. Tercih kaydedildi.' });
    }
    setGorselMigrasyonYukleniyor(false);
  };

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

  // ── Fiyat Tanımları ──────────────────────────────────────────
  const [fiyatTanimlari, setFiyatTanimlari] = useState([]);
  // ftInline: inline cell editing { id, editingField:'ad'|'tarihi', adVal, basVal, bitVal }
  const [ftInline, setFtInline] = useState(null);
  // ftAddForm: inline add row { ad, bas, bit } | null
  const [ftAddForm, setFtAddForm] = useState(null);
  const [ftAddSaving, setFtAddSaving] = useState(false);
  const [ftAddErr, setFtAddErr] = useState('');

  const saveFtInline = async () => {
    if (!ftInline) return;
    const existing = fiyatTanimlari.find(x => x.id === ftInline.id);
    if (!existing) { setFtInline(null); return; }
    const adVal = (ftInline.editingField === 'ad' ? ftInline.adVal : existing.ad) || '';
    if (!adVal.trim()) { setFtInline(null); return; }
    const body = {
      ad: adVal.trim(),
      baslangic_tarihi: ftInline.editingField === 'tarihi' ? (ftInline.basVal || null) : (existing.baslangic_tarihi ? existing.baslangic_tarihi.slice(0, 10) : null),
      bitis_tarihi: ftInline.editingField === 'tarihi' ? (ftInline.bitVal || null) : (existing.bitis_tarihi ? existing.bitis_tarihi.slice(0, 10) : null),
    };
    try {
      const r = await fetch(`/api/fiyat-tanimlari/${ftInline.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) setFiyatTanimlari(prev => prev.map(x => x.id === ftInline.id ? { ...x, ...body } : x));
    } catch {}
    setFtInline(null);
  };

  const saveFtAdd = async () => {
    if (!ftAddForm || !ftAddForm.ad.trim()) { setFtAddErr('Ad zorunludur.'); return; }
    setFtAddSaving(true); setFtAddErr('');
    try {
      const r = await fetch('/api/fiyat-tanimlari', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad: ftAddForm.ad.trim(), baslangic_tarihi: ftAddForm.bas || null, bitis_tarihi: ftAddForm.bit || null }) });
      if (r.ok) {
        const fresh = await fetch('/api/fiyat-tanimlari').then(x => x.ok ? x.json() : []);
        setFiyatTanimlari(Array.isArray(fresh) ? fresh : []);
        setFtAddForm(null);
      }
    } catch { setFtAddErr('Kaydedilemedi.'); }
    setFtAddSaving(false);
  };

  useEffect(() => {
    fetch('/api/fiyat-tanimlari').then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) setFiyatTanimlari(data);
    }).catch(() => {});
  }, []);

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
    // Aynı kisa_ad zaten ekliyse engelle
    const mevcutKisaAd = yeniPb.kisa_ad.trim().toUpperCase();
    if (paraBirimleri.some(p => p.kisa_ad.toUpperCase() === mevcutKisaAd)) {
      return setPbMsg({ ok: false, text: `"${mevcutKisaAd}" zaten ekli. Aynı döviz kodu birden fazla eklenemez.` });
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
    if (apiPbList.length === 0) return setPbMsg({ ok: false, text: 'Güncellenecek TCMB tipi para birimi yok.' });
    setTumunuGuncelleYukleniyor(true);
    // Önce TCMB'den güncel kurları çek (form preview için de kullanılır)
    await tcmbKurlariCek();
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
  const varsayilanGorselRef = useRef(null);
  const markaLogoRef = useRef(null); // Yeni marka logo ref
  const markaDuzenleLogoRef = useRef(null); // Düzenleme için marka logo ref

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

  const handleVarsayilanGorselChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setMsg({ ok: false, text: 'Görsel dosyası en fazla 500 KB olabilir.' }); return; }
    const b64 = await readFileAsBase64(file);
    setVarsayilanGorselUrl(b64);
    e.target.value = '';
  };

  const handleMarkaLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { 
      setYonetimMsg({ ok: false, text: 'Logo dosyası en fazla 500 KB olabilir.' }); 
      return; 
    }
    const b64 = await readFileAsBase64(file);
    setYeniMarkaGorsel(b64);
    e.target.value = '';
  };

  const handleMarkaDuzenleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { 
      setYonetimMsg({ ok: false, text: 'Logo dosyası en fazla 500 KB olabilir.' }); 
      return; 
    }
    const b64 = await readFileAsBase64(file);
    setMarkaDuzenle(s => ({ ...s, gorsel: b64 }));
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!siteAdi.trim()) return setMsg({ ok: false, text: 'Site adı boş bırakılamaz.' });
    setSaving(true); setMsg(null);
    const result = await updateSiteSettings({ site_adi: siteAdi, logo, favicon, varsayilan_gorsel_tipi: varsayilanGorselTipi, varsayilan_gorsel_url: varsayilanGorselUrl });
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

  // ── Yönetim: Kategori ve Marka Yönetimi ──────────────────────────────────────────
  const [yonetimMsg, setYonetimMsg] = useState(null); // { ok, text }
  const [yeniKategori, setYeniKategori] = useState('');
  const [yeniUstKategoriId, setYeniUstKategoriId] = useState(null);
  const [yeniMarka, setYeniMarka] = useState('');
  const [yeniMarkaGorsel, setYeniMarkaGorsel] = useState(''); // Logo URL
  const [kategoriDuzenle, setKategoriDuzenle] = useState(null); // { id, ad }
  const [markaDuzenle, setMarkaDuzenle] = useState(null); // { id, ad, gorsel }
  const [draggedKategori, setDraggedKategori] = useState(null);
  const [draggedMarka, setDraggedMarka] = useState(null);
  const [lokalKategoriler, setLokalKategoriler] = useState([]);
  const [lokalMarkalar, setLokalMarkalar] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set()); // Kapalı kategoriler
  
  // Kategori seçici için state'ler
  const [katSeciciAcik, setKatSeciciAcik] = useState(false); // Yeni kategori için
  const [katSeciciDuzenleAcik, setKatSeciciDuzenleAcik] = useState(false); // Düzenle için
  const [katSeciciArama, setKatSeciciArama] = useState('');
  const katSeciciRef = useRef(null);
  const katSeciciDuzenleRef = useRef(null);

  // Kategori/Marka sıralaması için lokal state'i güncelle
  useEffect(() => {
    if (categories) {
      // Backend'den gelen field adı: kategori_adi
      setLokalKategoriler([...categories].map(k => ({ id: k.id, ad: k.kategori_adi, sira: k.sira || 0, parentId: k.parentId })).sort((a, b) => a.sira - b.sira));
    }
  }, [categories]);
  useEffect(() => {
    if (markalar) setLokalMarkalar([...markalar].sort((a, b) => (a.sira || 0) - (b.sira || 0)));
  }, [markalar]);

  const handleKategoriEkle = async () => {
    if (!yeniKategori.trim()) return;
    console.log('🆕 Kategori Ekleme:', { kategori_adi: yeniKategori.trim(), ust_kategori_id: yeniUstKategoriId });
    try {
      const r = await fetch('/api/kategoriler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori_adi: yeniKategori.trim(), ust_kategori_id: yeniUstKategoriId })
      });
      const data = await r.json();
      console.log('✅ Kategori Ekleme Yanıtı:', data);
      if (r.ok) {
        setYonetimMsg({ ok: true, text: 'Kategori eklendi.' });
        setYeniKategori('');
        setYeniUstKategoriId(null);
        await fetchData();
      } else {
        console.error('❌ Kategori Ekleme Hatası:', data.error);
        setYonetimMsg({ ok: false, text: data.error || 'Eklenemedi.' });
      }
    } catch (err) {
      console.error('❌ Kategori Ekleme Sunucu Hatası:', err);
      setYonetimMsg({ ok: false, text: 'Sunucu hatası: ' + err.message });
    }
  };

  const handleMarkaEkle = async () => {
    if (!yeniMarka.trim()) return;
    try {
      const r = await fetch('/api/markalar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: yeniMarka.trim(), gorsel: yeniMarkaGorsel || null })
      });
      const data = await r.json();
      if (r.ok) {
        setYonetimMsg({ ok: true, text: 'Marka eklendi.' });
        setYeniMarka('');
        setYeniMarkaGorsel('');
        await fetchData();
      } else {
        setYonetimMsg({ ok: false, text: data.error || 'Eklenemedi.' });
      }
    } catch {
      setYonetimMsg({ ok: false, text: 'Sunucu hatası.' });
    }
  };

  const handleKategoriGuncelle = async () => {
    if (!kategoriDuzenle || !kategoriDuzenle.ad.trim()) return;
    
    // Kategori kendi üst kategorisi olamaz
    if (kategoriDuzenle.parentId === kategoriDuzenle.id) {
      setYonetimMsg({ ok: false, text: 'Kategori kendi üst kategorisi olamaz.' });
      return;
    }
    
    // Circular dependency kontrolü (bir kategori kendi child'ının child'ı olamaz)
    const wouldCreateCycle = (parentId, childId) => {
      if (!parentId) return false;
      if (parentId === childId) return true;
      const parent = lokalKategoriler.find(k => k.id === parentId);
      if (!parent) return false;
      return wouldCreateCycle(parent.parentId, childId);
    };
    
    if (wouldCreateCycle(kategoriDuzenle.parentId, kategoriDuzenle.id)) {
      setYonetimMsg({ ok: false, text: 'Bir kategori, kendi alt kategorilerinden birinin altına taşınamaz.' });
      return;
    }

    try {
      const r = await fetch(`/api/kategoriler/${kategoriDuzenle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          kategori_adi: kategoriDuzenle.ad.trim(), 
          ust_kategori_id: kategoriDuzenle.parentId || null 
        })
      });
      const data = await r.json();
      if (r.ok) {
        setYonetimMsg({ ok: true, text: 'Kategori güncellendi.' });
        setKategoriDuzenle(null);
        await fetchData();
      } else {
        setYonetimMsg({ ok: false, text: data.error || 'Güncellenemedi.' });
      }
    } catch {
      setYonetimMsg({ ok: false, text: 'Sunucu hatası.' });
    }
  };

  const handleMarkaGuncelle = async () => {
    if (!markaDuzenle || !markaDuzenle.ad.trim()) return;
    try {
      const r = await fetch(`/api/markalar/${markaDuzenle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: markaDuzenle.ad.trim(), gorsel: markaDuzenle.gorsel || null })
      });
      const data = await r.json();
      if (r.ok) {
        setYonetimMsg({ ok: true, text: 'Marka güncellendi.' });
        setMarkaDuzenle(null);
        await fetchData();
      } else {
        setYonetimMsg({ ok: false, text: data.error || 'Güncellenemedi.' });
      }
    } catch {
      setYonetimMsg({ ok: false, text: 'Sunucu hatası.' });
    }
  };

  const handleKategoriSil = async (id) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    try {
      const r = await fetch(`/api/kategoriler/${id}`, { method: 'DELETE' });
      const data = await r.json();
      if (r.ok) {
        setYonetimMsg({ ok: true, text: 'Kategori silindi.' });
        await fetchData();
      } else {
        setYonetimMsg({ ok: false, text: data.error || 'Silinemedi.' });
      }
    } catch {
      setYonetimMsg({ ok: false, text: 'Sunucu hatası.' });
    }
  };

  const handleMarkaSil = async (id) => {
    if (!confirm('Bu markayı silmek istediğinizden emin misiniz?')) return;
    try {
      const r = await fetch(`/api/markalar/${id}`, { method: 'DELETE' });
      const data = await r.json();
      if (r.ok) {
        setYonetimMsg({ ok: true, text: 'Marka silindi.' });
        await fetchData();
      } else {
        setYonetimMsg({ ok: false, text: data.error || 'Silinemedi.' });
      }
    } catch {
      setYonetimMsg({ ok: false, text: 'Sunucu hatası.' });
    }
  };

  const handleKategoriSiralamaKaydet = async () => {
    console.log('💾 Kategori Sıralama Kaydı Başlatılıyor...');
    console.log('📦 Gönderilecek Kategoriler:', lokalKategoriler.map(k => ({ id: k.id, ad: k.ad, parentId: k.parentId, mevcutSira: k.sira })));
    try {
      // Her kategorinin mevcut sira değerini kullan (swap edilmiş değerler korunsun)
      const updates = lokalKategoriler.map(kat => {
        const payload = { kategori_adi: kat.ad, ust_kategori_id: kat.parentId || null, sira: kat.sira };
        console.log(`🔄 Kategori ${kat.id} güncelleniyor:`, payload);
        return fetch(`/api/kategoriler/${kat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(async res => {
          const data = await res.json();
          console.log(`${res.ok ? '✅' : '❌'} Kategori ${kat.id} yanıtı:`, data);
          if (!res.ok) throw new Error(`Kategori ${kat.id}: ${data.error || res.statusText}`);
          return data;
        });
      });
      await Promise.all(updates);
      console.log('✅ Tüm kategori sıraları başarıyla kaydedildi');
      setYonetimMsg({ ok: true, text: 'Kategori sıralaması kaydedildi.' });
      await fetchData();
    } catch (err) {
      console.error('❌ Kategori Sıralama Hatası:', err.message);
      setYonetimMsg({ ok: false, text: 'Sıralama kaydedilemedi: ' + err.message });
    }
  };

  const handleMarkaSiralamaKaydet = async () => {
    console.log('💾 Marka Sıralama Kaydı Başlatılıyor...');
    console.log('📦 Gönderilecek Markalar:', lokalMarkalar.map((m, idx) => ({ id: m.id, ad: m.ad, yeniSira: idx })));
    try {
      const updates = lokalMarkalar.map((mrk, idx) => {
        const payload = { ad: mrk.ad, gorsel: mrk.gorsel || null, sira: idx };
        console.log(`🔄 Marka ${mrk.id} güncelleniyor:`, payload);
        return fetch(`/api/markalar/${mrk.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(async res => {
          const data = await res.json();
          console.log(`${res.ok ? '✅' : '❌'} Marka ${mrk.id} yanıtı:`, data);
          if (!res.ok) throw new Error(`Marka ${mrk.id}: ${data.error || res.statusText}`);
          return data;
        });
      });
      await Promise.all(updates);
      console.log('✅ Tüm marka sıraları başarıyla kaydedildi');
      setYonetimMsg({ ok: true, text: 'Marka sıralaması kaydedildi.' });
      await fetchData();
    } catch (err) {
      console.error('❌ Marka Sıralama Hatası:', err.message);
      setYonetimMsg({ ok: false, text: 'Sıralama kaydedilemedi: ' + err.message });
    }
  };

  const moveKategori = (fromIdx, toIdx) => {
    const hierarchicalList = buildHierarchicalList();
    const draggedItem = hierarchicalList[fromIdx];
    const targetItem = hierarchicalList[toIdx];
    
    // Aynı parent'a sahip olup olmadıklarını kontrol et
    if (draggedItem.parentId !== targetItem.parentId) {
      setYonetimMsg({ ok: false, text: 'Sadece aynı seviyedeki kategoriler arasında sıralama yapabilirsiniz. Farklı seviyeye taşımak için düzenleme modunda üst kategori seçin.' });
      return;
    }

    // Aynı parent içindeki kardeş kategorileri al
    const siblings = lokalKategoriler.filter(k => k.parentId === draggedItem.parentId);
    const draggedSibling = siblings.find(k => k.id === draggedItem.id);
    const targetSibling = siblings.find(k => k.id === targetItem.id);
    
    // Sira değerlerini swap et
    const tempSira = draggedSibling.sira;
    draggedSibling.sira = targetSibling.sira;
    targetSibling.sira = tempSira;
    
    // Tüm kategori listesini güncelle
    const arr = lokalKategoriler.map(k => {
      if (k.id === draggedSibling.id) return { ...k, sira: draggedSibling.sira };
      if (k.id === targetSibling.id) return { ...k, sira: targetSibling.sira };
      return k;
    });
    setLokalKategoriler(arr);
  };

  // Hiyerarşik kategori listesi oluştur (ana kategoriler ve altlarındakiler sıralı)
  const buildHierarchicalList = () => {
    const result = [];
    const addChildren = (parentId, depth = 0) => {
      if (depth > 10) return; // Sonsuz döngü koruması
      const children = lokalKategoriler
        .filter(k => k.parentId === parentId)
        .sort((a, b) => a.sira - b.sira);
      children.forEach(child => {
        result.push(child);
        addChildren(child.id, depth + 1);
      });
    };
    // Önce root kategorileri ekle
    const roots = lokalKategoriler
      .filter(k => !k.parentId || k.parentId === null)
      .sort((a, b) => a.sira - b.sira);
    roots.forEach(root => {
      result.push(root);
      addChildren(root.id, 1);
    });
    return result;
  };

  // Kategori hierarchy yardımcı fonksiyonlar
  const getLevel = (katId) => {
    let level = 0;
    let current = lokalKategoriler.find(k => k.id === katId);
    while (current && current.parentId) {
      level++;
      current = lokalKategoriler.find(k => k.id === current.parentId);
      if (level > 10) break; // Sonsuz döngü koruması
    }
    return level;
  };

  const hasChildren = (katId) => {
    return lokalKategoriler.some(k => k.parentId === katId);
  };

  const isAnyParentCollapsed = (katId) => {
    let current = lokalKategoriler.find(k => k.id === katId);
    while (current && current.parentId) {
      if (collapsedCategories.has(current.parentId)) return true;
      current = lokalKategoriler.find(k => k.id === current.parentId);
    }
    return false;
  };

  const toggleCollapse = (katId) => {
    const newSet = new Set(collapsedCategories);
    if (newSet.has(katId)) {
      newSet.delete(katId);
    } else {
      newSet.add(katId);
    }
    setCollapsedCategories(newSet);
  };

  const moveMarka = (fromIdx, toIdx) => {
    const arr = [...lokalMarkalar];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    setLokalMarkalar(arr);
  };

  // Kategori seçici dropdown render
  const renderKategoriSecici = (seciliId, onSelect, isOpen, setIsOpen, dropRef, excludeId = null) => {
    const filtrelenmisKategoriler = lokalKategoriler
      .filter(k => k.id !== excludeId) // Düzenlenirken kendi kategorisini hariç tut
      .filter(k => katSeciciArama === '' || k.ad.toLowerCase().includes(katSeciciArama.toLowerCase()))
      .sort((a, b) => {
        const siraA = a.sira !== undefined ? a.sira : 0;
        const siraB = b.sira !== undefined ? b.sira : 0;
        if (siraA !== siraB) return siraA - siraB;
        return a.ad.localeCompare(b.ad);
      });

    const seciliKategori = lokalKategoriler.find(k => k.id === seciliId);
    const getKategoriYol = (kat) => {
      if (!kat) return '';
      if (!kat.parentId) return kat.ad;
      const parent = lokalKategoriler.find(k => k.id === kat.parentId);
      return parent ? `${getKategoriYol(parent)} › ${kat.ad}` : kat.ad;
    };

    // Hiyerarşik liste oluştur
    const buildHiyerarsikListe = () => {
      const parents = filtrelenmisKategoriler.filter(k => !k.parentId);
      const result = [];
      parents.forEach(p => {
        result.push({ ...p, level: 0 });
        const children = filtrelenmisKategoriler.filter(k => k.parentId === p.id);
        children.forEach(c => result.push({ ...c, level: 1 }));
      });
      // Orphan'ları ekle
      filtrelenmisKategoriler.filter(k => k.parentId && !lokalKategoriler.find(p => p.id === k.parentId)).forEach(k => {
        result.push({ ...k, level: 0 });
      });
      return result;
    };

    return (
      <div ref={dropRef} style={{ position: 'relative', width: '100%' }}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            fontSize: '12px',
            fontWeight: '600',
            border: '1.5px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            outline: 'none',
            color: seciliId ? '#0f172a' : '#94a3b8',
            cursor: 'pointer',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {seciliId ? getKategoriYol(seciliKategori) : 'Ana Kategori (üst kategori yok)'}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '8px' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </div>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              zIndex: 100,
              maxHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Arama kutusu */}
            <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <input
                autoFocus
                type="text"
                placeholder="Kategori ara..."
                value={katSeciciArama}
                onChange={e => setKatSeciciArama(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Kategoriler listesi */}
            <div style={{ overflowY: 'auto', maxHeight: '240px' }}>
              {/* Ana Kategori seçeneği */}
              <div
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                  setKatSeciciArama('');
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: !seciliId ? 'var(--primary)' : '#64748b',
                  background: !seciliId ? '#f0fdf4' : '#fff',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (seciliId) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (seciliId) e.currentTarget.style.background = '#fff'; }}
              >
                <span style={{ fontSize: '14px' }}>🏠</span>
                <span>Ana Kategori</span>
                {!seciliId && <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>}
              </div>

              {/* Kategoriler */}
              {buildHiyerarsikListe().length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                  Sonuç bulunamadı
                </div>
              ) : (
                buildHiyerarsikListe().map(kat => (
                  <div
                    key={kat.id}
                    onClick={() => {
                      onSelect(kat.id);
                      setIsOpen(false);
                      setKatSeciciArama('');
                    }}
                    style={{
                      padding: '8px 12px',
                      paddingLeft: `${12 + kat.level * 20}px`,
                      fontSize: '12px',
                      fontWeight: '500',
                      color: seciliId === kat.id ? 'var(--primary)' : '#0f172a',
                      background: seciliId === kat.id ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (seciliId !== kat.id) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (seciliId !== kat.id) e.currentTarget.style.background = '#fff'; }}
                  >
                    <span style={{ fontSize: '14px' }}>{kat.level > 0 ? '↳' : '📁'}</span>
                    <span style={{ flex: 1 }}>{kat.ad}</span>
                    {seciliId === kat.id && <span style={{ color: 'var(--primary)' }}>✓</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (katSeciciRef.current && !katSeciciRef.current.contains(e.target)) {
        setKatSeciciAcik(false);
        setKatSeciciArama('');
      }
      if (katSeciciDuzenleRef.current && !katSeciciDuzenleRef.current.contains(e.target)) {
        setKatSeciciDuzenleAcik(false);
        setKatSeciciArama('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <SectionHelpButton title="Görünüm Ayarları" content={helpContent} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 4px 8px' }}>

          {/* Site Adı + Varsayılan Görsel yan yana */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            {/* Site Adı */}
            <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
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

            {/* Varsayılan Ürün Görseli */}
            <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Varsayılan Ürün Görseli
              </label>
              <select
                style={inputStyle}
                value={varsayilanGorselTipi}
                onChange={e => {
                  setVarsayilanGorselTipi(e.target.value);
                  if (e.target.value !== 'ozel') setVarsayilanGorselUrl('');
                }}
              >
                <option value="elma">🍎 Elma</option>
                <option value="kutu">📦 Paket</option>
                <option value="ozel">🖼️ Özel Resim</option>
              </select>
              {varsayilanGorselTipi === 'ozel' && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {varsayilanGorselUrl ? (
                    <img src={varsayilanGorselUrl} alt="Varsayılan" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', padding: '4px' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: '#f8fafc' }}>📷</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input ref={varsayilanGorselRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleVarsayilanGorselChange} />
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => varsayilanGorselRef.current && varsayilanGorselRef.current.click()}
                    >
                      📂 Seç
                    </button>
                    {varsayilanGorselUrl && (
                      <button
                        onClick={() => setVarsayilanGorselUrl('')}
                        style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Resmi olmayan ürünlerde gösterilir.</div>
            </div>

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
          <SectionHelpButton title="Veri Yedekleme" content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #4338ca' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🗄️ SQL Yedek İndir</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Tüm veritabanını (tablolar, görseller, veriler) tek bir SQL dosyasına indirir. Sunucu göçü veya yedekleme için önerilir.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #0891b2' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔄 Geri Yükleme</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Yaptığınız SQL yedeğini aynı ekrandan geri yükleyebilirsiniz. Geri yükleme mevcut verilerin üzerine yazar.</div>
              </div>
            </div>
          } />
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
              {tumunuGuncelleYukleniyor ? '⏳ Güncelleniyor...' : '🔄 Tümünü Güncelle'}
            </button>
            <SectionHelpButton title="Para Birimi Yönetimi" content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Para Birimi Ekle</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ad, kısa ad (örn. USD) ve sembol girerek yeni para birimi tanımlayın. Kur tipini <strong>Manuel</strong> yaparsınız kuru kendiniz girersiniz; <strong>TCMB</strong> seçerseniz kur otomatik güncellenir.</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📡 Kur Türü</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>API tipinde <strong>Döviz Alış / Döviz Satış / Efektif Alış / Efektif Satış</strong> seçeneklerinden birini seçin.</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #0891b2' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔄 Kur Güncelleme</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}><strong>Tümünü Güncelle</strong> ile API tipi tüm para birimlerini tek seferde TCMB'den çekin.</div>
                </div>
                <div style={{ background: '#fff5f5', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>⚠️ Para Birimi Silme</div>
                  <div style={{ fontSize: '13px', color: '#b91c1c', lineHeight: '1.6' }}>Bir para birimini silerseniz o para birimiyle etiketlenmiş ürünlerin fiyatları otomatik olarak <strong>Türk Lirası</strong>'na dönüştürülür.</div>
                </div>
              </div>
            } />
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
                    <option value="api">📡 TCMB</option>
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
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{pb.kisa_ad} · {pb.kur_tipi === 'api' ? '📡 TCMB' : '✋ Manuel'} · {KUR_TURU_LABEL[pb.kur_turu] || 'Döviz Satış'}</div>
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
                <option value="api">📡 TCMB</option>
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
              className="lite-add-btn"
              title="Para birimi ekle"
              style={{ opacity: pbLoading ? 0.7 : 1, flexShrink: 0, alignSelf: 'flex-end', marginBottom: '1px' }}
            >
              {pbLoading ? '⏳' : '+'}
            </button>
          </div>
          {yeniPb.kur_tipi === 'api' && Object.keys(tcmbKurlar).length === 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#f59e0b' }}>
              {tcmbYukleniyor ? '⏳ TCMB kurları çekiliyor...' : '⚠️ TCMB kurları henüz yüklenmedi. Yukarıdaki "🔄 Tümünü Güncelle" butonuna basarak kurları çekin.'}
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

      {/* GÖRSEL SAKLAMA KARTI */}
      <div className="card settings-card" style={{ flex: '1 1 320px', minWidth: 0, width: '100%' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '18px' }}>
          <h2 className="toolbar-title">🖼️ Görsel Saklama</h2>
          <SectionHelpButton title="Görsel Saklama" content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontWeight: '700', color: '#1d4ed8', marginBottom: '4px' }}>🗄️ Veritabanı Modu</div>
                Görseller base64 formatında doğrudan veritabanına yazılır. Kurulum gerektirmez, taşınabilirdir. Ancak çok sayıda görsel olduğunda veritabanı boyutu büyüyebilir ve sayfa yükleme hızı düşebilir.
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>📁 Dosya Sistemi Modu</div>
                Görseller sunucudaki <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>/uploads/</code> klasörüne kaydedilir, veritabanında sadece dosya yolu tutulur. Veritabanı küçük kalır ve yükleme çok daha hızlı olur.
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontWeight: '700', color: '#374151', marginBottom: '4px' }}>🔄 Yöntem Değiştirme</div>
                Bir yöntemden diğerine geçerken <strong>mevcut görselleri taşı</strong> seçeneği ile tüm eski görseller yeni sisteme aktarılır.
              </div>
            </div>
          } />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Mevcut dağılım sayaçları */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>🗄️</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' }}>Veritabanında</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e40af', lineHeight: 1 }}>
                {gorselDurum ? gorselDurum.urunDb + gorselDurum.markaDb : '—'}
              </div>
              <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>
                {gorselDurum ? `${gorselDurum.urunDb} ürün · ${gorselDurum.markaDb} marka` : 'Yükleniyor…'}
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>📁</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Dosyada</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#166534', lineHeight: 1 }}>
                {gorselDurum ? gorselDurum.urunDosya + gorselDurum.markaDosya : '—'}
              </div>
              <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '2px' }}>
                {gorselDurum ? `${gorselDurum.urunDosya} ürün · ${gorselDurum.markaDosya} marka` : 'Yükleniyor…'}
              </div>
            </div>
          </div>

          {/* Tercih seçimi — tıklanınca modal açılır */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Saklama Yöntemi</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { val: 'veritabani', icon: '🗄️', label: 'Veritabanı', desc: 'base64, taşınabilir', color: '#3b82f6', bg: '#eff6ff' },
                { val: 'dosya', icon: '📁', label: 'Dosya Sistemi', desc: 'hızlı, DB küçük', color: '#22c55e', bg: '#f0fdf4' },
              ].map(opt => {
                const active = gorselTipi === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => { if (!active) setGorselOnayModal({ hedef: opt.val }); }}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: '10px',
                      cursor: active ? 'default' : 'pointer', textAlign: 'left',
                      border: `2px solid ${active ? opt.color : '#e2e8f0'}`,
                      background: active ? opt.bg : '#f8fafc',
                      transition: 'all 0.15s', outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                      <span style={{ fontWeight: '700', fontSize: '12px', color: active ? opt.color : '#374151' }}>{opt.label}</span>
                      {active && <span style={{ marginLeft: 'auto', fontSize: '9px', background: opt.color, color: '#fff', borderRadius: '5px', padding: '1px 6px', fontWeight: '800', letterSpacing: '0.5px' }}>AKTİF</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Yükleniyor */}
          {gorselMigrasyonYukleniyor && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '9px', padding: '10px 12px', fontSize: '12px', color: '#854d0e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏳</span> Görseller taşınıyor, sayfadan ayrılmayın…
            </div>
          )}

          {/* Sonuç */}
          {gorselMigrasyonSonuc && (
            <div style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '12px', fontWeight: '600', background: gorselMigrasyonSonuc.ok ? '#f0fdf4' : '#fef2f2', color: gorselMigrasyonSonuc.ok ? '#15803d' : '#dc2626', border: `1px solid ${gorselMigrasyonSonuc.ok ? '#86efac' : '#fca5a5'}`, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <span>{gorselMigrasyonSonuc.ok ? '✅' : '⚠️'}</span>
              <span>
                {gorselMigrasyonSonuc.ok && gorselMigrasyonSonuc.urunSayisi !== undefined
                  ? `Taşındı: ${gorselMigrasyonSonuc.urunSayisi} ürün, ${gorselMigrasyonSonuc.markaSayisi} marka.${gorselMigrasyonSonuc.hata > 0 ? ` (${gorselMigrasyonSonuc.hata} hata)` : ''}`
                  : gorselMigrasyonSonuc.text}
              </span>
            </div>
          )}


        </div>
      </div>

      {/* FİYAT TANIMLARI KARTI */}
      <div className="card settings-card" style={{ flex: '1 1 320px', minWidth: 0, width: '100%' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '18px' }}>
          <h2 className="toolbar-title">🏷️ Fiyat Tanımları</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            <button
              className="lite-add-btn"
              onClick={() => { setFtAddForm({ ad: '', bas: '', bit: '' }); setFtAddErr(''); }}
              title="Yeni fiyat tanımı ekle"
            >+</button>
            <SectionHelpButton title="Fiyat Tanımları" content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📌 Fiyat Tanımı Nedir?</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Müşterilere uygulanan özel fiyat gruplarıdır. Örneğin “Toptan”, “Bayi”, “VIP” gibi tanımlar oluşturabilirsiniz.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Tanım Ekleme</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>“+ Yeni” butonuna basın, ad ve geçerlilik tarihi aralığını girin. Müşteri sayfasından bu tanımı müşterilere atayabilirsiniz.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🗑️ Silme</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Bir fiyat tanımı silindicinde o tanıma atanmış tüm müşterilerin fiyat tipi otomatik olarak temizlenir.</div>
              </div>
            </div>
            } />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '10px' }}>
          {fiyatTanimlari.length === 0 && !ftAddForm && (
            <div style={{ gridColumn: '1/-1', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Henüz fiyat tanımı eklenmemiş.</div>
          )}
          {fiyatTanimlari.map(ft => {
            const isInline = ftInline?.id === ft.id;
            return (
              <div key={ft.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', minWidth: 0 }}>
                {/* Sil butonu */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`"${ft.ad}" fiyat tanımını silmek istiyor musunuz?`)) return;
                    const r = await fetch(`/api/fiyat-tanimlari/${ft.id}`, { method: 'DELETE' });
                    if (r.ok) setFiyatTanimlari(prev => prev.filter(x => x.id !== ft.id));
                  }}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px', zIndex: 1 }}
                  title="Sil"
                >×</button>
                {/* İsim */}
                {isInline && ftInline.editingField === 'ad' ? (
                  <input
                    autoFocus
                    style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', border: '1.5px solid var(--primary)', borderRadius: '6px', padding: '3px 8px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                    value={ftInline.adVal}
                    onChange={e => setFtInline(s => ({ ...s, adVal: e.target.value }))}
                    onBlur={saveFtInline}
                    onKeyDown={e => { if (e.key === 'Enter') saveFtInline(); if (e.key === 'Escape') setFtInline(null); }}
                  />
                ) : (
                  <div
                    onDoubleClick={() => setFtInline({ id: ft.id, editingField: 'ad', adVal: ft.ad, basVal: ft.baslangic_tarihi ? ft.baslangic_tarihi.slice(0, 10) : '', bitVal: ft.bitis_tarihi ? ft.bitis_tarihi.slice(0, 10) : '' })}
                    style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', cursor: 'text', paddingRight: '20px', lineHeight: 1.3 }}
                    title="Çift tıklayarak düzenle"
                  >{ft.ad}</div>
                )}
                {/* Tarih */}
                {isInline && ftInline.editingField === 'tarihi' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input type="date" style={{ fontSize: '11px', border: '1.5px solid var(--primary)', borderRadius: '6px', padding: '2px 6px', outline: 'none', width: '100%', boxSizing: 'border-box' }} value={ftInline.basVal} onChange={e => setFtInline(s => ({ ...s, basVal: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') saveFtInline(); if (e.key === 'Escape') setFtInline(null); }} />
                    <input type="date" style={{ fontSize: '11px', border: '1.5px solid var(--primary)', borderRadius: '6px', padding: '2px 6px', outline: 'none', width: '100%', boxSizing: 'border-box' }} value={ftInline.bitVal} onChange={e => setFtInline(s => ({ ...s, bitVal: e.target.value }))} onBlur={saveFtInline} onKeyDown={e => { if (e.key === 'Enter') saveFtInline(); if (e.key === 'Escape') setFtInline(null); }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={saveFtInline} style={{ flex: 1, background: 'var(--primary)', border: 'none', color: '#fff', borderRadius: '5px', padding: '3px 0', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>✓</button>
                      <button onClick={() => setFtInline(null)} style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '5px', padding: '3px 0', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => setFtInline({ id: ft.id, editingField: 'tarihi', adVal: ft.ad, basVal: ft.baslangic_tarihi ? ft.baslangic_tarihi.slice(0, 10) : '', bitVal: ft.bitis_tarihi ? ft.bitis_tarihi.slice(0, 10) : '' })}
                    style={{ fontSize: '11px', color: '#94a3b8', cursor: 'text', lineHeight: 1.5 }}
                    title="Çift tıklayarak tarihleri düzenle"
                  >
                    {(ft.baslangic_tarihi || ft.bitis_tarihi)
                      ? <><span>{ft.baslangic_tarihi ? new Date(ft.baslangic_tarihi).toLocaleDateString('tr-TR') : '—'}</span><br /><span style={{ fontSize: '10px', color: '#cbd5e1' }}>→</span><span> {ft.bitis_tarihi ? new Date(ft.bitis_tarihi).toLocaleDateString('tr-TR') : '—'}</span></>
                      : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Tarih aralığı yok</span>
                    }
                  </div>
                )}
                {/* Müşteri sayısı */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: 'auto' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Kullanan Müşteri</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{ft.kullanan_sayi ?? 0}</div>
                </div>
              </div>
            );
          })}
          {/* Satır içi yeni ekleme formu */}
          {ftAddForm && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid var(--primary)', borderRadius: '14px', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--primary)', marginBottom: '2px' }}>Yeni Fiyat Tanımı</div>
              <input
                autoFocus
                style={{ fontSize: '13px', fontWeight: '700', border: '1.5px solid var(--primary)', borderRadius: '6px', padding: '5px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                placeholder="Tanım adı... *"
                value={ftAddForm.ad}
                onChange={e => setFtAddForm(s => ({ ...s, ad: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') saveFtAdd(); if (e.key === 'Escape') setFtAddForm(null); }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Başlangıç</label>
                <input type="date" style={{ fontSize: '11px', border: '1px solid #d1fae5', borderRadius: '6px', padding: '4px 6px', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }} value={ftAddForm.bas} onChange={e => setFtAddForm(s => ({ ...s, bas: e.target.value }))} />
                <label style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Bitiş</label>
                <input type="date" style={{ fontSize: '11px', border: '1px solid #d1fae5', borderRadius: '6px', padding: '4px 6px', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }} value={ftAddForm.bit} onChange={e => setFtAddForm(s => ({ ...s, bit: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') saveFtAdd(); }} />
              </div>
              {ftAddErr && <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>❌ {ftAddErr}</div>}
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button onClick={saveFtAdd} disabled={ftAddSaving} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer', opacity: ftAddSaving ? 0.7 : 1 }}>{ftAddSaving ? '...' : 'Kaydet'}</button>
                <button onClick={() => { setFtAddForm(null); setFtAddErr(''); }} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #d1fae5', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>İptal</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Ad veya tarihe çift tıklayarak düzenleyebilirsiniz.</div>
      </div>

      {/* İNDİRİM ÖNCELİK SIRASI KARTI */}
      <div className="card" style={{ marginTop: '0' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
          <div>
            <h2 className="toolbar-title">🎯 İndirim Öncelik Sırası</h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>Birden fazla iskonto tanımlandığında hangisinin önce uygulanacağını belirleyin.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {iskontoSirasiDirty && (
              <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24', borderRadius: '8px', padding: '3px 10px', fontWeight: '700' }}>⚠️ Kaydedilmemiş değişiklik</span>
            )}
            <SectionHelpButton title="İndirim Öncelik Sırası" content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #7c3aed' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🎯 Sıralama Mantığı</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Bir ürüne birden fazla iskonto tanımlıysa sistem bu listedeki sırayı takip eder. En üstteki kaynakta iskonto varsa diğerlerine bakılmaz; yoksa bir alta geçilir.</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #059669' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📎 Sıralamayı Değiştirme</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Satırları <strong>sürükle-bırak</strong> ile yeniden sıralayabilirsiniz. İsterseniz sağdaki <strong>▲ ▼</strong> oklarla da taşıyabilirsiniz. Değişiklik yaptıktan sonra “Sıralamayı Kaydet” butonuna bastığınızda bir onay ekranı çıkar; onayla<br />dıktan sonra kayıt gerçekleşir.</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #0891b2' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>💎 Özel Fiyat Listesi (Sabit)</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>En üste sabitlenmiş “Özel Fiyat Listesi” her zaman en yüksek önceliktedir ve sıralamanın dışındadır. Müşteriye doğrudan atanmış fiyat listesi varsa bu sıralama devreye girmez.</div>
                </div>
                <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>⚠️ Önemli</div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Sıralamayı kaydetmeniz müşteri portalındaki tüm fiyat görüntülemelerini <strong>anlık olarak etkiler</strong></div>
                </div>
              </div>
            } />
          </div>
        </div>

        {/* P1 — her zaman en üstte, sabit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', marginBottom: '8px', opacity: 0.85 }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>1</div>
          <span style={{ fontSize: '18px' }}>💎</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#15803d' }}>Özel Fiyat Listesi</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Müşteriye atanmış fiyat listesindeki iskonto — her zaman en yüksek öncelik, değiştirilemez</div>
          </div>
          <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', padding: '2px 8px', fontWeight: '800', letterSpacing: '0.4px' }}>SABİT</span>
        </div>

        {/* Sıralanabilir 4 katman */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {iskontoSirasi.map((key, idx) => {
            const info = ISKONTO_LABELS[key];
            return (
              <div
                key={key}
                draggable
                onDragStart={() => { iskontoDragItem.current = idx; setIskontoDragIdx(idx); }}
                onDragEnter={() => { iskontoDragOver.current = idx; }}
                onDragOver={e => e.preventDefault()}
                onDragEnd={() => {
                  if (iskontoDragItem.current !== null && iskontoDragOver.current !== null && iskontoDragItem.current !== iskontoDragOver.current) {
                    handleIskontoMove(iskontoDragItem.current, iskontoDragOver.current);
                  }
                  iskontoDragItem.current = null;
                  iskontoDragOver.current = null;
                  setIskontoDragIdx(null);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', background: iskontoDragIdx === idx ? '#f0fdf4' : '#f8fafc',
                  border: `1.5px solid ${iskontoDragIdx === idx ? 'var(--primary)' : '#e2e8f0'}`,
                  borderRadius: '12px', cursor: 'grab', transition: 'all 0.15s', userSelect: 'none',
                  opacity: iskontoDragIdx === idx ? 0.7 : 1,
                }}
              >
                <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>{idx + 2}</div>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>⋮⋮</span>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{info.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{info.label}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{info.desc}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <button
                    onClick={() => idx > 0 && handleIskontoMove(idx, idx - 1)}
                    disabled={idx === 0}
                    style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid #e2e8f0', background: idx === 0 ? '#f8fafc' : '#fff', color: idx === 0 ? '#cbd5e1' : '#475569', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}
                    title="Yukarı taşı"
                  >▲</button>
                  <button
                    onClick={() => idx < iskontoSirasi.length - 1 && handleIskontoMove(idx, idx + 1)}
                    disabled={idx === iskontoSirasi.length - 1}
                    style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid #e2e8f0', background: idx === iskontoSirasi.length - 1 ? '#f8fafc' : '#fff', color: idx === iskontoSirasi.length - 1 ? '#cbd5e1' : '#475569', cursor: idx === iskontoSirasi.length - 1 ? 'default' : 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}
                    title="Aşağı taşı"
                  >▼</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mesaj */}
        {iskontoKaydetMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '12px', background: iskontoKaydetMsg.ok ? '#f0fdf4' : '#fef2f2', color: iskontoKaydetMsg.ok ? '#15803d' : '#dc2626', border: `1px solid ${iskontoKaydetMsg.ok ? '#86efac' : '#fca5a5'}` }}>
            {iskontoKaydetMsg.ok ? '✅ ' : '❌ '}{iskontoKaydetMsg.text}
          </div>
        )}

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIskontoUyariModal(true)}
            disabled={!iskontoSirasiDirty || iskontoKaydetYukleniyor}
            className="btn-primary"
            style={{ minWidth: '180px', opacity: (!iskontoSirasiDirty || iskontoKaydetYukleniyor) ? 0.5 : 1, cursor: (!iskontoSirasiDirty || iskontoKaydetYukleniyor) ? 'not-allowed' : 'pointer' }}
          >
            {iskontoKaydetYukleniyor ? '⏳ Kaydediliyor...' : '💾 Sıralamayı Kaydet'}
          </button>
          {iskontoSirasiDirty && (
            <button
              onClick={() => { setIskontoSirasi(parseIskontoSirasi(siteSettings?.iskonto_sirasi)); setIskontoSirasiDirty(false); setIskontoKaydetMsg(null); }}
              style={{ padding: '10px 18px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >↩ Geri Al</button>
          )}
        </div>
      </div>

      {/* YÖNETİM KARTI */}
      <div className="card" style={{ marginTop: '0' }}>
        <div className="table-header-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
          <h2 className="toolbar-title">⚙️ Yönetim</h2>
          <SectionHelpButton title="Kategori ve Marka Yönetimi" content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📁 Kategori Yönetimi</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Yeni kategori adını yazıp <strong>➕ Ekle</strong> butonuna basın. Alt kategori eklemek için önce üst kategoriyi seçin. Kategorileri <strong>sürükle-bırak</strong> ile sıralayıp <strong>💾 Sıralamayı Kaydet</strong> ile kaydedin.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🔽 Açma/Kapatma</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Alt kategorisi olan kategorilerde <strong>▶/▼</strong> ikonu görünür. Tıklayarak alt kategorileri gösterebilir veya gizleyebilirsiniz. Üst kategoriyi taşırsanız alt kategoriler de takip eder.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Kategori Düzenleme</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Kategori adına <strong>çift tıklayın</strong>, düzenleme modu açılır. Adı değiştirip <strong>✓</strong> ile kaydedin veya <strong>✕</strong> ile iptal edin. <strong>🗑️</strong> butonu ile kategoriyi silebilirsiniz.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🏷️ Marka Yönetimi</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Yeni marka adını ve opsiyonel olarak <strong>Logo URL</strong> girin, <strong>➕ Ekle</strong> ile kaydedin. Markaları sürükle-bırak ile sıralayabilirsiniz. Düzenlemek için <strong>✏️</strong> ikonuna tıklayın.</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🖼️ Marka Logosu</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Marka eklerken veya düzenlerken <strong>Logo URL</strong> alanına görsel bağlantısı yapıştırın. Logo otomatik olarak önizlenir ve müşteri portalında gösterilir.</div>
              </div>
              <div style={{ background: '#fff5f5', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>⚠️ Silme İşlemi</div>
                <div style={{ fontSize: '13px', color: '#b91c1c', lineHeight: '1.6' }}>Bir kategori veya marka silmeden önce onay istenecektir. Silinen kategoriye veya markaya bağlı ürünler etkilenmez, sadece bağlantı kopar.</div>
              </div>
              <div className="help-tip">
                <strong>💡 İpucu:</strong> Sıralama değişikliklerini mutlaka <strong>💾 Sıralamayı Kaydet</strong> butonu ile kaydedin, aksi halde müşteri ekranına yansımaz.
              </div>
            </div>
          } />
        </div>

        {/* Mesaj */}
        {yonetimMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px', background: yonetimMsg.ok ? '#f0fdf4' : '#fef2f2', color: yonetimMsg.ok ? '#15803d' : '#dc2626', border: `1px solid ${yonetimMsg.ok ? '#86efac' : '#fca5a5'}` }}>
            {yonetimMsg.ok ? '✅ ' : '❌ '}{yonetimMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

          {/* KATEGORİ YÖNETİMİ */}
          <div style={{ flex: '1 1 400px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📁</span>
              Kategori Yönetimi
            </div>

            {/* Yeni Kategori Ekle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ flex: 1, fontSize: '13px', fontWeight: '600', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', outline: 'none' }}
                  placeholder="Yeni kategori adı..."
                  value={yeniKategori}
                  onChange={e => setYeniKategori(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleKategoriEkle(); }}
                />
                <button
                  onClick={handleKategoriEkle}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  ➕ Ekle
                </button>
              </div>
              
              {/* Üst Kategori Seçici */}
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '2px', marginTop: '4px' }}>
                📂 Üst Kategori Seç (İsteğe Bağlı)
              </div>
              {renderKategoriSecici(
                yeniUstKategoriId,
                (id) => setYeniUstKategoriId(id),
                katSeciciAcik,
                setKatSeciciAcik,
                katSeciciRef
              )}
            </div>

            {/* Kategoriler Listesi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
              {buildHierarchicalList().map((kat, idx) => {
                const level = getLevel(kat.id);
                const hasChild = hasChildren(kat.id);
                const isCollapsed = collapsedCategories.has(kat.id);
                const isHidden = isAnyParentCollapsed(kat.id);

                if (isHidden) return null; // Parent kapalıysa bu kategoriyi gizle

                return (
                <div
                  key={kat.id}
                  draggable={!kategoriDuzenle}
                  onDragStart={() => setDraggedKategori(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (draggedKategori !== null && draggedKategori !== idx) {
                      moveKategori(draggedKategori, idx);
                    }
                    setDraggedKategori(null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 12px',
                    paddingLeft: `${12 + level * 24}px`, // Hierarchical indentation
                    background: '#fff',
                    border: '1.5px solid #e2e8f0', borderRadius: '10px',
                    cursor: kategoriDuzenle ? 'default' : 'grab',
                    opacity: draggedKategori === idx ? 0.5 : 1
                  }}
                >
                  {/* Açma/Kapatma İkonu */}
                  {hasChild ? (
                    <span
                      onClick={() => toggleCollapse(kat.id)}
                      style={{
                        fontSize: '12px', color: '#64748b', cursor: 'pointer',
                        userSelect: 'none', flexShrink: 0, width: '16px', textAlign: 'center'
                      }}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                  ) : (
                    <span style={{ width: '16px', flexShrink: 0 }}></span>
                  )}

                  <span style={{ fontSize: '14px', color: '#94a3b8', flexShrink: 0 }}>⋮⋮</span>
                  {kategoriDuzenle?.id === kat.id ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          autoFocus
                          style={{ flex: 1, fontSize: '13px', fontWeight: '600', border: '1.5px solid var(--primary)', borderRadius: '6px', padding: '6px 10px', outline: 'none' }}
                          value={kategoriDuzenle.ad}
                          onChange={e => setKategoriDuzenle(s => ({ ...s, ad: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleKategoriGuncelle(); if (e.key === 'Escape') setKategoriDuzenle(null); }}
                        />
                        <button onClick={handleKategoriGuncelle} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setKategoriDuzenle(null)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                      </div>
                      
                      {/* Üst Kategori Seçici (Düzenle) */}
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        📂 Üst Kategori
                      </div>
                      {renderKategoriSecici(
                        kategoriDuzenle.parentId,
                        (id) => setKategoriDuzenle(s => ({ ...s, parentId: id })),
                        katSeciciDuzenleAcik,
                        setKatSeciciDuzenleAcik,
                        katSeciciDuzenleRef,
                        kategoriDuzenle.id // Kendi kategorisini hariç tut
                      )}
                    </div>
                  ) : (
                    <>
                      <span
                        onDoubleClick={() => setKategoriDuzenle({ id: kat.id, ad: kat.ad, parentId: kat.parentId })}
                        style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: '#0f172a', cursor: 'text' }}
                      >
                        {kat.ad}
                      </span>
                      <button onClick={() => handleKategoriSil(kat.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                    </>
                  )}
                </div>
                );
              })}
            </div>

            <button
              onClick={handleKategoriSiralamaKaydet}
              style={{ marginTop: '12px', width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              💾 Sıralamayı Kaydet
            </button>
          </div>

          {/* MARKA YÖNETİMİ */}
          <div style={{ flex: '1 1 400px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🏷️</span>
              Marka Yönetimi
            </div>

            {/* Yeni Marka Ekle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ flex: 1, fontSize: '13px', fontWeight: '600', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', outline: 'none' }}
                  placeholder="Yeni marka adı..."
                  value={yeniMarka}
                  onChange={e => setYeniMarka(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleMarkaEkle(); }}
                />
                <button
                  onClick={handleMarkaEkle}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  ➕ Ekle
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={markaLogoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleMarkaLogoChange}
                />
                <button
                  onClick={() => markaLogoRef.current.click()}
                  style={{ flex: 1, fontSize: '12px', fontWeight: '600', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                >
                  📷 Logo Seç (İsteğe Bağlı)
                </button>
                {yeniMarkaGorsel && (
                  <>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid #e2e8f0', flexShrink: 0 }}>
                      <img src={yeniMarkaGorsel} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} onError={e => e.target.style.display = 'none'} />
                    </div>
                    <button
                      onClick={() => setYeniMarkaGorsel('')}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Markalar Listesi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
              {lokalMarkalar.map((mrk, idx) => (
                <div
                  key={mrk.id}
                  draggable={!markaDuzenle}
                  onDragStart={() => setDraggedMarka(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (draggedMarka !== null && draggedMarka !== idx) {
                      moveMarka(draggedMarka, idx);
                    }
                    setDraggedMarka(null);
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    padding: '10px 12px', background: '#fff',
                    border: '1.5px solid #e2e8f0', borderRadius: '10px',
                    cursor: markaDuzenle ? 'default' : 'grab',
                    opacity: draggedMarka === idx ? 0.5 : 1
                  }}
                >
                  {markaDuzenle?.id === mrk.id ? (
                    <>
                      {/* Düzenleme Modu */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#94a3b8', flexShrink: 0 }}>⋮⋮</span>
                        <input
                          autoFocus
                          style={{ flex: 1, fontSize: '13px', fontWeight: '600', border: '1.5px solid var(--primary)', borderRadius: '6px', padding: '6px 10px', outline: 'none' }}
                          placeholder="Marka adı"
                          value={markaDuzenle.ad}
                          onChange={e => setMarkaDuzenle(s => ({ ...s, ad: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleMarkaGuncelle(); if (e.key === 'Escape') setMarkaDuzenle(null); }}
                        />
                        <button onClick={handleMarkaGuncelle} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setMarkaDuzenle(null)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '30px' }}>
                        <input
                          ref={markaDuzenleLogoRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleMarkaDuzenleLogoChange}
                        />
                        <button
                          onClick={() => markaDuzenleLogoRef.current.click()}
                          style={{ flex: 1, fontSize: '11px', fontWeight: '600', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                        >
                          📷 {markaDuzenle.gorsel ? 'Logoyu Değiştir' : 'Logo Seç'}
                        </button>
                        {markaDuzenle.gorsel && (
                          <>
                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid #e2e8f0', flexShrink: 0 }}>
                              <img src={markaDuzenle.gorsel} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} onError={e => e.target.style.display = 'none'} />
                            </div>
                            <button
                              onClick={() => setMarkaDuzenle(s => ({ ...s, gorsel: '' }))}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Görüntüleme Modu */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#94a3b8', flexShrink: 0 }}>⋮⋮</span>
                        {mrk.gorsel && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid #e2e8f0', flexShrink: 0 }}>
                            <img src={mrk.gorsel} alt={mrk.ad} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} onError={e => e.target.style.display = 'none'} />
                          </div>
                        )}
                        <span
                          onDoubleClick={() => setMarkaDuzenle({ id: mrk.id, ad: mrk.ad, gorsel: mrk.gorsel || '' })}
                          style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: '#0f172a', cursor: 'text' }}
                        >
                          {mrk.ad}
                        </span>
                        <button onClick={() => setMarkaDuzenle({ id: mrk.id, ad: mrk.ad, gorsel: mrk.gorsel || '' })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleMarkaSil(mrk.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleMarkaSiralamaKaydet}
              style={{ marginTop: '12px', width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              💾 Sıralamayı Kaydet
            </button>
          </div>

        </div>
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

      {/* Görsel Saklama Onay Modali */}
      {gorselOnayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setGorselOnayModal(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            {/* İkon + Başlık */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: gorselOnayModal.hedef === 'dosya' ? '#f0fdf4' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {gorselOnayModal.hedef === 'dosya' ? '📁' : '🗄️'}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                  {gorselOnayModal.hedef === 'dosya' ? 'Dosya Sistemine Geç' : 'Veritabanına Geç'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Nasıl geçmek istersiniz?</div>
              </div>
            </div>

            {/* Mevcut sayılar */}
            {gorselDurum && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#475569', lineHeight: '1.7' }}>
                {gorselOnayModal.hedef === 'dosya'
                  ? <><span style={{ fontWeight: '700' }}>{gorselDurum.urunDb} ürün</span> ve <span style={{ fontWeight: '700' }}>{gorselDurum.markaDb} marka</span> görseli DB'de{gorselDurum.urunDb + gorselDurum.markaDb === 0 && <span style={{ color: '#f59e0b' }}> (taşınacak görsel yok)</span>}</>
                  : <><span style={{ fontWeight: '700' }}>{gorselDurum.urunDosya} ürün</span> ve <span style={{ fontWeight: '700' }}>{gorselDurum.markaDosya} marka</span> görseli dosyada{gorselDurum.urunDosya + gorselDurum.markaDosya === 0 && <span style={{ color: '#f59e0b' }}> (taşınacak görsel yok)</span>}</>
                }
              </div>
            )}

            {/* Aksiyon butonları */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Mevcut görseli taşı butonu — sadece taşınacak görsel varsa göster */}
              {gorselDurum && (gorselOnayModal.hedef === 'dosya' ? gorselDurum.urunDb + gorselDurum.markaDb > 0 : gorselDurum.urunDosya + gorselDurum.markaDosya > 0) && (
                <button
                  onClick={() => handleGorselOnay(false)}
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: gorselOnayModal.hedef === 'dosya' ? '#22c55e' : '#3b82f6', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}
                >
                  {gorselOnayModal.hedef === 'dosya' ? `🗄️→📁 ${gorselDurum.urunDb + gorselDurum.markaDb} görseli taşı + kaydet` : `📁→🗄️ ${gorselDurum.urunDosya + gorselDurum.markaDosya} görseli taşı + kaydet`}
                </button>
              )}
              <button
                onClick={() => handleGorselOnay(true)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px solid ${gorselOnayModal.hedef === 'dosya' ? '#bbf7d0' : '#bfdbfe'}`, background: gorselOnayModal.hedef === 'dosya' ? '#f0fdf4' : '#eff6ff', color: gorselOnayModal.hedef === 'dosya' ? '#15803d' : '#1d4ed8', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
              >Sadece tercihi kaydet (görselleri taşıma)</button>
              <button
                onClick={() => setGorselOnayModal(null)}
                style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
              >İptal</button>
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


      {/* İNDİRİM SIRASI KAYDET UYARI MODALI */}
      {iskontoUyariModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setIskontoUyariModal(false)}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '28px 24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>🎯</div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', textAlign: 'center', marginBottom: '10px' }}>İndirim Sıralamasını Kaydet</div>
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e', lineHeight: '1.7' }}>
              <strong>⚠️ Bu değişiklik müşteri portalını etkiler.</strong><br />
              Yeni sıralama kaydedildikten sonra tüm müşteriler için indirim hesaplama sırası değişecektir. Mevcut siparişler etkilenmez, yalnızca yeni fiyat görüntülemeleri bu sırayı kullanır.
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Yeni sıralama</div>
              {iskontoSirasi.map((key, idx) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: idx < 3 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', width: '16px' }}>{idx + 2}</span>
                  <span>{ISKONTO_LABELS[key].icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{ISKONTO_LABELS[key].label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleIskontoSirasiKaydet} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Evet, Kaydet</button>
              <button onClick={() => setIskontoUyariModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
