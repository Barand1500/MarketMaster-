import { useState, useEffect, useRef, memo } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

const API_URL = "/api"; // Production: Aynı domain üzerinden

const fmtPrice = (n, sembol) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + (sembol || '₺');

// Sayıyı büyük, kuruş kısmını ve sembolü küçük gösterir
const Pr = ({ n, sembol, numStyle, symRatio = 0.62 }) => {
  const s = sembol || '₺';
  const formatted = Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  const commaIdx = formatted.lastIndexOf(',');
  const intPart = commaIdx >= 0 ? formatted.slice(0, commaIdx) : formatted;
  const decPart = commaIdx >= 0 ? formatted.slice(commaIdx) : '';
  const fontSize = numStyle?.fontSize;
  const smallSize = fontSize ? `calc(${typeof fontSize === 'number' ? fontSize + 'px' : fontSize} * ${symRatio})` : undefined;
  return (
    <span style={numStyle}>
      {intPart}<span style={{ fontSize: smallSize, fontWeight: '700', opacity: 0.7, letterSpacing: 0 }}>{decPart} {s}</span>
    </span>
  );
};

// Grid card fiyat bölümü — hover tüm kartı kapsar, hovered dışardan gelir
const GridPriceSection = ({ price, discountedPrice, discount, sembol, kisaAd, kur, hovered }) => {
  const isTRY = !kisaAd || kisaAd === 'TRY';
  const showTL = hovered && !isTRY;
  const dispN = (n) => showTL ? Math.round(n * (kur || 1) * 100) / 100 : n;
  const dispS = showTL ? '₺' : (sembol || '₺');
  return (
    <div style={{ marginTop: 'auto', paddingTop: '8px', width: '100%' }}>
      {discount > 0 ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <span key={showTL ? 'tl-base' : 'orig-base'} style={{ display: 'inline-block', animation: 'priceFadeIn 0.2s ease' }}>
              <Pr n={dispN(price)} sembol={dispS} numStyle={{ color: '#94a3b8', fontSize: '15px', fontWeight: '600' }} symRatio={0.75} />
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <span className="card-indirim-badge">
              <span className="card-indirim-pct">Sana Özel</span>
              <span className="card-indirim-label">%{discount} İndirim</span>
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span key={showTL ? 'tl-disc' : 'orig-disc'} style={{ display: 'inline-block', animation: 'priceFadeIn 0.2s ease' }}>
              <Pr n={dispN(discountedPrice)} sembol={dispS} numStyle={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px' }} />
            </span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <span key={showTL ? 'tl-only' : 'orig-only'} style={{ display: 'inline-block', animation: 'priceFadeIn 0.2s ease' }}>
            <Pr n={dispN(price)} sembol={dispS} numStyle={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }} />
          </span>
        </div>
      )}
    </div>
  );
};

