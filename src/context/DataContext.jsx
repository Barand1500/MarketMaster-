import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = "/api"; // Production: Aynı domain üzerinden

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [siteSettings, setSiteSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('siteSettings');
      return saved ? JSON.parse(saved) : { site_adi: 'Bostan Manav', logo: '', favicon: '' };
    } catch { return { site_adi: 'Bostan Manav', logo: '', favicon: '' }; }
  });

  // VERILERI API'DEN CEK
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, prodsRes, unitsRes, custsRes, staffRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/kategoriler`),
          fetch(`${API_URL}/urunler`),
          fetch(`${API_URL}/birimler`),
          fetch(`${API_URL}/musteriler`),
          fetch(`${API_URL}/personeller`),
          fetch(`${API_URL}/ayarlar`)
        ]);

        const cats = await catsRes.json();
        const prods = await prodsRes.json();
        const brm = await unitsRes.json();
        const cust = await custsRes.json();
        const staff = await staffRes.json();
        const settings = settingsRes.ok ? await settingsRes.json() : {};
        if (settings && typeof settings === 'object') {
          const merged = { site_adi: 'Bostan Manav', logo: '', favicon: '', ...settings };
          setSiteSettings(merged);
          try { localStorage.setItem('siteSettings', JSON.stringify(merged)); } catch {}
        }

        // Veritabani alanlarini frontend alanlarina maple
        setCategories(cats.map(c => ({ id: c.id, name: c.kategori_adi, parentId: c.ust_kategori_id })));
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
          lastPriceChange: p.son_fiyat_degisimi || null
        })));
        setUnits(brm.map(b => ({ id: b.id, name: b.birim_adi })));
        setCustomers(cust.map(c => ({ 
          id: c.id, 
          name: c.ad_soyad, 
          taxId: c.vkn_tc, 
          phone: c.telefon, 
          email: c.eposta, 
          password: c.sifre,
          discount: parseFloat(c.iskonto_orani), 
          address: c.adres,
          createdAt: c.kayit_tarihi
        })));
        setUsers(staff.map(s => ({ 
          id: s.id, 
          contact: s.ad_soyad, 
          username: s.kullanici_adi,
          password: s.sifre,
          allowedPages: s.yetkiler || []
        })));
        
        setLoading(false);
      } catch (error) {
        console.error("Veri yukleme hatasi:", error);
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
        lastPriceChange: p.son_fiyat_degisimi || p.fiyat_guncelleme_tarihi || null
      })));
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
      setCategories(prev => [...prev, { id: data.id, name: data.kategori_adi, parentId: data.ust_kategori_id ? parseInt(data.ust_kategori_id) : null }]);
    } catch { setApiError('Kategori eklenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const updateCategory = async (id, name) => {
    try {
      const res = await fetch(`${API_URL}/kategoriler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori_adi: name })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
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

  // PRODUCTS
  const addProduct = async (product) => {
    try {
      const res = await fetch(`${API_URL}/urunler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urun_adi: product.name,
          fiyat: product.price,
          birim_adi: product.unit,
          gorsel_yolu: product.image,
          kategori_ids: product.categoryIds,
          stok_durumu: product.inStock
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(prev => [...prev, { 
        id: data.id, 
        name: data.urun_adi, 
        price: parseFloat(data.fiyat), 
        unit: product.unit, 
        categoryIds: data.kategori_ids || [], 
        image: data.gorsel_yolu, 
        inStock: data.stok_durumu === 1 || data.stok_durumu === true || data.stok_durumu === 'true'
      }]);
    } catch { setApiError('Ürün eklenemedi. Sunucu bağlantısını kontrol edin.'); }
  };
  const updateProduct = async (id, updates) => {
    const current = products.find(p => p.id === id);
    const fullData = {
      urun_adi: updates.name || current.name,
      fiyat: updates.price !== undefined ? updates.price : current.price,
      birim_adi: updates.unit || current.unit,
      gorsel_yolu: updates.image !== undefined ? updates.image : current.image,
      stok_durumu: updates.inStock !== undefined ? updates.inStock : current.inStock,
      kategori_ids: updates.categoryIds || current.categoryIds
    };
    // Yerel durumu aninda guncelle (Sayfa yenilemeden tarihlerin degismesi icin)
    const now = new Date().toISOString();
    const infoFields = ['name', 'unit', 'image', 'inStock', 'categoryIds'];
    const isInfoUpdate = infoFields.some(f => updates[f] !== undefined);
    const isPriceUpdate = updates.price !== undefined;
    setProducts(prev => prev.map(p => p.id === id ? { 
      ...p, 
      ...updates, 
      updatedAt: now,
      lastInfoChange: isInfoUpdate ? now : p.lastInfoChange,
      lastPriceChange: isPriceUpdate ? now : p.lastPriceChange
    } : p));
    try {
      const res = await fetch(`${API_URL}/urunler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
          adres: customer.address
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
        discount: parseFloat(data.iskonto_orani), 
        address: data.adres,
        createdAt: data.kayit_tarihi
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
      adres: updates.address !== undefined ? updates.address : current.address
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

  return (
    <DataContext.Provider value={{
      categories, addCategory, updateCategory, deleteCategory,
      products, addProduct, updateProduct, deleteProduct,
      users, addUser, updateUser, updateUserState, deleteUser,
      customers, addCustomer, updateCustomer, deleteCustomer,
      units, addUnit, updateUnit, deleteUnit,
      loading, apiError, clearApiError: () => setApiError(null), refetchProducts,
      siteSettings, updateSiteSettings
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
