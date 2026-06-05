import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = "/api"; // Production: Aynı domain üzerinden

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [units, setUnits] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [kdvOranlari, setKdvOranlari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [siteSettings, setSiteSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('siteSettings');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch { return null; }
  });

  // VERILERI API'DEN CEK
  useEffect(() => {
    const fetchData = async () => {
      console.log('🔄 DataContext fetchData başladı...');
      try {
        // --- Kritik veri: bunlar bitince loading kalkar ---
        console.log('📡 API istekleri gönderiliyor...');
        const [catsRes, prodsRes, unitsRes, settingsRes, markalarRes, kdvRes] = await Promise.all([
          fetch(`${API_URL}/kategoriler`),
          fetch(`${API_URL}/urunler`),
          fetch(`${API_URL}/birimler`),
          fetch(`${API_URL}/ayarlar`),
          fetch(`${API_URL}/markalar`),
          fetch(`${API_URL}/kdv-oranlari`)
        ]);

        const cats = await catsRes.json();
        const prods = await prodsRes.json();
        const brm = await unitsRes.json();
        const settings = settingsRes.ok ? await settingsRes.json() : {};
        const mrk = markalarRes.ok ? await markalarRes.json() : [];
        const kdv = kdvRes.ok ? await kdvRes.json() : [];
        setMarkalar(Array.isArray(mrk) ? mrk.map(m => ({ ...m, iskontoOrani: m.iskonto_orani != null ? String(m.iskonto_orani) : null, iskontoTipi: m.iskonto_tipi || null })) : []);
        setKdvOranlari(Array.isArray(kdv) ? kdv : []);
        if (settings && typeof settings === 'object') {
          const merged = { site_adi: 'Bostan Manav', logo: '', favicon: '', ...settings };
          setSiteSettings(merged);
          try { localStorage.setItem('siteSettings', JSON.stringify(merged)); } catch {}
        }

        setCategories(Array.isArray(cats) ? cats.map(c => ({ id: c.id, name: c.kategori_adi, kategori_adi: c.kategori_adi, sira: c.sira || 0, parentId: c.ust_kategori_id, iskontoOrani: c.iskonto_orani != null ? String(c.iskonto_orani) : null, iskontoTipi: c.iskonto_tipi || null })) : []);
        setProducts(Array.isArray(prods) ? prods.map(p => ({ 
          id: p.id, 
          name: p.urun_adi, 
          price: parseFloat(p.fiyat), 
          unit: p.birim_adi, 
          categoryIds: p.kategori_ids || [], 
          image: p.gorsel_yolu, 
          inStock: p.stok_durumu === 1 || p.stok_durumu === true,
          updatedAt: p.guncelleme_tarihi,
          lastInfoChange: p.bilgi_guncelleme_tarihi || null,
          lastPriceChange: p.son_fiyat_degisimi || null,
          createdAt: p.created_at || null,
          para_birimi_id: p.para_birimi_id || 1,
          pbKisaAd: p.pb_kisa_ad || 'TRY',
          pbSembol: p.pb_sembol || '₺',
          pbKur: parseFloat(p.pb_kur) || 1,
          pbKurTuru: p.pb_kur_turu || null,
          markaId: p.marka_id || null,
          markaAd: p.marka_ad || null,
          markaGorsel: p.marka_gorsel || null,
          kdvOrani: p.kdv_orani !== undefined ? p.kdv_orani : null,
          kdvDahil: p.kdv_dahil !== undefined ? p.kdv_dahil : null,
          stokKodu: p.stok_kodu || null,
          iskontoOrani: p.iskonto_orani != null ? String(p.iskonto_orani) : null,
          iskontoTipi: p.iskonto_tipi || null
        })) : []);
        setUnits(Array.isArray(brm) ? brm.map(b => ({ id: b.id, name: b.birim_adi })) : []);

        // 🔍 DEBUG: API verilerini logla
        console.log('🔍 DataContext API Yüklendi:');
        console.log('  ✅ Kategoriler:', cats?.length || 0);
        console.log('  ✅ Ürünler:', prods?.length || 0);
        console.log('  ✅ Birimler:', brm?.length || 0);
        console.log('  ✅ Markalar:', mrk?.length || 0);
        if (!Array.isArray(cats) || cats.length === 0) console.error('❌ Kategoriler boş!');
        if (!Array.isArray(prods) || prods.length === 0) console.error('❌ Ürünler boş!');
        if (!Array.isArray(brm) || brm.length === 0) console.error('❌ Birimler boş!');

        // Loading bitti — kullanıcı artık sayfayı görebilir
        console.log('✅ setLoading(false) çağrılıyor...');
        setLoading(false);

        // --- İkincil veri: arkaplanda yükle (admin panel için) ---
        Promise.all([
          fetch(`${API_URL}/musteriler`),
          fetch(`${API_URL}/personeller`)
        ]).then(async ([custsRes, staffRes]) => {
          const cust = await custsRes.json();
          const staff = await staffRes.json();
          setCustomers(Array.isArray(cust) ? cust.map(c => ({ 
            id: c.id, 
            name: c.ad_soyad, 
            taxId: c.vkn_tc, 
            phone: c.telefon, 
            email: c.eposta, 
            password: c.sifre,
            discount: c.iskonto_orani || '0', 
            address: c.adres,
            createdAt: c.kayit_tarihi,
            fiyatTanimlariId: c.fiyat_tanimlari_id ? parseInt(c.fiyat_tanimlari_id) : null
          })) : []);
          setUsers(Array.isArray(staff) ? staff.map(s => ({ 
            id: s.id, 
            contact: s.ad_soyad, 
            username: s.kullanici_adi,
            password: s.sifre,
            allowedPages: s.yetkiler || []
          })) : []);
        }).catch(() => {});

      } catch (error) {
        console.error("❌ DataContext Veri Yükleme Hatası:");
        console.error("  - Hata Mesajı:", error.message);
        console.error("  - Stack:", error.stack);
        console.error("  - API URL:", API_URL);
        setApiError('Sunucuya bağlanılamadı. Backend\'in çalıştığından ve .env dosyasının doğru ayarlandığından emin olun.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/urunler`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const prods = await res.json();
      setProducts(prods.map(p => ({
        id: p.id,
        name: p.urun_adi,
        price: parseFloat(p.fiyat),
        unit: p.birim_adi,
        categoryIds: p.kategori_ids || [],
        image: p.gorsel_yolu,
        inStock: p.stok_durumu === 1 || p.stok_durumu === true,
        updatedAt: p.guncelleme_tarihi,
        lastInfoChange: p.bilgi_guncelleme_tarihi || null,
        lastPriceChange: p.son_fiyat_degisimi || p.fiyat_guncelleme_tarihi || null,
        createdAt: p.created_at || null,
        para_birimi_id: p.para_birimi_id || 1,
        pbKisaAd: p.pb_kisa_ad || 'TRY',
        pbSembol: p.pb_sembol || '₺',
        pbKur: parseFloat(p.pb_kur) || 1,
        pbKurTuru: p.pb_kur_turu || null,
        markaId: p.marka_id || null,
        markaAd: p.marka_ad || null,
        markaGorsel: p.marka_gorsel || null,
        kdvOrani: p.kdv_orani !== undefined ? p.kdv_orani : null,
        kdvDahil: p.kdv_dahil !== undefined ? p.kdv_dahil : null,
        stokKodu: p.stok_kodu || null
      })))
    } catch { /* sessizce hata yut, mevcut veri kalsin */ }
  };

  // CATEGORIES
  const addCategory = async (name, parentId = null) => {
    try {
      const res = await fetch(`${API_URL}/kategoriler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori_adi: name, ust_kategori_id: parentId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCategories(prev => [...prev, { 
        id: data.id, 
        name: data.kategori_adi, 
        kategori_adi: data.kategori_adi,
        parentId: data.ust_kategori_id ? parseInt(data.ust_kategori_id) : null,
        sira: data.sira || 0
      }]);
    } catch { setApiError('Kategori eklenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const updateCategory = async (id, name, parentId = null, iskontoOrani = undefined, iskontoTipi = undefined, sira = undefined) => {
    try {
      const body = { kategori_adi: name, ust_kategori_id: parentId ? parseInt(parentId) : null };
      if (iskontoOrani !== undefined) body.iskonto_orani = iskontoOrani;
      if (iskontoTipi !== undefined) body.iskonto_tipi = iskontoTipi;
      if (sira !== undefined) body.sira = sira;
      const res = await fetch(`${API_URL}/kategoriler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories(prev => prev.map(c => {
        if (c.id !== id) return c;
        const updated = { ...c, name, kategori_adi: name, parentId: parentId ? parseInt(parentId) : null };
        if (iskontoOrani !== undefined) updated.iskontoOrani = iskontoOrani;
        if (iskontoTipi !== undefined) updated.iskontoTipi = iskontoTipi;
        if (sira !== undefined) updated.sira = sira;
        return updated;
      }));
    } catch { setApiError('Kategori güncellenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const deleteCategory = async (id) => {
    try {
      const res = await fetch(`${API_URL}/kategoriler/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch { setApiError('Kategori silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // USERS (STAFF)
  const addUser = async (user) => {
    try {
      const res = await fetch(`${API_URL}/personeller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad_soyad: user.contact,
          kullanici_adi: user.username,
          sifre: user.password,
          yetkiler: user.allowedPages
        })
      });
      if (!res.ok) {
        let errMsg = 'Personel eklenemedi.';
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
        setApiError(errMsg);
        return { ok: false, error: errMsg };
      }
      const data = await res.json();
      setUsers(prev => [...prev, { 
        id: data.id, 
        contact: data.ad_soyad, 
        username: data.kullanici_adi,
        password: data.sifre,
        allowedPages: data.yetkiler || []
      }]);
      return { ok: true };
    } catch (e) {
      const msg = 'Personel eklenemedi. Sunucu bağlantısını kontrol edin.';
      setApiError(msg);
      return { ok: false, error: msg };
    }
  };
  const updateUserState = (id, updates) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };
  const updateUser = async (id, updates) => {
    const current = users.find(u => u.id === id);
    const fullData = {
        ad_soyad: updates.contact !== undefined ? updates.contact : current.contact,
        kullanici_adi: updates.username !== undefined ? updates.username : current.username,
        yetkiler: updates.allowedPages !== undefined ? updates.allowedPages : current.allowedPages
    };
    // Yeni sifre gonderilmisse ekle (hash backend'de yapilir)
    if (updates.password) fullData.sifre = updates.password;
    try {
      const res = await fetch(`${API_URL}/personeller/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    } catch { setApiError('Personel güncellenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const deleteUser = async (id) => {
    if (id === 1 || id === '1') return;
    try {
      const res = await fetch(`${API_URL}/personeller/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { setApiError('Personel silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // UNITS
  const addUnit = async (name) => {
    try {
      const res = await fetch(`${API_URL}/birimler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birim_adi: name })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!units.some(u => u.name === data.birim_adi)) {
        setUnits(prev => [...prev, { id: data.id, name: data.birim_adi }]);
      }
    } catch { setApiError('Birim eklenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const updateUnit = async (id, newName) => {
    try {
      const res = await fetch(`${API_URL}/birimler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birim_adi: newName })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUnits(prev => prev.map(u => u.id === id ? { ...u, name: newName } : u));
    } catch { setApiError('Birim güncellenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const deleteUnit = async (id) => {
    try {
      const res = await fetch(`${API_URL}/birimler/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUnits(prev => prev.filter(u => u.id !== id));
    } catch { setApiError('Birim silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // MARKALAR
  const addMarka = async (ad, gorsel = null, gorselFile = null) => {
    try {
      let gorselDeger = gorsel;
      if (gorselFile instanceof File) {
        const uploaded = await uploadGorsel(gorselFile, 'marka');
        if (uploaded) gorselDeger = uploaded;
      }
      const res = await fetch(`${API_URL}/markalar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad, gorsel: gorselDeger })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMarkalar(prev => [...prev, { 
        id: data.id, 
        ad: data.ad, 
        gorsel: data.gorsel,
        sira: data.sira || 0,
        iskontoOrani: data.iskonto_orani != null ? String(data.iskonto_orani) : null,
        iskontoTipi: data.iskonto_tipi || null
      }]);
      return { ok: true, id: data.id };
    } catch { setApiError('Marka eklenemedi. Sunucu bağlantısını kontrol edin.'); return { ok: false }; }
  };
  const updateMarka = async (id, ad, gorsel, gorselFile = null, iskontoOrani = undefined, iskontoTipi = undefined, sira = undefined) => {
    try {
      let gorselDeger = gorsel;
      if (gorselFile instanceof File) {
        const uploaded = await uploadGorsel(gorselFile, 'marka');
        if (uploaded) gorselDeger = uploaded;
      }
      const body = { ad, gorsel: gorselDeger };
      if (iskontoOrani !== undefined) body.iskonto_orani = iskontoOrani;
      if (iskontoTipi !== undefined) body.iskonto_tipi = iskontoTipi;
      if (sira !== undefined) body.sira = sira;
      const res = await fetch(`${API_URL}/markalar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMarkalar(prev => prev.map(m => {
        if (m.id !== id) return m;
        const updated = { ...m, ad, gorsel: gorselDeger };
        if (iskontoOrani !== undefined) updated.iskontoOrani = iskontoOrani;
        if (iskontoTipi !== undefined) updated.iskontoTipi = iskontoTipi;
        if (sira !== undefined) updated.sira = sira;
        return updated;
      }));
    } catch { setApiError('Marka güncellenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const deleteMarka = async (id) => {
    try {
      const res = await fetch(`${API_URL}/markalar/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMarkalar(prev => prev.filter(m => m.id !== id));
    } catch { setApiError('Marka silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // KDV ORANLARI
  const refetchKdvOranlari = async () => {
    try {
      const res = await fetch(`${API_URL}/kdv-oranlari`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setKdvOranlari(data);
    } catch {}
  };
  const addKdvOrani = async (oran) => {
    try {
      const res = await fetch(`${API_URL}/kdv-oranlari`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oran })
      });
      if (!res.ok) {
        let errMsg = 'KDV oranı eklenemedi.';
        try { const e = await res.json(); if (e?.error || e?.message) errMsg = e.error || e.message; } catch {}
        return { ok: false, error: errMsg };
      }
      const data = await res.json();
      setKdvOranlari(prev => [...prev, data]);
      return { ok: true };
    } catch { return { ok: false, error: 'Sunucuya bağlanılamadı. İnternet veya sunucu bağlantınızı kontrol edin.' }; }
  };
  const updateKdvOrani = async (id, oran) => {
    try {
      const res = await fetch(`${API_URL}/kdv-oranlari/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oran })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKdvOranlari(prev => prev.map(k => k.id === id ? data : k));
      return { ok: true };
    } catch { setApiError('KDV oranı güncellenemedi. Sunucu bağlantısını kontrol edin.'); return { ok: false }; }
  };
  const deleteKdvOrani = async (id) => {
    try {
      const res = await fetch(`${API_URL}/kdv-oranlari/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setKdvOranlari(prev => prev.filter(k => k.id !== id));
    } catch { setApiError('KDV oranı silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // Görsel dosya yükleme yardımcısı
  const uploadGorsel = async (file, tip) => {
    console.log('🖼️ uploadGorsel çağrıldı - Dosya:', file.name, 'Tip:', tip);
    const form = new FormData();
    form.append('gorsel', file);
    const res = await fetch(`${API_URL}/upload/${tip}`, { method: 'POST', body: form });
    console.log('📤 Upload response status:', res.status);
    if (!res.ok) {
      console.error('❌ Upload başarısız:', res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    console.log('✅ Upload başarılı:', data);
    return data.url || null;
  };

  // PRODUCTS
  const addProduct = async (product) => {
    console.log('➕ addProduct çağrıldı - Product:', product);
    console.log('🔍 imageFile var mı?', product.imageFile instanceof File, product.imageFile);
    try {
      let gorselYolu = product.image;
      if (product.imageFile instanceof File) {
        console.log('📸 ImageFile bulundu, upload ediliyor...');
        const uploaded = await uploadGorsel(product.imageFile, 'urun');
        if (uploaded) gorselYolu = uploaded;
        console.log('🖼️ Upload sonucu gorselYolu:', gorselYolu);
      }
      const payload = {
        urun_adi: product.name,
        fiyat: product.price,
        birim_id: product.birim_id,
        gorsel_yolu: gorselYolu,
        kategori_ids: product.categoryIds,
        stok_durumu: product.inStock,
        para_birimi_id: product.para_birimi_id || 1,
        marka_id: product.marka_id || null,
        kdv_orani: product.kdv_orani !== undefined ? product.kdv_orani : null,
        kdv_dahil: product.kdv_dahil !== undefined ? product.kdv_dahil : null,
        stok_kodu: product.stok_kodu || null,
        iskonto_orani: product.iskonto_orani !== undefined ? product.iskonto_orani : null,
        iskonto_tipi: product.iskonto_tipi || null
      };
      console.log('📦 Backend\'e gönderilen payload:', payload);
      const res = await fetch(`${API_URL}/urunler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const marka = markalar.find(m => m.id === (product.marka_id || null));
      setProducts(prev => [...prev, { 
        id: data.id, 
        name: data.urun_adi, 
        price: parseFloat(data.fiyat), 
        unit: product.unit, 
        categoryIds: data.kategori_ids || [], 
        image: data.gorsel_yolu, 
        inStock: data.stok_durumu === 1 || data.stok_durumu === true || data.stok_durumu === 'true',
        para_birimi_id: data.para_birimi_id || 1,
        pbKisaAd: product.pbKisaAd || 'TRY',
        pbSembol: product.pbSembol || '₺',
        pbKur: product.pbKur || 1,
        markaId: product.marka_id || null,
        markaAd: marka?.ad || null,
        markaGorsel: marka?.gorsel || null,
        kdvOrani: product.kdv_orani ?? null,
        kdvDahil: product.kdv_dahil ?? null,
        stokKodu: data.stok_kodu || null,
        iskontoOrani: product.iskonto_orani ?? null,
        iskontoTipi: product.iskonto_tipi || null,
      }]);
    } catch { setApiError('Ürün eklenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const updateProduct = async (id, updates) => {
    console.log('🔄 updateProduct çağrıldı - ID:', id, 'Updates:', updates);
    console.log('🔍 imageFile var mı?', updates.imageFile instanceof File, updates.imageFile);
    const current = products.find(p => p.id === id);
    let gorselYolu = updates.image !== undefined ? updates.image : current.image;
    if (updates.imageFile instanceof File) {
      console.log('📸 ImageFile bulundu, upload ediliyor...');
      const uploaded = await uploadGorsel(updates.imageFile, 'urun');
      if (uploaded) gorselYolu = uploaded;
      console.log('🖼️ Upload sonucu gorselYolu:', gorselYolu);
    }
    const fullData = {
      urun_adi: updates.name || current.name,
      fiyat: updates.price !== undefined ? updates.price : current.price,
      birim_id: updates.birim_id || current.birimId,
      gorsel_yolu: gorselYolu,
      stok_durumu: updates.inStock !== undefined ? updates.inStock : current.inStock,
      kategori_ids: updates.categoryIds || current.categoryIds,
      para_birimi_id: updates.para_birimi_id !== undefined ? updates.para_birimi_id : (current.para_birimi_id || 1),
      marka_id: updates.marka_id !== undefined ? updates.marka_id : current.markaId,
      kdv_orani: updates.kdv_orani !== undefined ? updates.kdv_orani : current.kdvOrani,
      kdv_dahil: updates.kdv_dahil !== undefined ? updates.kdv_dahil : current.kdvDahil,
      stok_kodu: updates.stok_kodu !== undefined ? updates.stok_kodu : current.stokKodu,
      iskonto_orani: updates.iskonto_orani !== undefined ? updates.iskonto_orani : current.iskontoOrani,
      iskonto_tipi: updates.iskonto_tipi !== undefined ? updates.iskonto_tipi : current.iskontoTipi
    };
    // Yerel durumu aninda guncelle (Sayfa yenilemeden tarihlerin degismesi icin)
    const now = new Date().toISOString();
    const infoFields = ['name', 'unit', 'image', 'inStock', 'categoryIds'];
    const isInfoUpdate = infoFields.some(f => updates[f] !== undefined);
    const isPriceUpdate = updates.price !== undefined;
    // snake_case → camelCase mapping (local state uses camelCase)
    const localMapped = {};
    if (updates.marka_id !== undefined) {
      localMapped.markaId = updates.marka_id;
      const marka = markalar.find(m => m.id === updates.marka_id);
      localMapped.markaAd = marka?.ad || null;
      localMapped.markaGorsel = marka?.gorsel || null;
    }
    if (updates.kdv_orani !== undefined) localMapped.kdvOrani = updates.kdv_orani;
    if (updates.kdv_dahil !== undefined) localMapped.kdvDahil = updates.kdv_dahil;
    if (updates.stok_kodu !== undefined) localMapped.stokKodu = updates.stok_kodu;
    if (updates.iskonto_orani !== undefined) localMapped.iskontoOrani = updates.iskonto_orani;
    if (updates.iskonto_tipi !== undefined) localMapped.iskontoTipi = updates.iskonto_tipi;
    setProducts(prev => prev.map(p => p.id === id ? {
      ...p,
      ...updates,
      ...localMapped,
      updatedAt: now,
      lastInfoChange: isInfoUpdate ? now : p.lastInfoChange,
      lastPriceChange: isPriceUpdate ? now : p.lastPriceChange,
      ...(updates.para_birimi_id !== undefined ? { pbSembol: updates.pbSembol || p.pbSembol } : {})
    } : p));
    try {
      const res = await fetch(`${API_URL}/urunler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });
      if (!res.ok) {
        if (res.status === 409) {
          // Optimistic update'i geri al — eski stok_kodu'na dön
          setProducts(prev => prev.map(p => p.id === id ? { ...p, stokKodu: current.stokKodu } : p));
          return { status: 409 };
        }
        throw new Error(`HTTP ${res.status}`);
      }
    } catch { setApiError('Ürün güncellenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`${API_URL}/urunler/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { setApiError('Ürün silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // CUSTOMERS
  const addCustomer = async (customer) => {
    try {
      const res = await fetch(`${API_URL}/musteriler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad_soyad: customer.name,
          vkn_tc: customer.taxId,
          telefon: customer.phone,
          eposta: customer.email,
          sifre: customer.password,
          iskonto_orani: customer.discount,
          adres: customer.address,
          fiyat_tanimlari_id: customer.fiyatTanimlariId || null
        })
      });
      if (!res.ok) {
        let errMsg = 'Müşteri eklenemedi.';
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
        setApiError(errMsg);
        return;
      }
      const data = await res.json();
      setCustomers(prev => [...prev, { 
        id: data.id, 
        name: data.ad_soyad, 
        taxId: data.vkn_tc, 
        phone: data.telefon, 
        email: data.eposta, 
        password: data.sifre, 
        discount: data.iskonto_orani || '0', 
        address: data.adres,
        createdAt: data.kayit_tarihi,
        fiyatTanimlariId: data.fiyat_tanimlari_id ? parseInt(data.fiyat_tanimlari_id) : null
      }]);
    } catch (e) { setApiError(e.message || 'Müşteri eklenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const updateCustomer = async (id, updates) => {
    const current = customers.find(c => c.id === id);
    const fullData = {
      ad_soyad: updates.name !== undefined ? updates.name : current.name,
      vkn_tc: updates.taxId !== undefined ? updates.taxId : current.taxId,
      telefon: updates.phone !== undefined ? updates.phone : current.phone,
      eposta: updates.email !== undefined ? updates.email : current.email,
      iskonto_orani: updates.discount !== undefined ? updates.discount : current.discount,
      adres: updates.address !== undefined ? updates.address : current.address,
      fiyat_tanimlari_id: updates.fiyatTanimlariId !== undefined ? updates.fiyatTanimlariId : current.fiyatTanimlariId
    };
    // Yeni sifre gonderilmisse ekle (hash backend'de yapilir)
    if (updates.password) fullData.sifre = updates.password;
    try {
      const res = await fetch(`${API_URL}/musteriler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });
      if (!res.ok) {
        let errMsg = 'Müşteri güncellenemedi.';
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
        setApiError(errMsg);
        return { ok: false, error: errMsg };
      }
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      return { ok: true };
    } catch (e) {
      const msg = e.message || 'Müşteri güncellenemedi. Sunucu bağlantısını kontrol edin.';
      setApiError(msg);
      return { ok: false, error: msg };
    }
  };
  const deleteCustomer = async (id) => {
    try {
      const res = await fetch(`${API_URL}/musteriler/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch { setApiError('Müşteri silinemedi. Sunucu bağlantısını kontrol edin.'); }
  };

  // EXTRA PRICES - Kaldirildi (Backend yapisinda musteriler tablosu iskonto kullaniyor)

  const updateSiteSettings = async (newSettings) => {
    try {
      const res = await fetch(`${API_URL}/ayarlar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSiteSettings(prev => {
        const merged = { ...prev, ...newSettings };
        try { localStorage.setItem('siteSettings', JSON.stringify(merged)); } catch {}
        return merged;
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Ayarlar kaydedilemedi.' };
    }
  };

  const fetchDataWrapper = async () => {
    console.log('🔄 fetchData wrapper çağrıldı (Settings için)');
    const [catsRes, prodsRes, unitsRes, settingsRes, markalarRes, kdvRes] = await Promise.all([
      fetch(`${API_URL}/kategoriler`),
      fetch(`${API_URL}/urunler`),
      fetch(`${API_URL}/birimler`),
      fetch(`${API_URL}/ayarlar`),
      fetch(`${API_URL}/markalar`),
      fetch(`${API_URL}/kdv-oranlari`)
    ]);
    const cats = await catsRes.json();
    const prods = await prodsRes.json();
    const brm = await unitsRes.json();
    const settings = settingsRes.ok ? await settingsRes.json() : {};
    const mrk = markalarRes.ok ? await markalarRes.json() : [];
    const kdv = kdvRes.ok ? await kdvRes.json() : [];
    setMarkalar(Array.isArray(mrk) ? mrk.map(m => ({ ...m, iskontoOrani: m.iskonto_orani != null ? String(m.iskonto_orani) : null, iskontoTipi: m.iskonto_tipi || null })) : []);
    setKdvOranlari(Array.isArray(kdv) ? kdv : []);
    if (settings && typeof settings === 'object') {
      const merged = { site_adi: 'Bostan Manav', logo: '', favicon: '', ...settings };
      setSiteSettings(merged);
      try { localStorage.setItem('siteSettings', JSON.stringify(merged)); } catch {}
    }
    setCategories(Array.isArray(cats) ? cats.map(c => ({ id: c.id, name: c.kategori_adi, kategori_adi: c.kategori_adi, sira: c.sira || 0, parentId: c.ust_kategori_id, iskontoOrani: c.iskonto_orani != null ? String(c.iskonto_orani) : null, iskontoTipi: c.iskonto_tipi || null })) : []);
    setProducts(Array.isArray(prods) ? prods.map(p => ({ 
      id: p.id, 
      name: p.urun_adi, 
      price: parseFloat(p.fiyat), 
      unit: p.birim_adi, 
      categoryIds: p.kategori_ids || [], 
      image: p.gorsel_yolu, 
      inStock: p.stok_durumu === 1 || p.stok_durumu === true,
      updatedAt: p.guncelleme_tarihi,
      lastInfoChange: p.bilgi_guncelleme_tarihi || null,
      lastPriceChange: p.son_fiyat_degisimi || null,
      createdAt: p.created_at || null,
      para_birimi_id: p.para_birimi_id || 1,
      pbKisaAd: p.pb_kisa_ad || 'TRY',
      pbSembol: p.pb_sembol || '₺',
      pbKur: parseFloat(p.pb_kur) || 1,
      pbKurTuru: p.pb_kur_turu || null,
      markaId: p.marka_id || null,
      markaAd: p.marka_ad || null,
      markaGorsel: p.marka_gorsel || null,
      kdvOrani: p.kdv_orani !== undefined ? p.kdv_orani : null,
      kdvDahil: p.kdv_dahil !== undefined ? p.kdv_dahil : null,
      stokKodu: p.stok_kodu || null,
      iskontoOrani: p.iskonto_orani != null ? String(p.iskonto_orani) : null,
      iskontoTipi: p.iskonto_tipi || null
    })) : []);
    setUnits(Array.isArray(brm) ? brm.map(b => ({ id: b.id, name: b.birim_adi })) : []);
    console.log('✅ fetchData wrapper tamamlandı');
  };

  return (
    <DataContext.Provider value={{
      categories, addCategory, updateCategory, deleteCategory,
      products, addProduct, updateProduct, deleteProduct,
      users, addUser, updateUser, updateUserState, deleteUser,
      customers, addCustomer, updateCustomer, deleteCustomer,
      units, addUnit, updateUnit, deleteUnit,
      markalar, addMarka, updateMarka, deleteMarka,
      kdvOranlari, addKdvOrani, updateKdvOrani, deleteKdvOrani, refetchKdvOranlari,
      loading, apiError, clearApiError: () => setApiError(null), refetchProducts,
      siteSettings, updateSiteSettings,
      fetchData: fetchDataWrapper
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
