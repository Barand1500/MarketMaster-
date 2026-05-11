import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

function PaginationBar({ currentPage, totalPages, pageSize, totalCount, onPageChange, onPageSizeChange, mobile }) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  // Sayfa numaralarını hesapla: max 5 buton göster
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i);
  }

  const containerStyle = mobile
    ? { display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 4px 80px', alignItems: 'center' }
    : { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
        <span>Sayfa başına:</span>
        {[5, 10, 20].map(n => (
          <button key={n} onClick={() => onPageSizeChange(n)} style={{
            padding: '4px 10px', borderRadius: '8px', border: '1px solid',
            borderColor: pageSize === n ? 'var(--primary)' : '#e2e8f0',
            background: pageSize === n ? 'rgba(0,184,148,0.08)' : '#fff',
            color: pageSize === n ? 'var(--primary)' : '#64748b',
            fontWeight: pageSize === n ? '800' : '600', cursor: 'pointer', fontSize: '12px'
          }}>{n}</button>
        ))}
        <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
          {totalCount > 0 ? `${start}–${end} / ${totalCount} ürün` : '0 ürün'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} style={pBtn(currentPage === 1)}>«</button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={pBtn(currentPage === 1)}>‹</button>
        {pages[0] > 1 && <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)} style={pBtn(false, p === currentPage)}>{p}</button>
        ))}
        {pages[pages.length - 1] < totalPages && <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={pBtn(currentPage === totalPages)}>›</button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} style={pBtn(currentPage === totalPages)}>»</button>
      </div>
    </div>
  );
}

function pBtn(disabled, active = false) {
  return {
    minWidth: '32px', height: '32px', borderRadius: '8px', border: '1px solid',
    borderColor: active ? 'var(--primary)' : '#e2e8f0',
    background: active ? 'var(--primary)' : disabled ? '#f8fafc' : '#fff',
    color: active ? '#fff' : disabled ? '#cbd5e1' : '#475569',
    fontWeight: '700', cursor: disabled ? 'default' : 'pointer', fontSize: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px'
  };
}