// Liste görünümü fiyat satırı — hover tüm satırı kapsar, hovered dışardan gelir
const ListPriceSection = ({ price, discountedPrice, discount, sembol, kisaAd, kur, hovered }) => {
  const isTRY = !kisaAd || kisaAd === 'TRY';
  const showTL = hovered && !isTRY;
  const dispN = (n) => showTL ? Math.round(n * (kur || 1) * 100) / 100 : n;
  const dispS = showTL ? '₺' : (sembol || '₺');
  return (
    <>
      <td className={discount > 0 ? 'cp-col-price-base' : 'cp-col-price-only'} style={{ padding: '10px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span key={showTL ? 'tl-base' : 'orig-base'} style={{ display: 'inline-block', animation: 'priceFadeIn 0.2s ease' }}>
          {discount > 0
            ? <Pr n={dispN(price)} sembol={dispS} numStyle={{ color: '#94a3b8', fontSize: '15px', fontWeight: '700' }} symRatio={0.75} />
            : <Pr n={dispN(price)} sembol={dispS} numStyle={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }} />}
        </span>
      </td>
      {discount > 0 && (
        <td className="cp-col-indirim" style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
          <span className="card-indirim-badge" style={{ display: 'inline-flex' }}>
            <span className="card-indirim-pct">Sana Özel</span>
            <span className="card-indirim-label">%{discount} İndirim</span>
          </span>
        </td>
      )}
      {discount > 0 && (
        <td className="cp-col-final" style={{ padding: '10px 16px 10px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div className="cp-mobile-price-stack">
            <span className="cp-mobile-base-price">
              <span key={showTL ? 'tl-mob' : 'orig-mob'} style={{ display: 'inline-block', animation: 'priceFadeIn 0.2s ease' }}>
                <Pr n={dispN(price)} sembol={dispS} numStyle={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8' }} symRatio={0.8} />
              </span>
            </span>
            <span className="card-indirim-badge cp-mobile-badge" style={{ display: 'inline-flex' }}>
              <span className="card-indirim-pct">Sana Özel</span>
              <span className="card-indirim-label">%{discount} İndirim</span>
            </span>
          </div>
          <span key={showTL ? 'tl-final' : 'orig-final'} style={{ display: 'inline-block', animation: 'priceFadeIn 0.2s ease' }}>
            <Pr n={dispN(discountedPrice)} sembol={dispS} numStyle={{ fontSize: '26px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px' }} />
          </span>
        </td>
      )}
    </>
  );
};

// Ürün bileşeni — memo ile gereksiz re-render önlenir
const ProductItem = memo(({ p, viewMode, discount }) => {
  const isTRY = !p.pbKisaAd || p.pbKisaAd === 'TRY';
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef(null);
  const discountedPrice = p.price * (1 - discount / 100);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : null;
  const lastPriceUpdate = p.lastPriceChange
    ? new Date(p.lastPriceChange).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const hoverHandlers = isTRY ? {} : {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onTouchStart: () => { setHovered(true); clearTimeout(hoverTimerRef.current); hoverTimerRef.current = setTimeout(() => setHovered(false), 2000); },
  };

  if (viewMode === 'list') {
    return (
      <tr className="cp-list-row" {...hoverHandlers}>
        {/* Görsel */}
        <td className="cp-col-img" style={{ padding: '8px 10px 8px 14px', width: '52px' }}>
          <div className="thumb-box">
            {p.image
              ? <div className="thumb-container"><img src={p.image} alt={p.name} /></div>
              : <span style={{ fontSize: '20px' }}>🍎</span>}
          </div>
        </td>
        {/* Ürün Adı */}
        <td className="cp-col-name" style={{ padding: '10px 10px' }}>
          <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', cursor: 'default' }}>{p.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span className="badge-unit" style={{ cursor: 'default' }}>{p.unit || 'Kg'}</span>
            {p.kdvOrani != null && (
              <span style={{
                fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px',
                background: p.kdvDahil ? '#f0fdf4' : '#fef2f2',
                color: p.kdvDahil ? '#16a34a' : '#b91c1c',
                border: `1px solid ${p.kdvDahil ? '#bbf7d0' : '#fecaca'}`,
              }}>
                %{parseFloat(p.kdvOrani) % 1 === 0 ? parseInt(p.kdvOrani) : parseFloat(p.kdvOrani)} KDV {p.kdvDahil ? 'Dahil' : 'Hariç'}
              </span>
            )}
          </div>
        </td>
        <ListPriceSection
          price={p.price}
          discountedPrice={discountedPrice}
          discount={discount}
          sembol={p.pbSembol}
          kisaAd={p.pbKisaAd}
          kur={p.pbKur}
          hovered={hovered}
        />
        {/* Son Fiyat Güncelleme */}
        <td className="cp-date-col" style={{ padding: '8px 24px 8px 48px', whiteSpace: 'nowrap', textAlign: 'center' }}>
          {fmtDate(p.lastPriceChange)
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{fmtDate(p.lastPriceChange)}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{fmtTime(p.lastPriceChange)}</span>
              </div>
            : <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>—</span>
          }
        </td>
        {/* Son Bilgi Güncelleme */}
        <td className="cp-date-col" style={{ padding: '8px 14px 8px 10px', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {fmtDate(p.lastInfoChange)
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{fmtDate(p.lastInfoChange)}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{fmtTime(p.lastInfoChange)}</span>
              </div>
            : <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>—</span>
          }
        </td>
      </tr>
    );
  }

  // ---- GRID CARD ----
  return (
    <div className="product-card" {...hoverHandlers}>
      <div className="product-image-container">
        <div className="card-unit-corner">{p.unit || 'Kg'}</div>
        {p.image ? (
          <img src={p.image} alt={p.name} className="product-image" />
        ) : (
          <span style={{ fontSize: '60px' }}>🍎</span>
        )}
      </div>
      <div className="card-body">
        <strong className="card-name">{p.name}</strong>
        <GridPriceSection
          price={p.price}
          discountedPrice={discountedPrice}
          discount={discount}
          sembol={p.pbSembol}
          kisaAd={p.pbKisaAd}
          kur={p.pbKur}
          hovered={hovered}
        />
        {p.kdvOrani != null && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
            <span style={{
              fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px',
              background: p.kdvDahil ? '#f0fdf4' : '#fef2f2',
              color: p.kdvDahil ? '#16a34a' : '#b91c1c',
              border: `1px solid ${p.kdvDahil ? '#bbf7d0' : '#fecaca'}`,
            }}>
              %{parseFloat(p.kdvOrani) % 1 === 0 ? parseInt(p.kdvOrani) : parseFloat(p.kdvOrani)} KDV {p.kdvDahil ? 'Dahil' : 'Hariç'}
            </span>
          </div>
        )}
        <div className="card-footer">
          <div className="card-footer-row">
            <span className="card-footer-label fiyat">Son Fiyat Güncellemesi</span>
            <span className="card-footer-date">{lastPriceUpdate || 'Henüz yok'}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

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
  if (cleaned.length === 10 && cleaned.startsWith('5')) cleaned = '0' + cleaned;
  if (cleaned.length >= 11) {
    cleaned = cleaned.slice(0, 11);
    return cleaned.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }
  return formatPhoneDynamic(val);
};

// Zincirleme iskonto: "20+20" → 36, "10" → 10
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

export default function CustomerPortal({ customer, onLogout, onSessionUpdate }) {
  const { categories, products, markalar, updateCustomer, refetchProducts, siteSettings } = useData();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const [selectedMarkalar, setSelectedMarkalar] = useState([]);
  const [showMarkaDrop, setShowMarkaDrop] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState(null); // null = doğal sıra
  const [pendingOrder, setPendingOrder] = useState(null);   // dropdown'da düzenlenen geçici sıra
  const [sortBy, setSortBy] = useState('default');
  const [showSortDrop, setShowSortDrop] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [profileData, setProfileData] = useState({
    title: customer.name || '',
    taxId: customer.taxId || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || customer.adres || '',
    currentPass: '',
    newPass: '',
    confirmNewPass: ''
  });

  // Modal her açıldığında customer prop'undan profileData'yı yenile
  useEffect(() => {
    if (showProfile) {
      setProfileData(prev => ({
        ...prev,
        title: customer.name || '',
        taxId: customer.taxId || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || customer.adres || '',
      }));
    }
  }, [showProfile]);
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false, reset: false, resetConfirm: false });
  const [resetStep, setResetStep] = useState('none'); // 'none', 'sending', 'verify', 'newpass'
  const [resetData, setResetData] = useState({ code: '', newPass: '', confirmNewPass: '' });
  const [resetTimer, setResetTimer] = useState(0);
  const [showKurPanel, setShowKurPanel] = useState(false);
  const [paraBirimleri, setParaBirimleri] = useState([]);
  const kurPanelRef = useRef(null);

  // Para birimlerini çek
  useEffect(() => {
    fetch(`${API_URL}/para-birimleri`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setParaBirimleri(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Kur paneli dışına tıklayınca kapat
  useEffect(() => {
    if (!showKurPanel) return;
    const handler = (e) => {
      if (kurPanelRef.current && !kurPanelRef.current.contains(e.target)) {
        setShowKurPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showKurPanel]);

  // 60 Saniyede bir urunleri yeniden cek
  useEffect(() => {
    const interval = setInterval(async () => {
      await refetchProducts();
      setLastRefreshed(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const refreshProducts = async () => {
    await refetchProducts();
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    let interval;
    if (resetTimer > 0) {
      interval = setInterval(() => setResetTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resetTimer]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (showProfile) { setShowProfile(false); return; }
      if (showLogoutConfirm) { setShowLogoutConfirm(false); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showProfile, showLogoutConfirm]);

  const discount = parseDiscount(String(customer.discount || '0'));

  const filteredProducts = products.filter(p => {
    if (p.inStock === false) return false;
    const matchSearch = p.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'));
    const matchCat = selectedCategories.length > 0
      ? selectedCategories.some(cid => p.categoryIds.includes(cid))
      : true;
    const matchMarka = selectedMarkalar.length > 0
      ? selectedMarkalar.includes(p.markaId)
      : true;
    return matchSearch && matchCat && matchMarka;
  });

  const sortOptions = [
    { value: 'default', label: 'Varsayılan' },
    { value: 'a-z', label: '🔤 A → Z' },
    { value: 'z-a', label: '🔤 Z → A' },
    { value: 'price-asc', label: '💰 En Düşük Fiyat' },
    { value: 'price-desc', label: '💰 En Yüksek Fiyat' },
    { value: 'newest', label: '🆕 En Yeni Eklenen' },
    { value: 'updated', label: '🕐 En Son Güncellenen' },
  ];

  const applySorting = (arr) => {
    if (sortBy === 'default') return arr;
    const sorted = [...arr];
    const tlPrice = (p) => p.price * (p.pbKur || 1);
    if (sortBy === 'a-z') sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    else if (sortBy === 'z-a') sorted.sort((a, b) => b.name.localeCompare(a.name, 'tr'));
    else if (sortBy === 'price-asc') sorted.sort((a, b) => tlPrice(a) - tlPrice(b));
    else if (sortBy === 'price-desc') sorted.sort((a, b) => tlPrice(b) - tlPrice(a));
    else if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (sortBy === 'updated') sorted.sort((a, b) => new Date(b.lastPriceChange || b.updatedAt || 0) - new Date(a.lastPriceChange || a.updatedAt || 0));
    return sorted;
  };

  const fmtNum = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  const fmtTL = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  // Eğer kategori seçiliyse sadece o kategoriyi başlık yap, değilse ana kategorileri (roots) göster
  const roots = categories.filter(c => !c.parentId);

  // Sıra uygulanmış kategoriler
  const orderedRoots = (() => {
    const order = categoryOrder || roots.map(c => c.id);
    return [...roots].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  })();

  const displayCategories = selectedCategories.length > 0
    ? orderedRoots.filter(c => selectedCategories.includes(c.id))
    : orderedRoots;

  // Kategori ilişkisi olmayan ürünleri kontrol et
  const uncategorizedProducts = filteredProducts.filter(p => !p.categoryIds || p.categoryIds.length === 0);
  const hasNoCategoryRelations = filteredProducts.length > 0 && filteredProducts.every(p => !p.categoryIds || p.categoryIds.length === 0);

  return (
    <div className="page-container wide" style={{ paddingTop: 0 }}>
      {/* COMPACT RESPONSIVE HEADER */}
      <div className="customer-header">
        <div className="header-left">
          <div className="nav-logo" style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {siteSettings?.logo
              ? <img src={siteSettings.logo} alt="logo" style={{ height: '26px', width: '26px', objectFit: 'contain', borderRadius: '4px' }} />
              : siteSettings !== null ? <span>🍉</span> : null
            }
            {siteSettings?.site_adi ?? ''}
          </div>
          <div className="header-divider"></div>
          <div className="customer-name-display">{customer.name}</div>
        </div>

        {/* FILTER AREA */}
        <div className="header-center">

          <div style={{ position: 'relative' }}>
            <button onClick={() => {
              setShowCatDrop(!showCatDrop);
              if (!showCatDrop) setPendingOrder(categoryOrder || roots.map(c => c.id));
            }} className="header-filter-btn">
              📂 Kategoriler
            </button>
            {showCatDrop && (
              <>
                <div className="dropdown-overlay" onClick={() => setShowCatDrop(false)} />
                <div className="portal-dropdown-panel" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '230px', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', border: '1px solid #e2e8f0', zIndex: 9001, overflow: 'hidden' }}>

                  {/* FİLTRE BÖLÜMÜ */}
                  <div style={{ padding: '8px 8px 4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '2px 6px 6px' }}>Kategoriler</div>
                    {(pendingOrder || roots.map(c => c.id)).map(id => {
                      const c = categories.find(cat => cat.id === id);
                      if (!c) return null;
                      const checked = selectedCategories.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => setSelectedCategories(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '7px 10px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: checked ? 'rgba(34,197,94,0.07)' : 'transparent', color: checked ? 'var(--primary)' : '#374151', fontWeight: checked ? '700' : '500', fontSize: '13px', textAlign: 'left' }}
                          onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${checked ? 'var(--primary)' : '#cbd5e1'}`, background: checked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                            {checked && <span style={{ color: '#fff', fontSize: '10px', fontWeight: '900', lineHeight: 1 }}>✓</span>}
                          </span>
                          {c.name}
                        </button>
                      );
                    })}
                    {selectedCategories.length > 0 && (
                      <button onClick={() => setSelectedCategories([])} style={{ width: '100%', marginTop: '4px', padding: '6px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>✕ Filtreyi Temizle</button>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                  {/* SIRALAMA BÖLÜMÜ */}
                  <div style={{ padding: '4px 8px 8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 6px 6px' }}>Kategori Sırası</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(pendingOrder || roots.map(c => c.id)).map((id, idx, arr) => {
                        const c = categories.find(cat => cat.id === id);
                        if (!c) return null;
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px', borderRadius: '8px' }}>
                            <span style={{ width: '18px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#334155' }}>{c.name}</span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                disabled={idx === 0}
                                onClick={() => {
                                  const next = [...arr];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  setPendingOrder(next);
                                }}
                                style={{ width: '22px', height: '22px', border: 'none', borderRadius: '6px', background: 'transparent', color: idx === 0 ? '#d1d5db' : '#94a3b8', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >▲</button>
                              <button
                                disabled={idx === arr.length - 1}
                                onClick={() => {
                                  const next = [...arr];
                                  [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                  setPendingOrder(next);
                                }}
                                style={{ width: '22px', height: '22px', border: 'none', borderRadius: '6px', background: 'transparent', color: idx === arr.length - 1 ? '#d1d5db' : '#94a3b8', cursor: idx === arr.length - 1 ? 'default' : 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >▼</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => { setCategoryOrder(pendingOrder); setShowCatDrop(false); }}
                      style={{ width: '100%', marginTop: '8px', padding: '9px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                    >
                      ✓ Onayla
                    </button>
                    {categoryOrder && (
                      <button
                        onClick={() => { setCategoryOrder(null); setPendingOrder(roots.map(c => c.id)); }}
                        style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
                      >
                        ↺ Varsayılan Sıra
                      </button>
                    )}
                  </div>

                </div>
              </>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMarkaDrop(!showMarkaDrop)}
              className="header-filter-btn"
              style={selectedMarkalar.length > 0 ? { fontWeight: '700', background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}}
            >
              🏷️ Markalar
            </button>
            {showMarkaDrop && (
              <>
                <div className="dropdown-overlay" onClick={() => setShowMarkaDrop(false)} />
                <div className="portal-dropdown-panel" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '200px', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', border: '1px solid #e2e8f0', zIndex: 9001, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 8px 4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '2px 6px 6px' }}>Markalar</div>
                    {markalar.length === 0 && (
                      <div style={{ padding: '8px 10px', fontSize: '12px', color: '#94a3b8' }}>Henüz marka yok</div>
                    )}
                    {[...markalar].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).map(m => {
                      const checked = selectedMarkalar.includes(m.id);
                      return (
                        <button key={m.id}
                          onClick={() => setSelectedMarkalar(prev => prev.includes(m.id) ? prev.filter(i => i !== m.id) : [...prev, m.id])}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '7px 10px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: checked ? 'rgba(34,197,94,0.07)' : 'transparent', color: checked ? 'var(--primary)' : '#374151', fontWeight: checked ? '700' : '500', fontSize: '13px', textAlign: 'left' }}
                          onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${checked ? 'var(--primary)' : '#cbd5e1'}`, background: checked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                            {checked && <span style={{ color: '#fff', fontSize: '10px', fontWeight: '900', lineHeight: 1 }}>✓</span>}
                          </span>
                          {m.gorsel && <img src={m.gorsel} alt={m.ad} style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3, flexShrink: 0 }} />}
                          {m.ad}
                        </button>
                      );
                    })}
                    {selectedMarkalar.length > 0 && (
                      <button onClick={() => setSelectedMarkalar([])} style={{ width: '100%', marginTop: '4px', padding: '6px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>✕ Markayı Temizle</button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        <div className="header-right">
          <button onClick={() => setShowProfile(true)} className="profile-btn-header">👤 <span className="btn-label">Profil</span></button>
          <button onClick={() => setShowLogoutConfirm(true)} className="logout-btn-header" title="Çıkış">✕</button>
        </div>
      </div>

      {/* REFRESH & INFO STRIP */}
      <div className="info-strip">
        <div className="info-left">
          {/* İndirim badge + Arama — tek blok */}
          <div className="search-discount-bar">
            {/* Arama butonu — her zaman solda */}
            <button
              onClick={() => { setShowSearch(v => !v); if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50); else setSearch(''); }}
              className="strip-search-btn"
              style={{ background: showSearch ? 'var(--primary)' : '#f1f5f9', color: showSearch ? '#fff' : '#64748b' }}
              title="Ürün ara"
            >🔍</button>
            {/* İndirim badge: arama açıkken gizle */}
            {discount > 0 && !showSearch && (
              <div className="discount-badge-premium">
                <span className="badge-icon">✨</span>
                <span className="badge-text">
                  Hesabınıza Özel <strong className="discount-value">%{discount}</strong> İndirim Uygulanıyor
                </span>
              </div>
            )}
            {/* Animasyonlu input */}
            <div style={{ overflow: 'hidden', width: showSearch ? 'min(240px, 50vw)' : '0', transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', opacity: showSearch ? 1 : 0, flexShrink: 0 }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Ürün ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearch(''); } }}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', width: '100%', outline: 'none', fontWeight: '500' }}
              />
            </div>
          </div>
        </div>

        <div className="info-right">
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSortDrop(!showSortDrop)}
              title="Sırala"
              style={{ width: '30px', height: '28px', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.15s', background: sortBy !== 'default' ? 'var(--primary)' : '#f1f5f9', color: sortBy !== 'default' ? '#fff' : '#64748b' }}
            >↕</button>
            {showSortDrop && (
              <>
                <div className="dropdown-overlay" onClick={() => setShowSortDrop(false)} />
                <div className="portal-dropdown-panel" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '210px', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', border: '1px solid #e2e8f0', zIndex: 9001, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 6px 4px' }}>Sıralama</div>
                  </div>
                  <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {sortOptions.map(opt => {
                      const active = sortBy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value); setShowSortDrop(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                            background: active ? 'rgba(34,197,94,0.08)' : 'transparent',
                            color: active ? 'var(--primary)' : '#374151',
                            fontWeight: active ? '700' : '500', fontSize: '13px',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{
                            width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${active ? 'var(--primary)' : '#cbd5e1'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: active ? 'var(--primary)' : 'transparent',
                            transition: 'all 0.15s',
                          }}>
                            {active && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'block' }} />}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {sortBy !== 'default' && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px 8px' }}>
                      <button
                        onClick={() => { setSortBy('default'); setShowSortDrop(false); }}
                        style={{ width: '100%', padding: '7px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                      >
                        ✕ Sıralamayı Sıfırla
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="update-time-box"
            onClick={refreshProducts}
            title="Ürünleri yenile"
          >
            <span className="pulse-dot"></span>
            Son Güncelleme: <strong>{lastRefreshed.toLocaleTimeString('tr-TR')}</strong>
          </button>
          <div className="kur-panel-wrap" ref={kurPanelRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Kart Görünümü"
                style={{ width: '30px', height: '28px', border: 'none', borderRadius: '7px 0 0 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.15s',
                  background: viewMode === 'grid' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  color: viewMode === 'grid' ? 'var(--primary)' : '#94a3b8' }}
              >⊞</button>
              <button
                onClick={() => setViewMode('list')}
                title="Liste Görünümü"
                style={{ width: '30px', height: '28px', border: 'none', borderRadius: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.15s',
                  background: viewMode === 'list' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  color: viewMode === 'list' ? 'var(--primary)' : '#94a3b8' }}
              >☰</button>
              <button
                type="button"
                onClick={() => setShowKurPanel(v => !v)}
                title="Döviz kurları"
                style={{ width: '30px', height: '28px', border: 'none', borderRadius: '0 7px 7px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', transition: 'all 0.15s',
                  background: showKurPanel ? '#fff' : 'transparent',
                  boxShadow: showKurPanel ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  color: showKurPanel ? 'var(--primary)' : '#94a3b8' }}
              >₺</button>
            </div>
            {showKurPanel && (
              <div className="kur-panel-dropdown">
                <div className="kur-panel-title">Döviz Kurları</div>
                {paraBirimleri.filter(pb => pb.id !== 1).map(pb => (
                  <div key={pb.id} className="kur-panel-row">
                    <span className="kur-panel-sym">{pb.sembol} {pb.kisa_ad}</span>
                    <span className="kur-panel-val">{Number(pb.kur).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₺</span>
                  </div>
                ))}
                {paraBirimleri.filter(pb => pb.id !== 1).length === 0 && (
                  <div className="kur-panel-empty">Döviz yok</div>
                )}
              </div>
            )}
          </div>
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
        .header-left { display: flex; align-items: center; gap: 12px; flex: 1; }
        .header-divider { height: 24px; width: 1px; background: #e2e8f0; }
        .customer-name-display { font-size: 14px; font-weight: 700; color: #1e293b; }
        
        .header-center { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          flex: none; 
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
          padding: 6px 13px;
          border-radius: 20px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          transition: border-color 0.15s, background 0.15s;
        }
        .header-filter-btn:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }
        /* Profil modalı mobilde bottom sheet */
        @media (max-width: 640px) {
          .profile-modal-panel {
            border-radius: 20px 20px 0 0 !important;
            margin: 0 !important;
            max-height: 92dvh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .profile-btn-header { background: #f1f5f9; color: #475569; border: none; padding: 8px 12px; font-weight: 700; font-size: 12px; border-radius: 10px; cursor: pointer; white-space: nowrap; }
        .logout-btn-header { background: #fee2e2; color: #ef4444; border: none; width: 32px; height: 32px; border-radius: 50%; font-weight: 700; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s; }
        .logout-btn-header:hover { background: #fecaca; }
        
        .header-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 50; width: 220px; padding: 12px; border: 1px solid #e2e8f0; }
        .dropdown-scroll { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .dropdown-item { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #475569; padding: 4px 0; }
        .dropdown-clear-btn { width: 100%; margin-top: 10px; padding: 6px; border: none; background: #fee2e2; color: #ef4444; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .dropdown-overlay { position: fixed; inset: 0; z-index: 8999; }

        .info-strip { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 4px; flex-wrap: wrap; gap: 12px; }
        .info-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .search-discount-bar { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
        .discount-badge-premium { display: flex; align-items: center; gap: 8px; background: rgba(0, 184, 148, 0.06); padding: 5px 14px; border-radius: 30px; border: 1px solid rgba(0, 184, 148, 0.2); white-space: nowrap; }
        .badge-icon { font-size: 14px; }
        .strip-search-btn { width: 32px; height: 32px; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; transition: all 0.2s; }
        .badge-text { font-size: 12px; font-weight: 600; color: var(--primary); letter-spacing: -0.1px; }
        .discount-value { background: var(--primary); color: #fff; padding: 1px 6px; border-radius: 6px; font-size: 11px; margin: 0 2px; }
        .selected-cats-list { display: flex; gap: 4px; align-items: center; }
        .cat-chip-small { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; }
        .cat-more-count { font-size: 11px; color: #94a3b8; }
        
        .info-right { display: flex; align-items: center; gap: 12px; }
        .update-time-box { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 8px; background: #fff; padding: 4px 10px; border-radius: 20px; border: 1px solid #f1f5f9; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; }
        .update-time-box:hover { background: #f8fafc; border-color: #dbe6ee; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06); }
        .update-time-box:focus-visible { outline: none; border-color: rgba(0,184,148,0.45); box-shadow: 0 0 0 3px rgba(0,184,148,0.12); }
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
        .kur-panel-wrap { position: relative; }
        .kur-panel-btn { background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; font-size: 13px; font-weight: 700; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, border-color 0.15s; }
        .kur-panel-btn:hover { background: #e2e8f0; border-color: #cbd5e1; }
        .kur-panel-dropdown { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 4px 16px rgba(15,23,42,0.10); min-width: 180px; z-index: 200; padding: 8px 0; }
        .kur-panel-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 14px 6px; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px; }
        .kur-panel-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 14px; gap: 12px; }
        .kur-panel-row:hover { background: #f8fafc; }
        .kur-panel-sym { font-size: 12px; font-weight: 600; color: #334155; }
        .kur-panel-val { font-size: 12px; color: #059669; font-weight: 700; white-space: nowrap; }
        .kur-panel-empty { font-size: 12px; color: #94a3b8; padding: 6px 14px; }
        .customer-category-section { padding-bottom: 0; margin-bottom: 0; }
        .category-divider { height: 2px; background: linear-gradient(to right, transparent, #cbd5e1 10%, #cbd5e1 90%, transparent); margin: 36px 0; border-radius: 2px; }

        /* ── Tablet (769px – 1024px) ─────────────────────────── */
        @media (min-width: 769px) and (max-width: 1024px) {
          .customer-header { padding: 10px 16px; gap: 10px; }
          .customer-name-display { max-width: 160px; }
          .portal-content { padding: 12px 16px; }
          /* Grid: 3 sütun (masaüstünde auto-fill ~5+ sütun) */
          .product-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 12px; }
          /* Liste: tarih sütunları görünür kalır ama daraltılır */
          .cp-date-col { padding: 8px 12px !important; font-size: 11px; }
          /* İnfo şeridini yatay tut */
          .info-strip { flex-direction: row; align-items: center; }
        }

        /* ── Geniş Mobil (641px – 768px) ────────────────────── */
        @media (min-width: 641px) and (max-width: 768px) {
          .portal-content { padding: 10px 12px; }
          /* Grid: 3 sütun (dar değil) */
          .product-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 10px; }
          .product-card { border-radius: 12px; }
          .card-body { padding: 10px !important; }
          .card-name { font-size: 13px !important; }
          /* Liste: tarih sütunları gizle (dar tablo için) */
          .cp-date-col { display: none !important; }
          .product-list-view thead th.cp-date-col { display: none !important; }
        }

        @media (max-width: 768px) {
          .customer-header {
            padding: 8px 12px;
            gap: 8px;
            flex-wrap: wrap;
          }
          /* Satır 1: logo+isim (sol) | profil+çıkış (sağ) */
          .header-left { order: 1; flex: 1; min-width: 0; }
          .header-right { order: 2; flex-shrink: 0; gap: 6px; }
          /* Satır 2: arama + filtreler (tam genişlik) */
          .header-center { order: 3; width: 100%; flex-basis: 100%; max-width: none; flex-wrap: nowrap; }

          .header-divider { display: none; }
          .nav-logo { font-size: 15px !important; }
          .customer-name-display {
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 130px;
          }

          .info-strip { flex-direction: column; align-items: flex-start; gap: 10px; }
          .info-left { width: 100%; flex-direction: column; align-items: flex-start; gap: 6px; }
          .search-discount-bar { width: 100%; }
          .info-right { width: 100%; justify-content: space-between; }
          .discount-badge-premium { padding: 4px 10px; }
          .badge-text { font-size: 11px; }
        }

        @media (max-width: 640px) {
          /* Header buton: sadece ikon */
          .btn-label { display: none; }
          .profile-btn-header { padding: 8px 10px; font-size: 15px; }
          .customer-name-display { max-width: 110px; }

          /* Dropdownlar ekranın altında sabit panel olarak açılsın */
          .portal-dropdown-panel {
            position: fixed !important;
            left: 12px !important;
            right: 12px !important;
            bottom: 16px !important;
            top: auto !important;
            min-width: unset !important;
            max-height: 80dvh;
            overflow-y: auto;
            border-radius: 20px !important;
            z-index: 9000 !important;
          }

          /* Profil modal bottom sheet */
          .profile-modal-panel {
            border-radius: 20px 20px 0 0 !important;
            margin: 0 !important;
            max-height: 88dvh !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          /* Profil form: tek kolon, kompakt padding */
          .profile-modal-panel .confirm-body {
            padding: 14px !important;
            gap: 12px !important;
          }
          .profile-modal-panel .confirm-footer {
            padding: 12px 14px !important;
          }

          .discount-badge-premium {
            width: 100%;
          }
          .badge-text {
            text-align: center;
          }
          .info-right {
            gap: 10px;
          }
          .update-time-box {
            justify-content: center;
          }
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 16px;
        }
        .card-body { padding: 12px; display: flex; flex-direction: column; flex-grow: 1; align-items: center; }
        .card-name { font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.2; word-break: break-word; text-align: center; display: block; width: 100%; }
        .card-unit-corner { position: absolute; top: 8px; right: 8px; z-index: 2; background: rgba(255,255,255,0.92); color: #475569; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .card-indirim-badge { display: inline-flex; align-items: center; border-radius: 20px; overflow: hidden; height: 24px; box-shadow: 0 2px 6px rgba(220,38,38,0.25); }
        .card-indirim-pct { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-size: 11px; font-weight: 900; padding: 0 8px; height: 100%; display: flex; align-items: center; letter-spacing: 0.2px; }
        .card-indirim-label { background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 0 8px; height: 100%; display: flex; align-items: center; }
        .card-footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; width: 100%; }
        .card-footer-row { display: flex; flex-direction: column; gap: 1px; align-items: center; text-align: center; }
        .card-footer-label { font-size: 9px; font-weight: 700; color: #64748b; }
        .card-footer-label.bilgi { color: #64748b; }
        .card-footer-label.fiyat { color: #16a34a; }
        .card-footer-date { font-size: 10px; color: #0f172a; font-weight: 700; }
        @media (max-width: 640px) {
          .product-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
          .product-card { border-radius: 10px; }
          .card-body { padding: 8px !important; }
          .card-name { font-size: 12px !important; }
          .card-unit-corner { font-size: 10px !important; padding: 2px 7px !important; }
          .card-indirim-badge { height: 19px !important; }
          .card-indirim-pct { font-size: 10px !important; padding: 0 6px !important; }
          .card-indirim-label { font-size: 9px !important; padding: 0 5px !important; }
          .card-footer { margin-top: 8px; padding-top: 6px; gap: 4px; }
          .card-footer-label { font-size: 9px !important; }
          .card-footer-date { font-size: 10px !important; }
        }
        .product-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          transition: all 0.22s ease;
          display: flex;
          flex-direction: column;
          border: 1.5px solid #f1f5f9;
        }
        @media (hover: hover) and (pointer: fine) {
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 0 0 2px rgba(0,184,148,0.25), 0 8px 24px rgba(0,184,148,0.12), 0 2px 6px rgba(0,0,0,0.06);
            border-color: rgba(0,184,148,0.55);
          }
        }
        @media (hover: none), (pointer: coarse) {
          .product-card:hover,
          .product-card:active {
            transform: none;
            box-shadow: 0 0 0 2px rgba(0,184,148,0.22), 0 6px 16px rgba(0,184,148,0.10), 0 2px 6px rgba(0,0,0,0.05);
            border-color: rgba(0,184,148,0.5);
          }
        }
        .product-image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .product-image-container { aspect-ratio: 4 / 3 !important; }
          .product-image { object-fit: contain !important; }
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }
        .product-list-view {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          width: 100%;
        }
        .product-list-view table { width: 100% !important; }
        .cp-list-row td { border-bottom: 2px solid #e8f5e9 !important; }
        .cp-list-row:last-child td { border-bottom: none !important; }
        .cp-list-row:hover td { background: #f0fdf4 !important; }
        /* PC'de mobil price stack gizli */
        .cp-mobile-price-stack { display: none; }
        /* Liste mobil: gereksiz sütunları gizle, layout'u koru */
        @media (max-width: 640px) {
          .product-list-view { overflow-x: hidden; border-radius: 12px; }
          .cp-date-col,
          .cp-col-price-base,
          .cp-col-indirim { display: none !important; }
          /* Masaüstünde mobile stack gizli */
          .cp-mobile-price-stack { display: none !important; }
          .cp-col-img { padding: 8px 6px 8px 10px !important; width: 40px !important; }
          .cp-col-img .thumb-box { width: 34px !important; height: 34px !important; }
          .cp-col-name { padding: 8px 6px !important; }
          .cp-col-name > span { font-size: 13px !important; }
          .cp-col-price-only { padding: 8px 12px 8px 6px !important; }
          .cp-col-price-only > span { font-size: 16px !important; }
          .cp-col-final { padding: 6px 12px 6px 6px !important; text-align: right !important; }
          .cp-mobile-price-stack { display: flex !important; flex-direction: column !important; align-items: flex-end !important; gap: 2px !important; margin-bottom: 2px !important; }
          .cp-mobile-badge { transform: scale(0.82) !important; transform-origin: right center !important; }
          .cp-mobile-base-price { font-size: 11px !important; color: #94a3b8 !important; font-weight: 600 !important; }
          .product-list-view thead { display: none !important; }
          .cp-list-row td { border-bottom: 1px solid #e8f5e9 !important; }
        }
        @media (max-width: 480px) {
          .header-center { gap: 4px; flex-wrap: nowrap; }
          .header-filter-btn { padding: 5px 8px !important; font-size: 11px !important; gap: 3px !important; }
          .portal-dropdown-panel {
            position: fixed !important;
            left: 8px !important;
            right: 8px !important;
            bottom: 12px !important;
            top: auto !important;
            max-height: 82dvh !important;
            overflow-y: auto !important;
          }
        }
      `}</style>

      {/* Arama/filtre sonucu boş ise */}
      {filteredProducts.length === 0 && (search || selectedCategories.length > 0 || selectedMarkalar.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.25 }}>🔍</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Sonuç bulunamadı</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', maxWidth: '320px', lineHeight: '1.6' }}>
            {search ? <><b>"{search}"</b> için ürün bulunamadı.</> : 'Seçili filtrelerle eşleşen ürün yok.'}
            {(selectedCategories.length > 0 || selectedMarkalar.length > 0) && <> Filtreleri değiştirmeyi deneyin.</>}
          </div>
          <button
            onClick={() => { setSearch(''); setSelectedCategories([]); setSelectedMarkalar([]); }}
            style={{ padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
          >
            ✕ Filtreleri Temizle
          </button>
        </div>
      )}

      {/* DEBUG kaldırıldı — ürün/kategori ilişki sorunu yoksa gösterme */}
      {(products.length === 0 || categories.length === 0 || (!hasNoCategoryRelations && displayCategories.every(cat => filteredProducts.filter(p => p.categoryIds.includes(cat.id)).length === 0))) && !hasNoCategoryRelations && filteredProducts.length === 0 && !search && selectedCategories.length === 0 && selectedMarkalar.length === 0 && products.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.2 }}>📦</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Henüz ürün eklenmemiş</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Ürünler yüklenince burada görünecek.</div>
        </div>
      )}

      {/* Kategori ilişkisi yoksa tüm ürünleri düz listele */}
      {hasNoCategoryRelations && (
        <div className="customer-category-section">
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
            <span style={{ width: '5px', height: '24px', background: 'var(--primary)', borderRadius: '3px' }}></span>
            Tüm Ürünler
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', background: '#f1f5f9', padding: '4px 10px', borderRadius: '10px', marginLeft: 'auto' }}>{filteredProducts.length} Ürün</span>
          </h2>
          {viewMode === 'grid'
            ? <div className="product-grid">{applySorting(filteredProducts).map(p => <ProductItem key={p.id} p={p} viewMode={viewMode} discount={discount} />)}</div>
            : (
              <div className="product-list-view">
                <table className="excel-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead><tr className="th-row">
                    <th style={{ width: '52px' }}>Görsel</th>
                    <th>Ürün Adı</th>
                    <th style={{ textAlign: 'right' }}>Fiyat</th>
                    {discount > 0 && <th style={{ textAlign: 'center' }}>İndirim</th>}
                    {discount > 0 && <th style={{ textAlign: 'right' }}>Sana Özel Fiyat</th>}
                    <th className="cp-date-col" style={{ textAlign: 'center', paddingLeft: '48px' }}>Son Fiyat Güncelleme</th>
                    <th className="cp-date-col" style={{ textAlign: 'center' }}>Son Bilgi Güncelleme</th>
                  </tr></thead>
                  <tbody>{applySorting(filteredProducts).map(p => <ProductItem key={p.id} p={p} viewMode={viewMode} discount={discount} />)}</tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {displayCategories.map((cat, catIdx) => {
        const catProducts = filteredProducts.filter(p => p.categoryIds.includes(cat.id));
        if (catProducts.length === 0) return null;
        const isLast = catIdx === displayCategories.length - 1 || displayCategories.slice(catIdx + 1).every(c => filteredProducts.filter(p => p.categoryIds.includes(c.id)).length === 0);

        return (
          <div key={cat.id} className="customer-category-section" style={viewMode === 'list' ? { marginBottom: '51px' } : {}}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <span style={{ width: '5px', height: '24px', background: 'var(--primary)', borderRadius: '3px' }}></span>
              {cat.name}
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', background: '#f1f5f9', padding: '4px 10px', borderRadius: '10px', marginLeft: 'auto' }}>{catProducts.length} Ürün</span>
            </h2>
            {viewMode === 'grid'
              ? <div className="product-grid">{applySorting(catProducts).map(p => <ProductItem key={p.id} p={p} viewMode={viewMode} discount={discount} />)}</div>
              : (
                <div className="product-list-view">
                  <table className="excel-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead><tr className="th-row">
                      <th style={{ width: '52px' }}>Görsel</th>
                      <th>Ürün Adı</th>
                      <th style={{ textAlign: 'right' }}>Fiyat</th>
                      {discount > 0 && <th style={{ textAlign: 'center' }}>İndirim</th>}
                      {discount > 0 && <th style={{ textAlign: 'right' }}>Sana Özel Fiyat</th>}
                      <th className="cp-date-col" style={{ textAlign: 'center', paddingLeft: '48px' }}>Son Fiyat Güncelleme</th>
                      <th className="cp-date-col" style={{ textAlign: 'center' }}>Son Bilgi Güncelleme</th>
                    </tr></thead>
                    <tbody>{applySorting(catProducts).map(p => <ProductItem key={p.id} p={p} viewMode={viewMode} discount={discount} />)}</tbody>
                  </table>
                </div>
              )
            }
            {!isLast && viewMode === 'grid' && <div className="category-divider" />}
          </div>
        );
      })}
      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px 28px', maxWidth: '360px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚪</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>Çıkış Yap</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: '1.5' }}>Hesabınızdan çıkmak istediğinizden emin misiniz?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
              <button onClick={onLogout} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Çıkış Yap</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {/* PREMIUM PROFILE MODAL */}
      {showProfile && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', overflowY: 'auto' }}>
          <div className="premium-confirm profile-modal-panel" onClick={e => e.stopPropagation()} style={{
            maxWidth: '550px', width: '100%', padding: '0', borderRadius: '20px',
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: 'none',
            marginTop: '12px', marginBottom: '12px'
          }}>
            <div style={{
              padding: '20px 20px 16px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '1px solid #e2e8f0',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #00d2ab 100%)',
                  borderRadius: '12px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontSize: '20px',
                  boxShadow: '0 8px 16px rgba(0, 184, 148, 0.2)', flexShrink: 0
                }}>👤</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Profil & Fatura</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Kişisel bilgilerinizi yönetin</p>
                </div>
              </div>
              <button onClick={() => setShowProfile(false)} style={{
                position: 'absolute', top: '16px', right: '16px',
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontWeight: '700'
              }}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
            </div>

            <div className="confirm-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="field-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>🏢</span>Ünvan / Ad Soyad
                </label>
                <input type="text" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.title} onChange={e => setProfileData({ ...profileData, title: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="field-group">
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>🆔</span> TC / VKN
                  </label>
                  <input type="text" className="lite-input" maxLength={11} style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.taxId} onChange={e => setProfileData({ ...profileData, taxId: e.target.value })} />
                </div>
                <div className="field-group">
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.7 }}>📞</span> Telefon No
                  </label>
                  <input type="text" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: formatPhoneDynamic(e.target.value) })} onBlur={e => setProfileData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))} placeholder="0530 000 00 00" />
                </div>
              </div>

              <div className="field-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>📧</span> E-Posta Adresi
                </label>
                <input type="email" className="lite-input" style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0' }} value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} />
              </div>

              <div className="field-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>📍</span> Kayıtlı Fatura Adresi
                </label>
                <textarea
                  className="lite-input"
                  style={{ minHeight: '100px', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', border: '1px solid #e2e8f0', resize: 'none', lineHeight: '1.6' }}
                  value={profileData.address}
                  onChange={e => setProfileData({ ...profileData, address: e.target.value })}
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
                    <div className="field-group">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block' }}>Mevcut Şifre</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPass.current ? 'text' : 'password'}
                          placeholder="••••••"
                          className="lite-input"
                          style={{ padding: '8px 40px 8px 12px', fontSize: '13px', width: '100%' }}
                          value={profileData.currentPass}
                          onChange={e => setProfileData({ ...profileData, currentPass: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(prev => ({ ...prev, current: !prev.current }))}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                        >
                          {showPass.current ? '🐵' : '🙈'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="field-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block' }}>Yeni Şifre</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPass.new ? 'text' : 'password'}
                            placeholder="Yeni şifre"
                            className="lite-input"
                            style={{ padding: '8px 40px 8px 12px', fontSize: '13px', width: '100%' }}
                            value={profileData.newPass}
                            onChange={e => setProfileData({ ...profileData, newPass: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(prev => ({ ...prev, new: !prev.new }))}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          >
                            {showPass.new ? '🐵' : '🙈'}
                          </button>
                        </div>
                      </div>
                      <div className="field-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block' }}>Yeni Şifre (Tekrar)</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPass.confirm ? 'text' : 'password'}
                            placeholder="Yeni şifre tekrar"
                            className="lite-input"
                            style={{ padding: '8px 40px 8px 12px', fontSize: '13px', width: '100%' }}
                            value={profileData.confirmNewPass}
                            onChange={e => setProfileData({ ...profileData, confirmNewPass: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          >
                            {showPass.confirm ? '🐵' : '🙈'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VALIDATION ERRORS */}
                    {profileData.newPass && profileData.confirmNewPass && profileData.newPass !== profileData.confirmNewPass && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>⚠️ Yeni şifreler birbiriyle uyuşmuyor!</p>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        if (profileData.newPass.length < 6) {
                          alert('Yeni şifre en az 6 karakter olmalıdır!');
                          return;
                        }
                        if (profileData.newPass !== profileData.confirmNewPass) {
                          alert('Yeni şifreler uyuşmuyor!');
                          return;
                        }
                        try {
                          const res = await fetch(`${API_URL}/verify-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: customer.id, password: profileData.currentPass, role: 'customer' })
                          });
                          const data = await res.json();
                          if (!data.valid) { alert('Mevcut şifreniz hatalı!'); return; }
                          if (window.confirm('Şifrenizi güncellemek istediğinizden emin misiniz?')) {
                            await updateCustomer(customer.id, { password: profileData.newPass });
                            alert('Şifreniz başarıyla güncellendi!');
                            setProfileData(prev => ({ ...prev, currentPass: '', newPass: '', confirmNewPass: '' }));
                            setShowPasswordSection(false);
                          }
                        } catch { alert('Sunucu hatası. Lütfen tekrar deneyin.'); }
                      }}
                      disabled={!profileData.currentPass || !profileData.newPass || !profileData.confirmNewPass || profileData.newPass !== profileData.confirmNewPass}
                      style={{
                        background: 'var(--primary)', color: '#fff', border: 'none',
                        padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '13px',
                        cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 12px rgba(0, 184, 148, 0.2)'
                      }}>
                      Şifreyi Güncelle
                    </button>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                        Mevcut şifrenizi hatırlamıyor musunuz? <br />
                        <button
                          type="button"
                          disabled={resetStep !== 'none' && resetStep !== 'verify'}
                          onClick={async () => {
                            setResetStep('sending');
                            try {
                              const res = await fetch(`${API_URL}/send-reset-code`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: customer.eposta || customer.email })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                const remainingMsg = data.remaining ? `\n\n(Gunluk kalan: ${data.remaining} email)` : '';
                                alert(data.message + remainingMsg);
                                setResetStep('verify');
                                setResetTimer(300); // 5 dakika
                              } else {
                                if (data.limitReached) {
                                  alert('⚠️ Gunluk 100 email limitine ulasildi.\n\nLutfen yarın tekrar deneyin.\n\nBu limit guvenlik icindir.');
                                } else {
                                  alert(data.error);
                                }
                                setResetStep('none');
                              }
                            } catch (err) {
                              alert('Bağlantı hatası: ' + err.message);
                              setResetStep('none');
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}
                        >
                          Buraya tıklayarak sıfırlama linki isteyebilirsiniz.
                        </button>
                      </p>
                    </div>

                    {/* Password reset flow moved out of here */}
                  </div>
                )}
              </div>
            </div>

            <div className="confirm-footer" style={{
              padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '12px'
            }}>
              <button onClick={() => { setShowProfile(false); setShowPasswordSection(false); setProfileData(prev => ({ ...prev, currentPass: '', newPass: '', confirmNewPass: '' })); }} style={{
                background: 'transparent', color: '#64748b', border: 'none',
                padding: '12px 20px', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
              }}>Vazgeç</button>
              <button onClick={async () => {
                // Validasyon
                if (profileData.taxId) {
                  const tcVkn = profileData.taxId.replace(/\s/g, '');
                  if (tcVkn.length > 11) {
                    alert('TC / VKN en fazla 11 karakter olabilir!');
                    return;
                  }
                }
                if (profileData.phone) {
                  const phoneClean = profileData.phone.replace(/\s/g, '');
                  if (phoneClean.length < 10) {
                    alert('Geçerli bir Türkiye telefon numarası giriniz! (Örn: 0532 123 45 67)');
                    return;
                  }
                }
                if (profileData.email) {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
                    alert('Geçerli bir e-posta adresi giriniz!');
                    return;
                  }
                }
                const updates = {
                  name: profileData.title,
                  taxId: profileData.taxId,
                  email: profileData.email,
                  phone: formatPhone(profileData.phone),
                  address: profileData.address
                };
                const result = await updateCustomer(customer.id, updates);
                if (!result || result.ok === false) {
                  alert(result?.error || 'Güncelleme başarısız. Lütfen tekrar deneyin.');
                  return;
                }
                // Header'daki musteri adini guncelle
                if (onSessionUpdate) {
                  onSessionUpdate(prev => ({ ...prev, name: profileData.title, taxId: profileData.taxId, email: profileData.email, phone: profileData.phone, address: profileData.address }));
                }
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

      {/* PREMIUM PASSWORD RESET MODAL */}
      {resetStep !== 'none' && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            maxWidth: '450px', width: '100%', background: '#fff',
            borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden', animation: 'modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* MODAL HEADER */}
            <div style={{
              padding: '24px 32px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '12px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#3b82f6', fontSize: '20px'
                }}>🔑</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                  {resetStep === 'sending' ? 'Kod Gönderiliyor' : 
                   resetStep === 'verify' ? 'Doğrulama Kodu' : 'Yeni Şifre'}
                </h3>
              </div>
              {resetStep !== 'sending' && (
                <button onClick={() => setResetStep('none')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              )}
            </div>

            <div style={{ padding: '32px' }}>
              {resetStep === 'sending' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div className="pulse-dot" style={{ width: '16px', height: '16px', margin: '0 auto 20px' }}></div>
                  <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600' }}>Sıfırlama kodu hazırlanıyor ve gönderiliyor...</p>
                </div>
              ) : resetStep === 'verify' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                      <strong>{customer.email || customer.eposta}</strong> adresine gönderilen 6 haneli kodu aşağıya giriniz.
                    </p>
                    <div style={{ display: 'inline-block', background: '#f8fafc', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>
                      {resetTimer > 0 ? `⏱️ ${Math.floor(resetTimer / 60)}:${(resetTimer % 60).toString().padStart(2, '0')} kaldı` : '⚠️ Süre doldu!'}
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="000000"
                      maxLength="6"
                      autoFocus
                      style={{
                        width: '100%', textAlign: 'center', fontSize: '32px', 
                        letterSpacing: '12px', fontWeight: '900', padding: '16px', 
                        borderRadius: '16px', border: '2px solid #e2e8f0',
                        color: '#1e293b', outline: 'none', transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = '#3b82f6'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      value={resetData.code}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setResetData({ ...resetData, code: val });
                      }}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (resetData.code.length !== 6) return alert('Lütfen 6 haneli kodu girin.');
                      try {
                        const res = await fetch(`${API_URL}/verify-reset-code`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: customer.email || customer.eposta, code: resetData.code })
                        });
                        if (res.ok) {
                          setResetStep('newpass');
                        } else {
                          const data = await res.json();
                          alert(data.error || 'Kod geçersiz veya süresi dolmuş.');
                        }
                      } catch (err) { alert('Bağlantı hatası: ' + err.message); }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#fff', border: 'none', padding: '16px', borderRadius: '16px',
                      fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                      boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    Kodu Doğrula
                  </button>

                  <button
                    onClick={() => setResetStep('none')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    İptal Et
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginBottom: '4px' }}>
                    Kimliğiniz doğrulandı. Lütfen yeni şifrenizi belirleyin.
                  </p>
                  
                  <div className="field-group">
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Yeni Şifre</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.reset ? 'text' : 'password'}
                        placeholder="••••••"
                        autoFocus
                        style={{ width: '100%', padding: '14px 44px 14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                        value={resetData.newPass}
                        onChange={e => setResetData({ ...resetData, newPass: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowPass(p => ({ ...p, reset: !p.reset }))} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                        {showPass.reset ? '🐵' : '🙈'}
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>Yeni Şifre (Tekrar)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.resetConfirm ? 'text' : 'password'}
                        placeholder="••••••"
                        style={{ width: '100%', padding: '14px 44px 14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                        value={resetData.confirmNewPass}
                        onChange={e => setResetData({ ...resetData, confirmNewPass: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowPass(p => ({ ...p, resetConfirm: !p.resetConfirm }))} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                        {showPass.resetConfirm ? '🐵' : '🙈'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (resetData.newPass.length < 3) return alert('Şifre en az 3 karakter olmalıdır.');
                      if (resetData.newPass !== resetData.confirmNewPass) return alert('Şifreler uyuşmuyor.');
                      try {
                        const res = await fetch(`${API_URL}/reset-password`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: customer.email || customer.eposta, code: resetData.code, newPassword: resetData.newPass })
                        });
                        if (res.ok) {
                          alert('Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz.');
                          setResetStep('none');
                          setShowPasswordSection(false);
                          // Session ve DataContext'teki müşteri şifresini güncelle
                          if (onSessionUpdate) onSessionUpdate(prev => ({ ...prev, sifre: resetData.newPass }));
                          // Admin panelinde de güncellensin
                          updateCustomer(customer.id, { password: resetData.newPass });
                        } else {
                          alert('Bir hata oluştu.');
                        }
                      } catch (err) { alert('Bağlantı hatası: ' + err.message); }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, #00d2ab 100%)',
                      color: '#fff', border: 'none', padding: '16px', borderRadius: '16px',
                      fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginTop: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 184, 148, 0.3)'
                    }}
                  >
                    Şifreyi Güncelle ve Bitir
                  </button>
                </div>
              )}
            </div>
          </div>
          <style>{`
            @keyframes modal-pop {
              from { opacity: 0; transform: scale(0.9) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