function PbSelect({ value, onChange, options, mobile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.id === value) || options[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`pb-select${mobile ? ' mobile' : ''}`} ref={ref}>
      <button type="button" className="pb-select-trigger" onMouseDown={e => e.preventDefault()} onClick={() => setOpen(o => !o)}>
        <span className="pb-symbol">{selected?.sembol}</span>
        <span className="pb-kisaad">{selected?.kisa_ad}</span>
        <span className="pb-arrow">▾</span>
      </button>
      {open && (
        <div className="pb-select-panel" onMouseDown={e => e.preventDefault()}>
          {options.map(pb => (
            <div key={pb.id} className={`pb-select-option${pb.id === value ? ' active' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(pb.id); setOpen(false); }}>
              <span className="pb-symbol">{pb.sembol}</span>
              <span className="pb-main">{pb.kisa_ad}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Products() {
  const { categories, products, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, units, addUnit, updateUnit, deleteUnit, markalar, addMarka, updateMarka, deleteMarka, kdvOranlari, addKdvOrani, updateKdvOrani, deleteKdvOrani, refetchKdvOranlari, siteSettings } = useData();

  // Para birimleri
  const [paraBirimleri, setParaBirimleri] = useState([{ id: 1, ad: 'Türk Lirası', kisa_ad: 'TRY', sembol: '₺' }]);
  useEffect(() => {
    fetch('/api/para-birimleri').then(r => r.ok ? r.json() : null).then(data => {
      if (Array.isArray(data) && data.length > 0) setParaBirimleri(data);
    }).catch(() => {});
  }, []);

  // Geçerli resim kaynağı kontrolü (bozuk/geçersiz gorsel_yolu için)
  const validImg = (src) => src && (src.startsWith('data:image/') || src.startsWith('http') || src.startsWith('/'));

  const [newRow, setNewRow] = useState({ name: '', price: '', unit: 'Kg', categoryIds: [], image: '', inStock: true, para_birimi_id: 1, marka_id: null, kdv_id: null, stok_kodu: '', kdv_dahil: true });
  const [editing, setEditing] = useState(null); // { id, field }
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(null);
  
  const [catDrop, setCatDrop] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  // Info popup state
  const [infoPopup, setInfoPopup] = useState(null); // product id or null

  // KDV modal state
  const [kdvModalDahil, setKdvModalDahil] = useState(true);
  const [kdvEditDahil, setKdvEditDahil] = useState(true);
  const [kdvError, setKdvError] = useState('');
  const [imgPreview, setImgPreview] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }

  // Floating tooltip for pm-item-name (avoids overflow clipping)
  const [pmTooltip, setPmTooltip] = useState(null); // { x, y } or null
  const [pmTooltipText, setPmTooltipText] = useState('');
  const pmTooltipTimer = useRef(null);
  const pmTooltipHandlers = {
    onMouseEnter: e => {
      const r = e.currentTarget.getBoundingClientRect();
      pmTooltipTimer.current = setTimeout(() => { setPmTooltipText(''); setPmTooltip({ x: r.left + r.width / 2, y: r.bottom + 6 }); }, 600);
    },
    onMouseLeave: () => { clearTimeout(pmTooltipTimer.current); setPmTooltip(null); },
  };
  const makeMiniAddHandlers = (text) => ({
    onMouseEnter: e => {
      const r = e.currentTarget.getBoundingClientRect();
      pmTooltipTimer.current = setTimeout(() => { setPmTooltipText(text); setPmTooltip({ x: r.left + r.width / 2, y: r.bottom + 6 }); }, 600);
    },
    onMouseLeave: () => { clearTimeout(pmTooltipTimer.current); setPmTooltip(null); },
  });
  // Marka modal görsel state
  const [modalMarkaGorsel, setModalMarkaGorsel] = useState(null);
  const modalMarkaGorselRef = useRef(null);
  
  const [modalSearch, setModalSearch] = useState('');
  const [modalInput, setModalInput] = useState('');
  const [modalParent, setModalParent] = useState('');
  const [modalError, setModalError] = useState('');

  const openModal = (type) => {
    setShowModal(type);
    setModalError('');
    setModalSearch('');
    setModalInput('');
    setModalParent('');
    setModalMarkaGorsel(null);
  };

  const fileInputRef = useRef(null);
  const editFileRef = useRef(null);
  const imgClickTimer = useRef(null);
  const mobileFileRef = useRef(null);
  const mobileAddFileRef = useRef(null);
  const excelFileRef = useRef(null);

  // Excel import state
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelStep, setExcelStep] = useState('guide'); // 'guide' | 'preview' | 'done'
  const [excelRows, setExcelRows] = useState([]);
  const [excelError, setExcelError] = useState('');
  const [excelLoading, setExcelLoading] = useState(false);

  // MOBİL: edit modal state
  const [mobileEdit, setMobileEdit] = useState(null); // { ...product fields }
  const [mobileEditCatSearch, setMobileEditCatSearch] = useState('');
  const [showMobileAdd, setShowMobileAdd] = useState(false);
  const [mobileAddCatSearch, setMobileAddCatSearch] = useState('');
  const [mobileLightbox, setMobileLightbox] = useState(null); // image src
  const dropRef = useRef(null);
  const editDropRef = useRef(null);

  // CLICK OUTSIDE TO CLOSE
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setCatDrop(false);
      if (editDropRef.current && !editDropRef.current.contains(e.target)) {
        if (editing?.field === 'categoryIds') setEditing(null);
      }
      // Close info popup when clicking outside
      if (infoPopup !== null) setInfoPopup(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing, infoPopup]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (showModal) { setShowModal(null); return; }
      if (showExcelModal) { setShowExcelModal(false); return; }
      if (showMobileAdd) { setShowMobileAdd(false); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal, showExcelModal, showMobileAdd]);

  const handleFile = (e, setter, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (isEdit) updateProduct(editing.id, { image: ev.target.result });
      else setter(p => ({ ...p, image: ev.target.result }));
    };
    reader.readAsDataURL(file);
    if (isEdit) setEditing(null);
  };

  const removeImage = (id) => {
    if (id === 'new') setNewRow(p => ({ ...p, image: '' }));
    else updateProduct(id, { image: '' });
  };

  const handleAdd = () => {
    if (!newRow.name.trim() || !newRow.price) return;
    const pb = paraBirimleri.find(x => x.id === (newRow.para_birimi_id || 1));
    const kdvItem = kdvOranlari.find(k => k.id === newRow.kdv_id);
    addProduct({ ...newRow, price: parseFloat(newRow.price), pbSembol: pb?.sembol || '₺', pbKisaAd: pb?.kisa_ad || 'TRY', pbKur: parseFloat(pb?.kur) || 1, kdv_orani: kdvItem?.oran ?? null, kdv_dahil: newRow.kdv_id ? (newRow.kdv_dahil ?? true) : null, stok_kodu: newRow.stok_kodu || null });
    setNewRow({ name: '', price: '', unit: 'Kg', categoryIds: [], image: '', inStock: true, para_birimi_id: 1, marka_id: null, kdv_id: null, stok_kodu: '', kdv_dahil: true });
    setCatDrop(false);
  };

  const handleBlur = (id, field, value) => {
    let finalValue = value;
    if (field === 'price') finalValue = parseFloat(value) || 0;
    updateProduct(id, { [field]: finalValue });
    setEditing(null);
  };

  const toggleCategory = (catId, currentIds, setter, isEdit = false, prodId = null) => {
    const newIds = currentIds.includes(catId)
      ? currentIds.filter(id => id !== catId)
      : [...currentIds, catId];
    
    if (isEdit) updateProduct(prodId, { categoryIds: newIds });
    else setter(p => ({ ...p, categoryIds: newIds }));
  };

  const getCategoryPath = (cat) => {
    if (!cat.parentId) return cat.name;
    const parent = categories.find(c => c.id === cat.parentId);
    return parent ? `${getCategoryPath(parent)} › ${cat.name}` : cat.name;
  };

  // Hiyerarşik kategori listesi oluştur (üst › alt sıralı)
  const buildCategoryTree = (search = '') => {
    const s = search.toLowerCase();
    const parents = categories.filter(c => !c.parentId && (
      !s || c.name.toLowerCase().includes(s) || categories.some(ch => ch.parentId === c.id && ch.name.toLowerCase().includes(s))
    ));
    const result = [];
    parents.forEach(p => {
      const children = categories.filter(c => c.parentId === p.id && (!s || c.name.toLowerCase().includes(s) || p.name.toLowerCase().includes(s)));
      const parentMatches = !s || p.name.toLowerCase().includes(s);
      if (parentMatches || children.length > 0) {
        result.push({ ...p, isSub: false });
        children.forEach(ch => result.push({ ...ch, isSub: true, parentName: p.name }));
      }
    });
    // Üst kategorisi olmayan (orphan) alt kategoriler de ekle
    categories.filter(c => c.parentId && !categories.find(p => p.id === c.parentId)).forEach(c => {
      if (!s || c.name.toLowerCase().includes(s)) result.push({ ...c, isSub: false });
    });
    return result;
  };

  // Kategori seçim paneli (add-row ve edit için ortak)
  const CatDropPanel = ({ currentIds, onToggle, onClose, search, setSearch }) => {
    const tree = buildCategoryTree(search);
    return (
      <div className="cat-drop-panel" onClick={e => e.stopPropagation()}>
        <div className="cat-drop-search">
          <input type="text" placeholder="Kategori ara..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="cat-drop-scroll">
          {tree.length === 0 && <div style={{ padding: '8px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Sonuç yok</div>}
          {tree.map(c => (
            <label key={c.id} className={`cat-label${c.isSub ? ' cat-sub' : ''}`} onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={currentIds.includes(c.id)} onChange={() => onToggle(c.id)} />
              <span className="cat-label-text">
                {c.isSub && <span className="cat-parent-prefix">↳ </span>}
                {c.name}
              </span>
            </label>
          ))}
        </div>
        <button className="cat-drop-close-btn" onClick={onClose}>Tamam</button>
      </div>
    );
  };

  const fmtPrice = (n, sembol) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + (sembol || '₺');

  // Sayfalama hesaplama
  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Arama değişince 1. sayfaya dön
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const handleAddModal = async () => {
    if (showModal === 'kdv') {
      setKdvError('');
      const oranVal = parseFloat(modalInput);
      if (isNaN(oranVal) || oranVal < 0 || oranVal > 100) {
        setKdvError('Lütfen 0-100 arasında geçerli bir oran girin.');
        return;
      }
      const exists = kdvOranlari.some(k => parseFloat(k.oran) === oranVal);
      if (exists) { setKdvError(`%${oranVal} oranı zaten mevcut.`); return; }
      const result = await addKdvOrani(oranVal);
      if (result?.ok) { await refetchKdvOranlari(); setModalInput(''); }
      else setKdvError(result?.error || 'KDV oranı eklenemedi.');
      return;
    }
    setModalError('');
    if (!modalInput.trim()) return;
    const trimmed = modalInput.trim();
    if (showModal === 'units') {
      const dup = units.some(u => u.name.toLowerCase() === trimmed.toLowerCase());
      if (dup) { setModalError(`"${trimmed}" adlı birim zaten mevcut.`); return; }
      addUnit(trimmed);
    } else if (showModal === 'categories') {
      const dup = categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase() && (c.parentId || null) === (modalParent ? parseInt(modalParent) : null));
      if (dup) { setModalError(`"${trimmed}" adlı kategori zaten mevcut.`); return; }
      addCategory(trimmed, modalParent || null);
    } else if (showModal === 'markalar') {
      const dup = markalar.some(m => m.ad.toLowerCase() === trimmed.toLowerCase());
      if (dup) { setModalError(`"${trimmed}" adlı marka zaten mevcut.`); return; }
      addMarka(trimmed, modalMarkaGorsel);
      setModalMarkaGorsel(null);
    }
    setModalInput('');
  };

  const [modalEditing, setModalEditing] = useState({ id: null, type: null });
  const [modalEditValue, setModalEditValue] = useState('');

  const renderModalList = () => {
    if (showModal === 'units') {
      const filtered = units.filter(u => u.name.toLowerCase().includes(modalSearch.toLowerCase()));
      if (filtered.length === 0) return <div className="pm-empty">Sonuç bulunamadı.</div>;
      return filtered.map(u => (
        <div key={u.id} className="pm-item">
          <div className="pm-item-left">
            <span className="pm-item-icon">⚖️</span>
            {modalEditing.id === u.id && modalEditing.type === 'unit' ? (
              <input
                autoFocus
                className="inline-edit"
                value={modalEditValue}
                onChange={e => setModalEditValue(e.target.value)}
                onBlur={() => {
                  if (modalEditValue.trim() && modalEditValue !== u.name) updateUnit(u.id, modalEditValue.trim());
                  setModalEditing({ id: null, type: null });
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') setModalEditing({ id: null, type: null });
                }}
                style={{ minWidth: 80 }}
              />
            ) : (
              <span
                className="pm-item-name"
                onDoubleClick={() => {
                  setModalEditing({ id: u.id, type: 'unit' });
                  setModalEditValue(u.name);
                }}
                {...pmTooltipHandlers}
                style={{ cursor: 'pointer' }}
              >
                {u.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-del" onClick={() => {
              setConfirmModal({ message: `"${u.name}" birimini silmek istiyor musunuz?`, onConfirm: () => deleteUnit(u.id) });
            }}>✕</button>
          </div>
        </div>
      ));
    }

    if (showModal === 'categories') {
      let list = categories.map(c => ({ ...c, path: getCategoryPath(c) }));
      if (modalSearch.trim()) {
        list = list.filter(c => c.path.toLowerCase().includes(modalSearch.toLowerCase()));
      } else {
        list.sort((a, b) => a.path.localeCompare(b.path));
      }
      if (list.length === 0) return <div className="pm-empty">Sonuç bulunamadı.</div>;
      return list.map(c => (
        <div key={c.id} className="pm-item" style={{ padding: '6px 10px' }}>
          <div className="pm-item-left">
            <span className="pm-item-icon" style={{ fontSize: '12px' }}>{c.parentId ? '↳' : '📁'}</span>
            <div>
              {modalEditing.id === c.id && modalEditing.type === 'category' ? (
                <input
                  autoFocus
                  className="inline-edit"
                  value={modalEditValue}
                  onChange={e => setModalEditValue(e.target.value)}
                  onBlur={() => {
                    if (modalEditValue.trim() && modalEditValue !== c.name) updateCategory(c.id, modalEditValue.trim());
                    setModalEditing({ id: null, type: null });
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') setModalEditing({ id: null, type: null });
                  }}
                  style={{ minWidth: 80 }}
                />
              ) : (
                <div
                  className="pm-item-name"
                  onDoubleClick={() => {
                    setModalEditing({ id: c.id, type: 'category' });
                    setModalEditValue(c.name);
                  }}
                  {...pmTooltipHandlers}
                  style={{ cursor: 'pointer', fontSize: '12px' }}
                >
                  {c.name}
                </div>
              )}
              {c.parentId && <div className="pm-item-path">{c.path}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-del" onClick={() => {
              setConfirmModal({ message: `"${c.name}" kategorisini silmek istiyor musunuz?`, onConfirm: () => deleteCategory(c.id) });
            }}>✕</button>
          </div>
        </div>
      ));
    }

    if (showModal === 'kdv') {
      if (kdvOranlari.length === 0) return <div className="pm-empty">Henüz KDV oranı eklenmemiş.</div>;
      return kdvOranlari.map(k => {
        const isEditing = modalEditing.id === k.id && modalEditing.type === 'kdv';
        return (
          <div key={k.id} className="pm-item">
            <div className="pm-item-left" style={{ flex: 1 }}>
              <span className="pm-item-icon" style={{ color: '#16a34a' }}>%</span>
              {isEditing ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
                  <input
                    autoFocus
                    type="number"
                    className="inline-edit"
                    value={modalEditValue}
                    min="0" max="100" step="0.1"
                    onChange={e => setModalEditValue(e.target.value)}
                    style={{ width: 60 }}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const v = parseFloat(modalEditValue);
                        if (!isNaN(v) && v >= 0) await updateKdvOrani(k.id, v);
                        setModalEditing({ id: null, type: null });
                      }
                      if (e.key === 'Escape') setModalEditing({ id: null, type: null });
                    }}
                  />
                  <button
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid #10b981', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                    onClick={async () => {
                      const v = parseFloat(modalEditValue);
                      if (!isNaN(v) && v >= 0) await updateKdvOrani(k.id, v);
                      setModalEditing({ id: null, type: null });
                    }}
                  >✓</button>
                </div>
              ) : (
                <span
                  className="pm-item-name"
                  style={{ fontWeight: 700, fontSize: 13, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 6, cursor: 'pointer' }}
                  onDoubleClick={() => {
                    setModalEditing({ id: k.id, type: 'kdv' });
                    setModalEditValue(String(parseFloat(k.oran)));
                  }}
                  {...pmTooltipHandlers}
                >
                  %{parseFloat(k.oran)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="pm-item-del" onClick={() => {
                setConfirmModal({ message: `"%${parseFloat(k.oran)}" KDV oranını silmek istiyor musunuz?`, onConfirm: () => deleteKdvOrani(k.id) });
              }}>✕</button>
            </div>
          </div>
        );
      });
    }

    if (showModal === 'markalar') {
      const filtered = markalar.filter(m => m.ad.toLowerCase().includes(modalSearch.toLowerCase()));
      if (filtered.length === 0) return <div className="pm-empty">Sonuç bulunamadı.</div>;
      return filtered.map(m => (
        <div key={m.id} className="pm-item">
          <div className="pm-item-left">
            <div style={{ position: 'relative', cursor: 'pointer' }} title="Görseli değiştirmek için tıkla" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => updateMarka(m.id, m.ad, ev.target.result);
                reader.readAsDataURL(file);
              };
              input.click();
            }}>
              {m.gorsel ? (
                <img src={m.gorsel} alt={m.ad} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, border: '1.5px solid #d1fae5', background: '#f8fafc' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 6, border: '1.5px dashed #d1d5db', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📷</div>
              )}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <span style={{ fontSize: 12, color: '#fff' }}>✏️</span>
              </div>
              {m.gorsel && (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmModal({ message: `"${m.ad}" markasının görselini silmek istiyor musunuz?`, onConfirm: () => updateMarka(m.id, m.ad, null) }); }}
                  style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 3 }}
                >×</button>
              )}
            </div>
            {modalEditing.id === m.id && modalEditing.type === 'marka' ? (
              <input
                autoFocus
                className="inline-edit"
                value={modalEditValue}
                onChange={e => setModalEditValue(e.target.value)}
                onBlur={() => {
                  if (modalEditValue.trim() && modalEditValue !== m.ad) updateMarka(m.id, modalEditValue.trim(), m.gorsel);
                  setModalEditing({ id: null, type: null });
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') setModalEditing({ id: null, type: null });
                }}
                style={{ minWidth: 80 }}
              />
            ) : (
              <span
                className="pm-item-name"
                onDoubleClick={() => {
                  setModalEditing({ id: m.id, type: 'marka' });
                  setModalEditValue(m.ad);
                }}
                {...pmTooltipHandlers}
                style={{ cursor: 'pointer' }}
              >
                {m.ad}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-del" onClick={() => {
              setConfirmModal({ message: `"${m.ad}" markasını silmek istiyor musunuz?`, onConfirm: () => deleteMarka(m.id) });
            }}>✕</button>
          </div>
        </div>
      ));
    }
  };

  return (
    <div className="page-container wide">
      <PageHeader 
        title="📦 Ürün ve Stok Yönetimi"
        sub="Ürün Veritabanı ve Stok Yönetimi"
        actions={
          <button onClick={() => { setShowExcelModal(true); setExcelStep('guide'); setExcelRows([]); setExcelError(''); }} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            borderRadius: '10px', border: '1.5px solid #22c55e', background: 'rgba(34,197,94,0.07)',
            color: '#16a34a', fontWeight: '700', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            📅 Excel'den Yükle
          </button>
        } 
        helpContent={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Ürün Nasıl Eklenir?</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Tablonun en üst satırı boş bırakılmıştır, orası yeni ürün eklemek içindir. Ürün adını, fiyatını ve birimini yazın, ardından sağdaki <strong>EKLE</strong> butonuna basın ya da klavyenizden <strong>Enter</strong>'a tıklayın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Mevcut Ürünü Değiştirmek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ürün adı, fiyat veya birim üzerine <strong>çift tıklayın</strong> — alan anında düzenleme moduna geçer. Değişikliği yazıp <strong>Enter</strong>'a basın veya başka bir yere tıklayın, otomatik kaydedilir.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📷 Ürün Görseli Eklemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Satırdaki kamera ikonuna tıklayın, bilgisayarınızdan bir resim seçin. Resim otomatik olarak kaydedilir ve müşterilere gösterilir.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🏷️ Kategoriler ve ⚖️ Birimler</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Tablo başlığındaki <strong>Kategoriler +</strong> ve <strong>Birim +</strong> butonları ile yeni kategori veya birim (kg, adet, demet vb.) ekleyebilirsiniz. Her ürüne birden fazla kategori atayabilirsiniz.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📦 Stok Durumu (VAR / YOK)</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Stok sütunundaki butona tıklayarak ürünü <strong>VAR</strong> veya <strong>YOK</strong> olarak işaretleyebilirsiniz. YOK olarak işaretlenen ürünler müşteri ekranında soluk ve "Stokta Yok" yazılı görünür.</div>
            </div>
            <div className="help-tip">
              <strong>💡 İpucu:</strong> Üstteki arama kutusuna yazarak ürünleri anında filtreleyebilirsiniz. Sayfa başına kaç ürün göreceğinizi sağ alttaki 5 / 10 / 20 butonlarıyla ayarlayabilirsiniz.
            </div>
          </div>
        }
        helpContentMobile={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>➕ Yeni Ürün Eklemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ekranın sağ alt köşesindeki büyük yeşil <strong>+</strong> butonuna dokunun. Açılan formda ürün bilgilerini doldurup <strong>Kaydet</strong>'e basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>✏️ Ürün Düzenlemek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ürün kartındaki kalem <strong>✏️</strong> ikonuna dokunun. Açılan ekranda ad, fiyat, birim, kategori ve görseli değiştirip <strong>Kaydet</strong>'e basın.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📦 Stok Durumu Değiştirmek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Ürün kartının sağındaki <strong>VAR</strong> veya <strong>YOK</strong> butonuna dokunun — stok durumu anında değişir ve kaydedilir.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>🗑️ Ürün Silmek</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Kalem ikonuna dokunduktan sonra altta beliren <strong>🗑️ Sil</strong> butonuna basın. Onay istenecek, onayladıktan sonra ürün silinir.</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '13px 14px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>📁 Kategori ve Birim Yönetimi</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>Listenin üstündeki <strong>Kategori Yönetimi</strong> ve <strong>Birim Yönetimi</strong> butonlarına dokunarak yeni kategori veya birim ekleyip mevcut olanları silebilirsiniz.</div>
            </div>
            <div className="help-tip">
              <strong>💡 İpucu:</strong> Arama kutusuna yazarak ürünleri anında filtreleyebilirsiniz.
            </div>
          </div>
        }
      />

      <div className="card excel-card shadow-sm">
        <div className="table-header-toolbar">
          <div className="toolbar-left">
            <h2 className="toolbar-title">Stok Listesi <span className="count-badge" style={{ marginLeft: '8px', verticalAlign: 'middle' }}>{products.length} Ürün</span></h2>
          </div>
          <div className="toolbar-right">
            <div className="premium-search">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Hızlı ara..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="table-wrap overflow-visible">
          <table className="excel-table">
            <thead>
              <tr className="th-row">
                <th style={{ width: '80px' }}>Görsel</th>
                <th>Ürün Adı</th>
                <th style={{ width: '130px' }}>Fiyat</th>
                <th style={{ width: '120px' }}>KDV <button className="mini-add-btn" onClick={() => { clearTimeout(pmTooltipTimer.current); setPmTooltip(null); openModal('kdv'); }} {...makeMiniAddHandlers('KDV oranı ekle')}>+</button></th>
                <th style={{ width: '120px' }}>Birim <button className="mini-add-btn" onClick={() => { clearTimeout(pmTooltipTimer.current); setPmTooltip(null); openModal('units'); }} {...makeMiniAddHandlers('Birim ekle')}>+</button></th>
                <th style={{ width: '230px' }}>Kategoriler <button className="mini-add-btn" onClick={() => { clearTimeout(pmTooltipTimer.current); setPmTooltip(null); openModal('categories'); }} {...makeMiniAddHandlers('Kategori ekle')}>+</button></th>
                <th style={{ width: '150px' }}>Marka <button className="mini-add-btn" onClick={() => { clearTimeout(pmTooltipTimer.current); setPmTooltip(null); openModal('markalar'); }} {...makeMiniAddHandlers('Marka ekle')}>+</button></th>
                <th style={{ width: '90px', textAlign: 'center' }}>Stok</th>
                <th style={{ width: '80px', textAlign: 'center' }}>İşlem</th>
              </tr>
              <tr className="add-row">
                <td>
                  <div className="add-img-box">
                    {validImg(newRow.image) ? (
                      <div className="thumb-container">
                        <img src={newRow.image} />
                        <button className="img-clear" onClick={() => removeImage('new')}>×</button>
                      </div>
                    ) : <span onClick={() => fileInputRef.current.click()}>📷</span>}
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => handleFile(e, setNewRow)} />
                  </div>
                </td>
                <td>
                  <input type="text" className="lite-input" placeholder="Stok Kodu / Barkod..." value={newRow.stok_kodu} onChange={e => setNewRow(p => ({ ...p, stok_kodu: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} style={{ marginBottom: 4, fontSize: 11, color: '#6b7280' }} />
                  <input type="text" className="lite-input" placeholder="Ürün Adı..." value={newRow.name} onChange={e => { const el=e.target, s=el.selectionStart, n=el.selectionEnd, v=el.value.toLocaleUpperCase('tr-TR'); setNewRow({...newRow, name:v}); requestAnimationFrame(()=>{ if(document.activeElement===el) el.setSelectionRange(s,n); }); }} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                </td>
                <td><input type="text" className="lite-input" placeholder="0.00" value={newRow.price} onChange={e => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                  setNewRow({...newRow, price: val});
                }} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                {paraBirimleri.length > 1 && (
                  <div style={{ marginTop: '3px' }}>
                    <PbSelect value={newRow.para_birimi_id} onChange={id => setNewRow({...newRow, para_birimi_id: id})} options={paraBirimleri} />
                  </div>
                )}
                </td>
                <td>
                  <select className="lite-select" value={newRow.kdv_id || ''} onChange={e => {
                    const id = e.target.value ? parseInt(e.target.value) : null;
                    setNewRow(p => ({ ...p, kdv_id: id }));
                  }}>
                    <option value="">KDV Yok</option>
                    {kdvOranlari.map(k => (
                      <option key={k.id} value={k.id}>%{parseFloat(k.oran)}</option>
                    ))}
                  </select>
                  <button
                    style={{ marginTop: 4, display: 'block', width: '100%', boxSizing: 'border-box', fontSize: 11, padding: '4px 10px', borderRadius: 6,
                      border: newRow.kdv_id ? `1px solid ${newRow.kdv_dahil ? '#bbf7d0' : '#fecaca'}` : '1px solid #e2e8f0',
                      background: newRow.kdv_id ? (newRow.kdv_dahil ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
                      color: newRow.kdv_id ? (newRow.kdv_dahil ? '#16a34a' : '#dc2626') : '#94a3b8',
                      cursor: newRow.kdv_id ? 'pointer' : 'default', fontWeight: 700 }}
                    onClick={() => newRow.kdv_id && setNewRow(p => ({ ...p, kdv_dahil: !p.kdv_dahil }))}
                  >
                    {newRow.kdv_id ? (newRow.kdv_dahil ? 'Dahil' : 'Hariç') : '—'}
                  </button>
                </td>
                <td>
                  <select className="lite-select" value={newRow.unit} onChange={e => setNewRow({...newRow, unit: e.target.value})}>
                    {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </td>
                <td>
                  <div className="cat-drop-wrapper" ref={dropRef}>
                    <button className="cat-drop-btn" onClick={(e) => { e.stopPropagation(); setCatDrop(!catDrop); }}>
                      <span>{newRow.categoryIds.length > 0 ? `${newRow.categoryIds.length} Seçili` : 'Seç...'}</span>
                    </button>
                    {catDrop && (
                      <CatDropPanel
                        currentIds={newRow.categoryIds}
                        onToggle={id => toggleCategory(id, newRow.categoryIds, setNewRow)}
                        onClose={() => setCatDrop(false)}
                        search={catSearch}
                        setSearch={setCatSearch}
                      />
                    )}
                  </div>
                </td>
                {/* Marka — add row */}
                <td>
                  <select
                    className="lite-select"
                    value={newRow.marka_id || ''}
                    onChange={e => {
                      const id = e.target.value ? parseInt(e.target.value) : null;
                      setNewRow(p => ({ ...p, marka_id: id }));
                    }}
                  >
                    <option value="">— Marka Yok —</option>
                    {markalar.map(m => (
                      <option key={m.id} value={m.id}>{m.ad}</option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => setNewRow(p => ({ ...p, inStock: !p.inStock }))}
                    style={{ background: newRow.inStock ? 'var(--primary)' : 'var(--danger)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                  >
                    {newRow.inStock ? 'VAR' : 'YOK'}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}><button className="lite-add-btn" onClick={handleAdd} title="Ürün ekle">+</button></td>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map(p => {
                const isEditingCats = editing?.id == p.id && editing?.field === 'categoryIds';
                return (
                  <tr key={p.id} className={isEditingCats ? 'editing-row' : ''}>
                    <td>
                      <div className="thumb-box">
                        {validImg(p.image) ? (
                          <div className="thumb-container">
                            <img src={p.image} onClick={() => {
                              if (imgClickTimer.current) {
                                clearTimeout(imgClickTimer.current);
                                imgClickTimer.current = null;
                                setEditing({ id: p.id, field: 'image' });
                                setTimeout(() => editFileRef.current.click(), 50);
                              } else {
                                imgClickTimer.current = setTimeout(() => {
                                  imgClickTimer.current = null;
                                  setImgPreview(p.image);
                                }, 220);
                              }
                            }} style={{ cursor: 'zoom-in' }} />
                            <button className="img-clear" onClick={() => removeImage(p.id)}>×</button>
                          </div>
                        ) : <span onDoubleClick={() => { setEditing({ id: p.id, field: 'image' }); setTimeout(() => editFileRef.current.click(), 50); }}>🍎</span>}
                        <input type="file" ref={editFileRef} hidden accept="image/*" onChange={e => handleFile(e, null, true)} />
                      </div>
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'name' })}>
                      {editing?.id === p.id && editing?.field === 'stok_kodu' ? (
                        <input autoFocus className="inline-edit" defaultValue={p.stokKodu || ''} placeholder="Stok Kodu / Barkod..." onFocus={e => e.target.select()} onBlur={async (e) => { const result = await updateProduct(p.id, { stok_kodu: e.target.value.trim() || null }); if (result?.status === 409) alert('Bu stok kodu zaten kullanılıyor.'); setEditing(null); }} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }} style={{ marginBottom: 3, fontSize: 11 }} />
                      ) : (
                        <div onDoubleClick={e => { e.stopPropagation(); setEditing({ id: p.id, field: 'stok_kodu' }); }} style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, cursor: 'pointer', minHeight: 14 }} {...pmTooltipHandlers}>
                          {p.stokKodu ? p.stokKodu : <span style={{ opacity: 0.4 }}>stok kodu yok</span>}
                        </div>
                      )}
                      {editing?.id === p.id && editing?.field === 'name' ? (
                        <input autoFocus className="inline-edit" defaultValue={p.name} onFocus={e => e.target.select()} onChange={e => { const s=e.target.selectionStart, n=e.target.selectionEnd; e.target.value=e.target.value.toLocaleUpperCase('tr-TR'); e.target.setSelectionRange(s,n); }} onBlur={(e) => handleBlur(p.id, 'name', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <span className="edit-txt">{p.name}</span>
                      )}
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'price' })}>
                      {editing?.id === p.id && editing?.field === 'price' ? (
                        <div>
                          <input autoFocus type="text" className="inline-edit" defaultValue={p.price} onFocus={e => e.target.select()} onInput={e => {
                            let val = e.target.value.replace(/[^0-9.]/g, '');
                            if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                            e.target.value = val;
                          }} onBlur={(e) => {
                            if (e.relatedTarget && (e.relatedTarget.tagName === 'SELECT' || e.relatedTarget.closest?.('.pb-select'))) return;
                            handleBlur(p.id, 'price', e.target.value);
                          }} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                          {paraBirimleri.length > 1 && (
                            <div style={{ marginTop: '3px' }}>
                              <PbSelect value={p.para_birimi_id || 1} onChange={id => {
                                const pb = paraBirimleri.find(x => x.id === id);
                                updateProduct(p.id, { para_birimi_id: id, pbSembol: pb?.sembol || '₺', pbKisaAd: pb?.kisa_ad || 'TRY' });
                              }} options={paraBirimleri} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="edit-txt price">{fmtPrice(p.price, p.pbSembol)}</span>
                      )}
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'kdv' })}>
                      {editing?.id === p.id && editing?.field === 'kdv' ? (
                        <div>
                          <select autoFocus className="lite-select"
                            defaultValue={kdvOranlari.find(k => parseFloat(k.oran) === parseFloat(p.kdvOrani))?.id || ''}
                            onBlur={() => setEditing(null)}
                            onChange={e => {
                              const id = e.target.value ? parseInt(e.target.value) : null;
                              const kdvItem = kdvOranlari.find(k => k.id === id);
                              updateProduct(p.id, { kdv_orani: kdvItem?.oran ?? null, kdv_dahil: kdvItem != null ? (p.kdvDahil ?? true) : null });
                              setEditing(null);
                            }}>
                            <option value="">KDV Yok</option>
                            {kdvOranlari.map(k => (
                              <option key={k.id} value={k.id}>%{parseFloat(k.oran)}</option>
                            ))}
                          </select>
                          {p.kdvOrani !== null && p.kdvOrani !== undefined && (
                            <button
                              style={{ marginTop: 4, display: 'block', width: '100%', boxSizing: 'border-box', fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${p.kdvDahil !== 0 ? '#bbf7d0' : '#fecaca'}`, background: p.kdvDahil !== 0 ? '#f0fdf4' : '#fef2f2', color: p.kdvDahil !== 0 ? '#16a34a' : '#dc2626', cursor: 'pointer', fontWeight: 700 }}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => updateProduct(p.id, { kdv_dahil: p.kdvDahil !== 0 ? 0 : 1 })}
                            >
                              {p.kdvDahil !== 0 ? 'Dahil' : 'Hariç'}
                            </button>
                          )}
                        </div>
                      ) : p.kdvOrani !== null && p.kdvOrani !== undefined ? (
                        <span className="badge-unit" style={{
                          background: p.kdvDahil !== 0 ? '#f0fdf4' : '#fef2f2',
                          color: p.kdvDahil !== 0 ? '#16a34a' : '#dc2626',
                          border: `1px solid ${p.kdvDahil !== 0 ? '#bbf7d0' : '#fecaca'}`
                        }}>
                          %{parseFloat(p.kdvOrani)} {p.kdvDahil !== 0 ? 'Dahil' : 'Hariç'}
                        </span>
                      ) : (
                        <span className="no-data">YOK</span>
                      )}
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'unit' })}>
                      {editing?.id === p.id && editing?.field === 'unit' ? (
                        <select autoFocus className="lite-select" defaultValue={p.unit} onBlur={e => handleBlur(p.id, 'unit', e.target.value)} onChange={e => handleBlur(p.id, 'unit', e.target.value)}>
                          {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                      ) : (
                        <span className="badge-unit">{p.unit}</span>
                      )}
                    </td>
                    <td onDoubleClick={(e) => { e.stopPropagation(); setEditing({ id: p.id, field: 'categoryIds' }); setCatSearch(''); }}>
                      <div className="cat-drop-wrapper" ref={isEditingCats ? editDropRef : null}>
                        <div className="badge-group" style={{ cursor: 'default' }}>
                          {p.categoryIds.length > 0 ? p.categoryIds.map(cid => {
                            const cat = categories.find(c => c.id === cid);
                            if (!cat) return null;
                            return (
                              <span key={cid} className="badge-cat" title={getCategoryPath(cat)}>
                                {cat.parentId ? <span style={{ color: '#94a3b8', marginRight: 2 }}>↳</span> : null}
                                {cat.name}
                              </span>
                            );
                          }) : <span className="no-data">YOK</span>}
                        </div>
                        {isEditingCats && (
                          <CatDropPanel
                            currentIds={p.categoryIds}
                            onToggle={id => toggleCategory(id, p.categoryIds, null, true, p.id)}
                            onClose={() => setEditing(null)}
                            search={catSearch}
                            setSearch={setCatSearch}
                          />
                        )}
                      </div>
                    </td>
                    {/* Marka */}
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'marka' })}>
                      {editing?.id === p.id && editing?.field === 'marka' ? (
                        <select
                          autoFocus
                          className="lite-select"
                          defaultValue={p.markaId || ''}
                          onBlur={() => setEditing(null)}
                          onChange={e => {
                            const id = e.target.value ? parseInt(e.target.value) : null;
                            updateProduct(p.id, { marka_id: id });
                            setEditing(null);
                          }}
                        >
                          <option value="">— Marka Yok —</option>
                          {markalar.map(m => (
                            <option key={m.id} value={m.id}>{m.ad}</option>
                          ))}
                        </select>
                      ) : p.markaId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {p.markaAd
                            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{p.markaAd}</span>
                            : p.markaGorsel
                              ? <img src={p.markaGorsel} alt="marka" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
                              : null
                          }
                        </div>
                      ) : (
                        <span className="no-data">YOK</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => updateProduct(p.id, { inStock: !p.inStock })}
                        style={{ background: p.inStock ? 'rgba(0, 184, 148, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: p.inStock ? 'var(--primary)' : 'var(--danger)', border: `1px solid ${p.inStock ? 'rgba(0, 184, 148, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
                      >
                        {p.inStock ? 'VAR' : 'YOK'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', position: 'relative' }}>
                        <button className="del-btn-icon" title="Bilgi" onClick={() => setInfoPopup(infoPopup === p.id ? null : p.id)} style={{ fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>ℹ️</button>
                        <button className="del-btn-icon" onClick={() => setConfirm(p.id)}>🗑</button>
                        {infoPopup === p.id && (
                          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '110%', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '14px 16px', minWidth: '220px', zIndex: 999, textAlign: 'left' }}>
                            <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#94a3b8' }}>Eklenme</span>
                                <span style={{ color: '#0f172a' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') + ' ' + new Date(p.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#94a3b8' }}>Bilgi Güncelleme</span>
                                <span style={{ color: '#0f172a' }}>{p.lastInfoChange ? new Date(p.lastInfoChange).toLocaleDateString('tr-TR') + ' ' + new Date(p.lastInfoChange).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Değişmedi'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#94a3b8' }}>Fiyat Güncelleme</span>
                                <span style={{ color: p.lastPriceChange ? '#0f172a' : '#94a3b8' }}>{p.lastPriceChange ? new Date(p.lastPriceChange).toLocaleDateString('tr-TR') + ' ' + new Date(p.lastPriceChange).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Değişmedi'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* DESKTOP SAYFALAMA */}
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredProducts.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={v => { setPageSize(v); setCurrentPage(1); }}
        />
      </div>

      {/* ===================== MOBİL KART LİSTESİ ===================== */}
      <div className="mobile-product-list">
        {/* Yönetim butonları */}
        <div className="mobile-manage-row">
          <button className="mobile-manage-btn" onClick={() => openModal('categories')}>
            <span>📁</span> Kategori Yönetimi
          </button>
          <button className="mobile-manage-btn" onClick={() => openModal('units')}>
            <span>⚖️</span> Birim Yönetimi
          </button>
          <button className="mobile-manage-btn" onClick={() => openModal('markalar')}>
            <span>🏷️</span> Marka Yönetimi
          </button>
          <button className="mobile-manage-btn" onClick={() => openModal('kdv')}>
            <span>🧾</span> KDV Yönetimi
          </button>
        </div>

        <div className="mobile-search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {pagedProducts.map(p => (
          <div key={p.id} className="mobile-product-card">
            <div className="mobile-card-img" onClick={() => validImg(p.image) && setMobileLightbox(p.image)} style={{ cursor: validImg(p.image) ? 'zoom-in' : 'default' }}>
              {validImg(p.image) ? <img src={p.image} alt={p.name} /> : <span>🍎</span>}
            </div>
            <div className="mobile-card-info">
              <div className="mobile-card-name">{p.name}</div>
              <div className="mobile-card-meta">
                <span className="mobile-card-price">{fmtPrice(p.price, p.pbSembol)}</span>
                <span className="mobile-card-unit">{p.unit}</span>
              </div>
              {p.categoryIds.length > 0 && (
                <div className="mobile-card-cats">
                  {p.categoryIds.slice(0,2).map(cid => {
                    const cat = categories.find(c => c.id === cid);
                    return cat ? <span key={cid} className="mobile-cat-badge">{cat.name}</span> : null;
                  })}
                  {p.categoryIds.length > 2 && <span className="mobile-cat-badge">+{p.categoryIds.length - 2}</span>}
                </div>
              )}
            </div>
            <div className="mobile-card-actions">
              <button
                className={`mobile-stock-btn ${p.inStock ? 'in' : 'out'}`}
                onClick={() => updateProduct(p.id, { inStock: !p.inStock })}
              >{p.inStock ? 'VAR' : 'YOK'}</button>
              <button className="mobile-edit-btn" onClick={() => {
                setMobileEdit({ id: p.id, name: p.name, price: String(p.price), unit: p.unit || 'Kg', categoryIds: [...p.categoryIds], image: p.image || '', inStock: p.inStock, para_birimi_id: p.para_birimi_id || 1, marka_id: p.markaId || null, kdv_id: p.kdvId || null, kdv_dahil: p.kdvDahil ?? true });
                setMobileEditCatSearch('');
              }}>✏️</button>
              <button className="mobile-del-btn" onClick={() => setConfirm(p.id)}>🗑</button>
            </div>
          </div>
        ))}

        {/* MOBİL SAYFALAMA */}
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredProducts.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={v => { setPageSize(v); setCurrentPage(1); }}
          mobile
        />

        {/* FAB - Yeni Ürün Ekle */}
        <button className="mobile-fab" onClick={() => { setShowMobileAdd(true); setNewRow({ name: '', price: '', unit: units[0]?.name || 'Kg', categoryIds: [], image: '', inStock: true, para_birimi_id: 1, marka_id: null, kdv_id: null, stok_kodu: '', kdv_dahil: true }); setMobileAddCatSearch(''); }}>＋</button>
      </div>

      {/* ===================== MOBİL RESİM LIGHTBOX ===================== */}
      {mobileLightbox && (
        <div onClick={() => setMobileLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <img src={mobileLightbox} alt="Ürün görseli" style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
          <button onClick={() => setMobileLightbox(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      {/* ===================== MOBİL DÜZENLEME MODALI ===================== */}
      {mobileEdit && (
        <div className="modal-overlay" onClick={() => setMobileEdit(null)}>
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Ürünü Düzenle</span>
              <button onClick={() => setMobileEdit(null)}>✕</button>
            </div>
            <div className="mobile-modal-body">

              {/* Görsel */}
              <div className="mobile-field-row">
                <div className="mobile-img-box" onClick={() => mobileFileRef.current.click()}>
                  {validImg(mobileEdit.image) ? <img src={mobileEdit.image} alt="" /> : <span>📷</span>}
                </div>
                <input type="file" ref={mobileFileRef} hidden accept="image/*" onChange={e => {
                  const file = e.target.files[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setMobileEdit(prev => ({ ...prev, image: ev.target.result }));
                  reader.readAsDataURL(file);
                }} />
                {mobileEdit.image && <button className="mobile-img-clear" onClick={() => setMobileEdit(prev => ({ ...prev, image: '' }))}>Görseli Kaldır</button>}
              </div>

              {/* Ad */}
              <label className="mobile-label">Ürün Adı</label>
              <input className="mobile-input" value={mobileEdit.name} onChange={e => { const el=e.target, s=el.selectionStart, n=el.selectionEnd, v=el.value.toLocaleUpperCase('tr-TR'); setMobileEdit(prev=>({...prev, name:v})); requestAnimationFrame(()=>{ if(document.activeElement===el) el.setSelectionRange(s,n); }); }} placeholder="Ürün adı..." />

              {/* Fiyat + Birim + Para Birimi */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Fiyat</label>
                  <input className="mobile-input" value={mobileEdit.price} onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                    setMobileEdit(prev => ({ ...prev, price: val }));
                  }} placeholder="0.00" />
                  {paraBirimleri.length > 1 && (
                    <div style={{ marginTop: '4px' }}>
                      <PbSelect value={mobileEdit.para_birimi_id || 1} onChange={id => setMobileEdit(prev => ({ ...prev, para_birimi_id: id }))} options={paraBirimleri} mobile />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Birim</label>
                  <select className="mobile-input" value={mobileEdit.unit} onChange={e => setMobileEdit(prev => ({ ...prev, unit: e.target.value }))}>
                    {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Stok */}
              <label className="mobile-label">Stok Durumu</label>
              <button className={`mobile-stock-toggle ${mobileEdit.inStock ? 'in' : 'out'}`} onClick={() => setMobileEdit(prev => ({ ...prev, inStock: !prev.inStock }))}>
                {mobileEdit.inStock ? '✓ Stokta Var' : '✗ Stokta Yok'}
              </button>

              {/* Marka */}
              {markalar.length > 0 && (<>
                <label className="mobile-label">Marka</label>
                <select className="mobile-input" value={mobileEdit.marka_id || ''} onChange={e => setMobileEdit(prev => ({ ...prev, marka_id: e.target.value ? parseInt(e.target.value) : null }))}>
                  <option value="">— Marka Yok —</option>
                  {markalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
                </select>
              </>)}

              {/* KDV */}
              {kdvOranlari.length > 0 && (<>
                <label className="mobile-label">KDV</label>
                <select className="mobile-input" value={mobileEdit.kdv_id || ''} onChange={e => setMobileEdit(prev => ({ ...prev, kdv_id: e.target.value ? parseInt(e.target.value) : null }))}>
                  <option value="">— KDV Yok —</option>
                  {kdvOranlari.map(k => <option key={k.id} value={k.id}>%{parseFloat(k.oran) % 1 === 0 ? parseInt(k.oran) : parseFloat(k.oran)}</option>)}
                </select>
                {mobileEdit.kdv_id && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button onClick={() => setMobileEdit(prev => ({ ...prev, kdv_dahil: true }))} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `2px solid ${mobileEdit.kdv_dahil ? 'var(--primary)' : '#e2e8f0'}`, background: mobileEdit.kdv_dahil ? 'rgba(5,150,105,0.08)' : '#f8fafc', color: mobileEdit.kdv_dahil ? 'var(--primary)' : '#64748b', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Dahil</button>
                    <button onClick={() => setMobileEdit(prev => ({ ...prev, kdv_dahil: false }))} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `2px solid ${!mobileEdit.kdv_dahil ? '#dc2626' : '#e2e8f0'}`, background: !mobileEdit.kdv_dahil ? 'rgba(220,38,38,0.06)' : '#f8fafc', color: !mobileEdit.kdv_dahil ? '#dc2626' : '#64748b', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Hariç</button>
                  </div>
                )}
              </>)}

              {/* Kategoriler */}
              <label className="mobile-label">Kategoriler</label>
              <input className="mobile-input" placeholder="Kategori ara..." value={mobileEditCatSearch} onChange={e => setMobileEditCatSearch(e.target.value)} />
              <div className="mobile-cat-list">
                {categories.filter(c => c.name.toLowerCase().includes(mobileEditCatSearch.toLowerCase())).map(c => (
                  <label key={c.id} className="mobile-cat-row">
                    <input type="checkbox" checked={mobileEdit.categoryIds.includes(c.id)} onChange={() => {
                      setMobileEdit(prev => ({
                        ...prev,
                        categoryIds: prev.categoryIds.includes(c.id)
                          ? prev.categoryIds.filter(id => id !== c.id)
                          : [...prev.categoryIds, c.id]
                      }));
                    }} />
                    <span>{getCategoryPath(c)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mobile-modal-footer">
              <button className="mobile-btn-cancel" onClick={() => setMobileEdit(null)}>Vazgeç</button>
              <button className="mobile-btn-save" onClick={() => {
                if (!mobileEdit.name.trim() || !mobileEdit.price) return;
                const _kdvItem = kdvOranlari.find(k => k.id === mobileEdit.kdv_id);
                updateProduct(mobileEdit.id, {
                  name: mobileEdit.name.trim(),
                  price: parseFloat(mobileEdit.price),
                  unit: mobileEdit.unit,
                  categoryIds: mobileEdit.categoryIds,
                  image: mobileEdit.image,
                  inStock: mobileEdit.inStock,
                  para_birimi_id: mobileEdit.para_birimi_id || 1,
                  marka_id: mobileEdit.marka_id || null,
                  kdv_id: mobileEdit.kdv_id || null,
                  kdv_orani: _kdvItem?.oran ?? null,
                  kdv_dahil: mobileEdit.kdv_id ? (mobileEdit.kdv_dahil ?? true) : null,
                });
                setMobileEdit(null);
              }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MOBİL YENİ ÜRÜN MODALI ===================== */}
      {showMobileAdd && (
        <div className="modal-overlay">
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Yeni Ürün Ekle</span>
              <button className="mobile-btn-cancel" onClick={() => setShowMobileAdd(false)}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
            </div>
            <div className="mobile-modal-body">

              {/* Görsel */}
              <div className="mobile-field-row">
                <div className="mobile-img-box" onClick={() => mobileAddFileRef.current.click()}>
                  {validImg(newRow.image) ? <img src={newRow.image} alt="" /> : <span>📷</span>}
                </div>
                <input type="file" ref={mobileAddFileRef} hidden accept="image/*" onChange={e => {
                  const file = e.target.files[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setNewRow(prev => ({ ...prev, image: ev.target.result }));
                  reader.readAsDataURL(file);
                }} />
                {newRow.image && <button className="mobile-img-clear" onClick={() => setNewRow(prev => ({ ...prev, image: '' }))}>Görseli Kaldır</button>}
              </div>

              {/* Ad */}
              <label className="mobile-label">Ürün Adı</label>
              <input className="mobile-input" value={newRow.name} onChange={e => { const el=e.target, s=el.selectionStart, n=el.selectionEnd, v=el.value.toLocaleUpperCase('tr-TR'); setNewRow(prev=>({...prev, name:v})); requestAnimationFrame(()=>{ if(document.activeElement===el) el.setSelectionRange(s,n); }); }} placeholder="Ürün adı..." />

              {/* Fiyat + Birim + Para Birimi */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Fiyat</label>
                  <input className="mobile-input" value={newRow.price} onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                    setNewRow(prev => ({ ...prev, price: val }));
                  }} placeholder="0.00" />
                  {paraBirimleri.length > 1 && (
                    <div style={{ marginTop: '4px' }}>
                      <PbSelect value={newRow.para_birimi_id || 1} onChange={id => setNewRow(prev => ({ ...prev, para_birimi_id: id }))} options={paraBirimleri} mobile />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Birim</label>
                  <select className="mobile-input" value={newRow.unit} onChange={e => setNewRow(prev => ({ ...prev, unit: e.target.value }))}>
                    {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Stok */}
              <label className="mobile-label">Stok Durumu</label>
              <button className={`mobile-stock-toggle ${newRow.inStock ? 'in' : 'out'}`} onClick={() => setNewRow(prev => ({ ...prev, inStock: !prev.inStock }))}>
                {newRow.inStock ? '✓ Stokta Var' : '✗ Stokta Yok'}
              </button>

              {/* Marka */}
              {markalar.length > 0 && (<>
                <label className="mobile-label">Marka</label>
                <select className="mobile-input" value={newRow.marka_id || ''} onChange={e => setNewRow(prev => ({ ...prev, marka_id: e.target.value ? parseInt(e.target.value) : null }))}>
                  <option value="">— Marka Yok —</option>
                  {markalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
                </select>
              </>)}

              {/* KDV */}
              {kdvOranlari.length > 0 && (<>
                <label className="mobile-label">KDV</label>
                <select className="mobile-input" value={newRow.kdv_id || ''} onChange={e => setNewRow(prev => ({ ...prev, kdv_id: e.target.value ? parseInt(e.target.value) : null }))}>
                  <option value="">— KDV Yok —</option>
                  {kdvOranlari.map(k => <option key={k.id} value={k.id}>%{parseFloat(k.oran) % 1 === 0 ? parseInt(k.oran) : parseFloat(k.oran)}</option>)}
                </select>
                {newRow.kdv_id && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button onClick={() => setNewRow(prev => ({ ...prev, kdv_dahil: true }))} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `2px solid ${newRow.kdv_dahil ? 'var(--primary)' : '#e2e8f0'}`, background: newRow.kdv_dahil ? 'rgba(5,150,105,0.08)' : '#f8fafc', color: newRow.kdv_dahil ? 'var(--primary)' : '#64748b', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Dahil</button>
                    <button onClick={() => setNewRow(prev => ({ ...prev, kdv_dahil: false }))} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `2px solid ${!newRow.kdv_dahil ? '#dc2626' : '#e2e8f0'}`, background: !newRow.kdv_dahil ? 'rgba(220,38,38,0.06)' : '#f8fafc', color: !newRow.kdv_dahil ? '#dc2626' : '#64748b', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Hariç</button>
                  </div>
                )}
              </>)}

              {/* Kategoriler */}
              <label className="mobile-label">Kategoriler</label>
              <input className="mobile-input" placeholder="Kategori ara..." value={mobileAddCatSearch} onChange={e => setMobileAddCatSearch(e.target.value)} />
              <div className="mobile-cat-list">
                {categories.filter(c => c.name.toLowerCase().includes(mobileAddCatSearch.toLowerCase())).map(c => (
                  <label key={c.id} className="mobile-cat-row">
                    <input type="checkbox" checked={newRow.categoryIds.includes(c.id)} onChange={() => {
                      setNewRow(prev => ({
                        ...prev,
                        categoryIds: prev.categoryIds.includes(c.id)
                          ? prev.categoryIds.filter(id => id !== c.id)
                          : [...prev.categoryIds, c.id]
                      }));
                    }} />
                    <span>{getCategoryPath(c)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mobile-modal-footer">
              <button className="mobile-btn-cancel" onClick={() => setShowMobileAdd(false)}>Vazgeç</button>
              <button className="mobile-btn-save" onClick={() => {
                if (!newRow.name.trim() || !newRow.price) return;
                const _pb = paraBirimleri.find(x => x.id === (newRow.para_birimi_id || 1));
                const _kdvItem = kdvOranlari.find(k => k.id === newRow.kdv_id);
                addProduct({ ...newRow, price: parseFloat(newRow.price), pbSembol: _pb?.sembol || '₺', pbKisaAd: _pb?.kisa_ad || 'TRY', pbKur: parseFloat(_pb?.kur) || 1, kdv_orani: _kdvItem?.oran ?? null, kdv_dahil: newRow.kdv_id ? (newRow.kdv_dahil ?? true) : null, stok_kodu: newRow.stok_kodu || null });
                setNewRow({ name: '', price: '', unit: units[0]?.name || 'Kg', categoryIds: [], image: '', inStock: true, para_birimi_id: 1, marka_id: null, kdv_id: null, stok_kodu: '', kdv_dahil: true });
                setShowMobileAdd(false);
              }}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE COLUMN PREMIUM MANAGE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-header">
              <h3>{showModal === 'kdv' ? 'KDV Oranları Yönetimi' : showModal === 'categories' ? 'Kategori Yönetimi' : showModal === 'markalar' ? 'Marka Yönetimi' : 'Birim Yönetimi'}</h3>
              <button className="pm-close" onClick={() => setShowModal(null)}>✕ <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
            </div>
            <div className="pm-body">
              
              <div className="pm-add-form">
                {showModal === 'categories' && (
                  <select className="lite-select" value={modalParent} onChange={e => setModalParent(e.target.value)}>
                    <option value="">— Ana Kategori (İsteğe Bağlı) —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{getCategoryPath(c)}</option>)}
                  </select>
                )}
                <div className="pm-row">
                  {showModal === 'kdv' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 6 }}>
                      <input
                        type="number" min="0" max="100" step="0.01"
                        className="lite-input"
                        placeholder="KDV oranı (%) — ↵ Enter ile ekle"
                        value={modalInput}
                        onChange={e => { setModalInput(e.target.value); setKdvError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleAddModal()}
                        style={{ width: '100%' }}
                      />
                      {kdvError && <div style={{ color: '#dc2626', fontSize: '11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', padding: '5px 10px', textAlign: 'right' }}>⚠ {kdvError}</div>}
                    </div>
                  ) : showModal === 'markalar' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                      <input type="file" hidden accept="image/*" ref={modalMarkaGorselRef} onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setModalMarkaGorsel(ev.target.result);
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }} />
                      <div
                        style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, border: modalMarkaGorsel ? '1.5px solid #d1fae5' : '1.5px dashed #d1d5db', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' }}
                        onClick={() => !modalMarkaGorsel && modalMarkaGorselRef.current.click()}
                      >
                        {modalMarkaGorsel ? (
                          <>
                            <img src={modalMarkaGorsel} alt="görsel" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
                            <button onClick={e => { e.stopPropagation(); setModalMarkaGorsel(null); }} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 2 }}>×</button>
                          </>
                        ) : (
                          <span style={{ fontSize: 22 }}>📷</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
                        <input type="text" className="lite-input" placeholder="Marka adı — ↵ Enter ile ekle" value={modalInput} onChange={e => { setModalInput(e.target.value); setModalSearch(e.target.value); setModalError(''); }} onKeyDown={e => e.key === 'Enter' && handleAddModal()} />
                        {modalError && <div style={{ color: '#dc2626', fontSize: '11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', padding: '5px 10px' }}>⚠ {modalError}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 6 }}>
                      <input type="text" className="lite-input" placeholder={`${showModal === 'categories' ? 'Kategori' : 'Birim'} adı — ↵ Enter ile ekle`} value={modalInput} onChange={e => { setModalInput(e.target.value); setModalSearch(e.target.value); setModalError(''); }} onKeyDown={e => e.key === 'Enter' && handleAddModal()} />
                      {modalError && <div style={{ color: '#dc2626', fontSize: '11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', padding: '5px 10px' }}>⚠ {modalError}</div>}
                    </div>
                  )}
                </div>
              </div>

                <div className="pm-list-section">
                  <div className="pm-list">
                    {renderModalList()}
                  </div>
                </div>

            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {showExcelModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="excel-import-modal" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', padding: '20px 24px 16px', borderBottom: '1px solid #bbf7d0', position: 'relative' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#14532d' }}>📥 Excel'den Ürün Yükle</div>
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>Toplu ürün ekleme — hızlı ve kolay</div>
              </div>
              <button onClick={() => setShowExcelModal(false)} style={{ position: 'absolute', top: '14px', right: '16px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>× <span style={{ fontSize: '10px', opacity: 0.6 }}>ESC</span></button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {excelStep === 'guide' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Adım 1 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>1</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '3px' }}>Excel dosyanızı hazırlayın</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        Excel dosyanızın <strong>ilk satırı başlık satırı</strong> olmalıdır. <br />
                        İlk sütun <strong>Ürün Adı</strong>, ikinci sütun <strong>Fiyat</strong> olmalıdır.<br />
                        <span style={{ color: '#94a3b8' }}>Örnek: A1 = "Ürün Adı", B1 = "Fiyat", A2 = "Domates", B2 = "25"</span>
                      </div>
                      <button
                        onClick={() => {
                          const wb = XLSX.utils.book_new();
                          const sampleData = [
                            ['Ürün Adı', 'Fiyat'],
                            ['Domates', '25'],
                            ['Biber', '30'],
                            ['Elma', '45'],
                            ['Patates', '18'],
                          ];
                          const ws = XLSX.utils.aoa_to_sheet(sampleData);
                          ws['!cols'] = [{ wch: 25 }, { wch: 12 }];
                          XLSX.utils.book_append_sheet(wb, ws, 'Urunler');
                          XLSX.writeFile(wb, 'ornek_urun_sablonu.xlsx');
                        }}
                        style={{ marginTop: '10px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #22c55e', background: '#f0fdf4', color: '#16a34a', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                      >
                        📥 Örnek Dosya İndir
                      </button>
                    </div>
                  </div>
                  {/* Adım 2 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>2</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '3px' }}>Dosyayı seçin</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        Aşağıdaki butona tıklayarak bilgisayarınızdaki <strong>.xlsx</strong> veya <strong>.xls</strong> dosyasını seçin. Yalnızca <strong>Ürün Adı</strong> ve <strong>Fiyat</strong> bilgileri alınır, diğer sütunlar dikkate alınmaz.
                      </div>
                    </div>
                  </div>
                  {/* Adım 3 */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>3</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '3px' }}>Önizleme ve onay</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        Dosya seçildikten sonra ürünler size gösterilir. Doğru görünüyorsa <strong>Sisteme Ekle</strong> butonuna basın, hatalıysa iptal edip tekrar deneyin.
                      </div>
                    </div>
                  </div>

                  {excelError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#dc2626' }}>⚠️ {excelError}</div>}

                  <input ref={excelFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setExcelError('');
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                        if (data.length < 2) { setExcelError('Dosyada hiç veri bulunamadı.'); return; }
                        // İlk satır başlık, diğerleri veri
                        const rows = data.slice(1).map(r => {
                          const name = String(r[0] || '').trim().toLocaleUpperCase('tr-TR');
                          const price = String(r[1] || '').replace(',', '.').trim();
                          const existing = products.find(p => p.name.toLocaleUpperCase('tr-TR') === name) || null;
                          return { name, price, existing };
                        }).filter(r => r.name);
                        if (rows.length === 0) { setExcelError('Geçerli ürün satırı bulunamadı. A sütunu ürün adı, B sütunu fiyat olmalıdır.'); return; }
                        setExcelRows(rows);
                        setExcelStep('preview');
                      } catch {
                        setExcelError('Dosya okunamadı. Lütfen geçerli bir Excel dosyası seçin.');
                      }
                    };
                    reader.readAsArrayBuffer(file);
                    e.target.value = '';
                  }} />

                  <button onClick={() => excelFileRef.current?.click()} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
                    📂 Excel Dosyası Seç
                  </button>
                </div>
              )}

              {excelStep === 'preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#475569', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px' }}>
                    ✅ <strong>{excelRows.length} satır</strong> bulundu. —&nbsp;
                    <span style={{ color: '#15803d' }}>🟢 {excelRows.filter(r => !r.existing).length} yeni kayıt</span>&nbsp;&nbsp;
                    <span style={{ color: '#b45309' }}>🟡 {excelRows.filter(r => r.existing).length} güncellenecek kayıt</span>
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Ürün Adı</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Fiyat</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelRows.map((r, i) => {
                          const newPrice = parseFloat(r.price) || 0;
                          const oldPrice = r.existing ? parseFloat(r.existing.price) || 0 : null;
                          const priceChanged = r.existing && newPrice !== oldPrice;
                          const fmt = (v) => Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: r.existing ? '#fffbeb' : '#fff' }}>
                              <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{i + 1}</td>
                              <td style={{ padding: '7px 12px', color: '#0f172a', fontWeight: '600' }}>{r.name}</td>
                              <td style={{ padding: '7px 12px' }}>
                                {r.existing ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: '600', fontSize: '12px', textDecoration: 'line-through' }}>{fmt(oldPrice)}</span>
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>→</span>
                                    <span style={{ color: priceChanged ? '#dc2626' : '#16a34a', fontWeight: '800', fontSize: '13px' }}>{fmt(newPrice)}</span>
                                  </span>
                                ) : (
                                  <span style={{ color: '#16a34a', fontWeight: '700' }}>{r.price ? fmt(newPrice) : <span style={{ color: '#94a3b8' }}>—</span>}</span>
                                )}
                              </td>
                              <td style={{ padding: '7px 12px' }}>
                                {r.existing
                                  ? <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', borderRadius: '5px', padding: '2px 7px', fontWeight: '700' }}>🟡 Güncellenecek</span>
                                  : <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', borderRadius: '5px', padding: '2px 7px', fontWeight: '700' }}>🟢 Yeni Eklenecek</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setExcelStep('guide'); setExcelRows([]); }} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>↩ Geri</button>
                    <button disabled={excelLoading} onClick={async () => {
                      setExcelLoading(true);
                      let added = 0, updated = 0;
                      for (const r of excelRows) {
                        if (r.existing) {
                          await updateProduct(r.existing.id, { price: parseFloat(r.price) || 0 });
                          updated++;
                        } else {
                          await addProduct({ name: r.name, price: parseFloat(r.price) || 0, unit: 'Kg', categoryIds: [], image: '', inStock: true });
                          added++;
                        }
                      }
                      setExcelLoading(false);
                      setExcelRows(prev => prev.map((r, i, arr) => ({ ...r, _added: added, _updated: updated })));
                      setExcelStep('done');
                    }} style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: excelLoading ? '#86efac' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: '800', fontSize: '13px', cursor: excelLoading ? 'default' : 'pointer' }}>
                      {excelLoading ? '⏳ İşleniyor...' : `✅ ${excelRows.length} Satırı Uygula`}
                    </button>
                  </div>
                </div>
              )}

              {excelStep === 'done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#14532d', marginBottom: '8px' }}>İşlem Tamamlandı!</div>
                  <div style={{ fontSize: '13px', color: '#16a34a', marginBottom: '4px' }}>
                    🟢 {excelRows.filter(r => !r.existing).length} ürün eklendi
                  </div>
                  <div style={{ fontSize: '13px', color: '#b45309', marginBottom: '24px' }}>
                    🟡 {excelRows.filter(r => r.existing).length} ürün güncellendi
                  </div>
                  <button onClick={() => setShowExcelModal(false)} style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Tamam</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL PREMIUM */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal premium-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <div className="warn-icon">⚠️</div>
              <h3>Ürünü Silmek İstiyor musunuz?</h3>
            </div>
            <div className="confirm-body">
              <p><strong>{products.find(p => p.id === confirm)?.name}</strong> isimli ürün kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
            </div>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={() => setConfirm(null)}>Vazgeç</button>
              <button className="btn-delete" onClick={() => { deleteProduct(confirm); setConfirm(null); }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
      {imgPreview && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setImgPreview(null)}
        >
          <img
            src={imgPreview}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          />
          <button
            onClick={() => setImgPreview(null)}
            style={{ position: 'fixed', top: 18, right: 22, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
      )}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setConfirmModal(null)}
        >
          <div style={{ background: '#fff', borderRadius: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 28px 22px', maxWidth: '340px', width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>{confirmModal.message}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>Bu işlem geri alınamaz.</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >İptal</button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >🗑️ Sil</button>
            </div>
          </div>
        </div>
      )}
      {pmTooltip && (
        <div className="pm-float-tooltip" style={{ left: pmTooltip.x, top: pmTooltip.y }}>
          {pmTooltipText || 'Düzenlemek için çift tıklayınız'}
        </div>
      )}
    </div>
  );
}
