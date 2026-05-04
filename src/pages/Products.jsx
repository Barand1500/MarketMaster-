import { useState, useRef, useEffect, useMemo } from 'react';
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

export default function Products() {
  const { categories, products, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, units, addUnit, updateUnit, deleteUnit } = useData();

  const [newRow, setNewRow] = useState({ name: '', price: '', unit: 'Kg', categoryIds: [], image: '', inStock: true });
  const [editing, setEditing] = useState(null); // { id, field }
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(null);
  
  const [catDrop, setCatDrop] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  
  const [modalSearch, setModalSearch] = useState('');
  const [modalInput, setModalInput] = useState('');
  const [modalParent, setModalParent] = useState('');

  const openModal = (type) => {
    setShowModal(type);
    setModalSearch('');
    setModalInput('');
    setModalParent('');
  };

  const fileInputRef = useRef(null);
  const editFileRef = useRef(null);
  const mobileFileRef = useRef(null);
  const mobileAddFileRef = useRef(null);

  // MOBİL: edit modal state
  const [mobileEdit, setMobileEdit] = useState(null); // { ...product fields }
  const [mobileEditCatSearch, setMobileEditCatSearch] = useState('');
  const [showMobileAdd, setShowMobileAdd] = useState(false);
  const [mobileAddCatSearch, setMobileAddCatSearch] = useState('');
  const dropRef = useRef(null);
  const editDropRef = useRef(null);

  // CLICK OUTSIDE TO CLOSE
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setCatDrop(false);
      if (editDropRef.current && !editDropRef.current.contains(e.target)) {
        if (editing?.field === 'categoryIds') setEditing(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing]);

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
    addProduct({ ...newRow, price: parseFloat(newRow.price) });
    setNewRow({ name: '', price: '', unit: 'Kg', categoryIds: [], image: '', inStock: true });
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

  const fmtPrice = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  // Sayfalama hesaplama
  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Arama değişince 1. sayfaya dön
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const handleAddModal = () => {
    if (!modalInput.trim()) return;
    if (showModal === 'categories') addCategory(modalInput.trim(), modalParent || null);
    else addUnit(modalInput.trim());
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
                style={{ cursor: 'pointer' }}
                title="Düzenlemek için çift tıklayın"
              >
                {u.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-del" onClick={() => {
              if (window.confirm(`"${u.name}" birimini silmek istediğinize emin misiniz?`)) deleteUnit(u.id);
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
        <div key={c.id} className="pm-item">
          <div className="pm-item-left">
            <span className="pm-item-icon">{c.parentId ? '↳' : '📁'}</span>
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
                  style={{ cursor: 'pointer' }}
                  title="Düzenlemek için çift tıklayın"
                >
                  {c.name}
                </div>
              )}
              {c.parentId && <div className="pm-item-path">{c.path}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-del" onClick={() => {
              if (window.confirm(`"${c.name}" kategorisini kalıcı olarak silmek istediğinize emin misiniz?`)) deleteCategory(c.id);
            }}>✕</button>
          </div>
        </div>
      ));
    }
  };

  return (
    <div className="page-container wide">
      <PageHeader 
        title="🍉 Bostan Manav" 
        sub="Ürün Veritabanı ve Stok Yönetimi" 
        helpContent={
          <div>
            <p>Bu ekrandan ürünlerinizi hızlı ve kolay şekilde yönetebilirsiniz.</p>
            <ul>
              <li><strong>📷 Görsel Ekleme:</strong> Kamera ikonuna tıklayarak resim ekleyip değiştirebilirsiniz.</li>
              <li><strong>✏️ Hızlı Düzenleme:</strong> Ürün adı, fiyatı veya birimi üzerine <strong>çift tıklayarak</strong> anında düzenleme yapabilirsiniz.</li>
              <li><strong>🏷️ Kategoriler:</strong> Ürünlerin hangi reyonlarda görüneceğini seçebilirsiniz. Tablo başlığındaki <strong>+</strong> ile yeni kategori ekleyin.</li>
              <li><strong>⚖️ Birimler:</strong> Kg, Adet, Demet gibi birimleri belirleyebilirsiniz. Tablo başlığındaki <strong>+</strong> ile yeni birim ekleyin.</li>
              <li><strong>🔍 Arama:</strong> Üstteki arama çubuğu ile ürünler arasında anında filtreleme yapabilirsiniz.</li>
            </ul>
            <div className="help-tip">
              <strong>💡 İpucu:</strong> Yeni ürün eklemek için tablonun en üstündeki <strong>boş satırı</strong> doldurup "EKLE" butonuna basın veya Enter tuşunu kullanın!
            </div>
          </div>
        }
        helpContentMobile={
          <div>
            <p>Mobil ekranda ürünleriniz kart listesi olarak görünür. Yapılabilecekler:</p>
            <ul>
              <li><strong>✏️ Düzenleme:</strong> Herhangi bir ürün kartındaki kalem ikonuna (<strong>✏️</strong>) dokunun. Açılan ekranda ad, fiyat, birim, kategoriler ve görseli düzenleyip <strong>Kaydet</strong>'e basin.</li>
              <li><strong>VAR / YOK:</strong> Kartın sağındaki butona dokunarak stok durumunu anında değiştirebilirsiniz.</li>
              <li><strong>🗑️ Silme:</strong> Kalem ikonunun altındaki 🗑️ butonuna dokunun, onay istenir.</li>
              <li><strong>➕ Yeni Ürün:</strong> Sağ alttaki yeşil <strong>️️+</strong> butonu ile yeni ürün ekleyebilirsiniz.</li>
              <li><strong>📁 Kategori / ⚖️ Birim:</strong> Listenin üstündeki <strong>Kategori Yönetimi</strong> ve <strong>Birim Yönetimi</strong> butonları ile yönetim ekranını açabilirsiniz.</li>
              <li><strong>🔍 Arama:</strong> Listenin üstündeki arama kutusuna yazarak anında filtreleyebilirsiniz.</li>
            </ul>
            <div className="help-tip">
              <strong>💡 İpucu:</strong> Kategoriler ve birimler ekranında çift parmakla kaydırarak tüm listeyi görebilirsiniz.
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
                <th style={{ width: '130px' }}>Fiyat (₺)</th>
                <th style={{ width: '120px' }}>Birim <button className="mini-add-btn" onClick={() => openModal('units')}>+</button></th>
                <th style={{ width: '230px' }}>Kategoriler <button className="mini-add-btn" onClick={() => openModal('categories')}>+</button></th>
                <th style={{ width: '90px', textAlign: 'center' }}>Stok</th>
                <th style={{ width: '160px' }}>Son Güncelleme</th>
                <th style={{ width: '80px', textAlign: 'center' }}>İşlem</th>
              </tr>
              <tr className="add-row">
                <td>
                  <div className="add-img-box">
                    {newRow.image ? (
                      <div className="thumb-container">
                        <img src={newRow.image} />
                        <button className="img-clear" onClick={() => removeImage('new')}>×</button>
                      </div>
                    ) : <span onClick={() => fileInputRef.current.click()}>📷</span>}
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => handleFile(e, setNewRow)} />
                  </div>
                </td>
                <td><input type="text" className="lite-input" placeholder="Adı..." value={newRow.name} onChange={e => setNewRow({...newRow, name: e.target.value.toUpperCase()})} onKeyDown={e => e.key === 'Enter' && handleAdd()} /></td>
                <td><input type="text" className="lite-input" placeholder="0.00" value={newRow.price} onChange={e => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                  setNewRow({...newRow, price: val});
                }} onKeyDown={e => e.key === 'Enter' && handleAdd()} /></td>
                <td>
                  <select className="lite-select" value={newRow.unit} onChange={e => setNewRow({...newRow, unit: e.target.value})}>
                    {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </td>
                <td>
                  <div className="cat-drop-wrapper" ref={dropRef}>
                    <div className="cat-drop-btn" onClick={(e) => { e.stopPropagation(); setCatDrop(!catDrop); }}>
                      {newRow.categoryIds.length > 0 ? `${newRow.categoryIds.length} Seçili` : 'Seç...'}
                    </div>
                    {catDrop && (
                      <div className="cat-drop-panel shadow-lg" onClick={e => e.stopPropagation()}>
                        <input type="text" placeholder="Ara..." value={catSearch} onChange={e => setCatSearch(e.target.value)} />
                        <div className="cat-drop-scroll">
                          {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                            <label key={c.id} className="cat-label">
                              <input type="checkbox" checked={newRow.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id, newRow.categoryIds, setNewRow)} />
                              <span>{getCategoryPath(c)}</span>
                            </label>
                          ))}
                        </div>
                        <button className="cat-drop-close-btn" onClick={() => setCatDrop(false)}>Tamam</button>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => setNewRow(p => ({ ...p, inStock: !p.inStock }))}
                    style={{ background: newRow.inStock ? 'var(--primary)' : 'var(--danger)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                  >
                    {newRow.inStock ? 'VAR' : 'YOK'}
                  </button>
                </td>
                <td><span style={{ fontSize: '11px', color: '#94a3b8' }}>Şimdi</span></td>
                <td style={{ textAlign: 'center' }}><button className="lite-add-btn" onClick={handleAdd}>EKLE</button></td>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map(p => {
                const isEditingCats = editing?.id == p.id && editing?.field === 'categoryIds';
                return (
                  <tr key={p.id} className={isEditingCats ? 'editing-row' : ''}>
                    <td>
                      <div className="thumb-box">
                        {p.image ? (
                          <div className="thumb-container">
                            <img src={p.image} onDoubleClick={() => { setEditing({ id: p.id, field: 'image' }); setTimeout(() => editFileRef.current.click(), 50); }} />
                            <button className="img-clear" onClick={() => removeImage(p.id)}>×</button>
                          </div>
                        ) : <span onDoubleClick={() => { setEditing({ id: p.id, field: 'image' }); setTimeout(() => editFileRef.current.click(), 50); }}>🍎</span>}
                        <input type="file" ref={editFileRef} hidden accept="image/*" onChange={e => handleFile(e, null, true)} />
                      </div>
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'name' })}>
                      {editing?.id === p.id && editing?.field === 'name' ? (
                        <input autoFocus className="inline-edit" defaultValue={p.name} onFocus={e => e.target.select()} onChange={e => e.target.value = e.target.value.toUpperCase()} onBlur={(e) => handleBlur(p.id, 'name', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <span className="edit-txt">{p.name}</span>
                      )}
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'price' })}>
                      {editing?.id === p.id && editing?.field === 'price' ? (
                        <input autoFocus type="text" className="inline-edit" defaultValue={p.price} onFocus={e => e.target.select()} onInput={e => {
                          let val = e.target.value.replace(/[^0-9.]/g, '');
                          if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                          e.target.value = val;
                        }} onBlur={(e) => handleBlur(p.id, 'price', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <span className="edit-txt price">{fmtPrice(p.price)}</span>
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
                        <div className="badge-group">
                          {p.categoryIds.map(cid => {
                            const cat = categories.find(c => c.id === cid);
                            return cat ? <span key={cid} className="badge-cat">{cat.name}</span> : null;
                          })}
                          {p.categoryIds.length === 0 && <span className="no-data">YOK</span>}
                        </div>
                        {isEditingCats && (
                          <div className="cat-drop-panel shadow-lg" style={{ zIndex: 1000 }} onClick={e => e.stopPropagation()}>
                            <input type="text" placeholder="Ara..." value={catSearch} onChange={e => setCatSearch(e.target.value)} autoFocus />
                            <div className="cat-drop-scroll">
                              {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                                <label key={c.id} className="cat-label" onClick={e => e.stopPropagation()}>
                                  <input 
                                    type="checkbox" 
                                    checked={p.categoryIds.includes(c.id)} 
                                    onChange={() => toggleCategory(c.id, p.categoryIds, null, true, p.id)} 
                                  />
                                  <span>{getCategoryPath(c)}</span>
                                </label>
                              ))}
                            </div>
                            <button className="cat-drop-close-btn" onClick={() => setEditing(null)}>Tamam</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => updateProduct(p.id, { inStock: !p.inStock })}
                        style={{ background: p.inStock ? 'rgba(0, 184, 148, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: p.inStock ? 'var(--primary)' : 'var(--danger)', border: `1px solid ${p.inStock ? 'rgba(0, 184, 148, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
                      >
                        {p.inStock ? 'VAR' : 'YOK'}
                      </button>
                    </td>
                    <td>
                      <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingBottom: '4px' }}>
                          <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '700', letterSpacing: '0.3px', minWidth: '28px' }}>BİLGİ</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{p.lastInfoChange ? new Date(p.lastInfoChange).toLocaleDateString('tr-TR') : 'Değişmedi'}</span>
                            <span style={{ fontSize: '9px', opacity: 0.8 }}>{p.lastInfoChange ? new Date(p.lastInfoChange).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#94a3b8', fontSize: '9px', fontWeight: '700', letterSpacing: '0.3px', minWidth: '28px' }}>FİYAT</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: p.lastPriceChange ? '#0f172a' : '#94a3b8' }}>{p.lastPriceChange ? new Date(p.lastPriceChange).toLocaleDateString('tr-TR') : 'Değişmedi'}</span>
                            <span style={{ fontSize: '9px', opacity: 0.8 }}>{p.lastPriceChange ? new Date(p.lastPriceChange).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="del-btn-icon" onClick={() => setConfirm(p.id)}>🗑</button>
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
        </div>

        <div className="mobile-search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {pagedProducts.map(p => (
          <div key={p.id} className="mobile-product-card">
            <div className="mobile-card-img">
              {p.image ? <img src={p.image} alt={p.name} /> : <span>🍎</span>}
            </div>
            <div className="mobile-card-info">
              <div className="mobile-card-name">{p.name}</div>
              <div className="mobile-card-meta">
                <span className="mobile-card-price">{fmtPrice(p.price)}</span>
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
                setMobileEdit({ id: p.id, name: p.name, price: String(p.price), unit: p.unit || 'Kg', categoryIds: [...p.categoryIds], image: p.image || '', inStock: p.inStock });
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
        <button className="mobile-fab" onClick={() => { setShowMobileAdd(true); setNewRow({ name: '', price: '', unit: units[0]?.name || 'Kg', categoryIds: [], image: '', inStock: true }); setMobileAddCatSearch(''); }}>＋</button>
      </div>

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
                  {mobileEdit.image ? <img src={mobileEdit.image} alt="" /> : <span>📷</span>}
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
              <input className="mobile-input" value={mobileEdit.name} onChange={e => setMobileEdit(prev => ({ ...prev, name: e.target.value.toUpperCase() }))} placeholder="Ürün adı..." />

              {/* Fiyat + Birim */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Fiyat (₺)</label>
                  <input className="mobile-input" value={mobileEdit.price} onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                    setMobileEdit(prev => ({ ...prev, price: val }));
                  }} placeholder="0.00" />
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
                updateProduct(mobileEdit.id, {
                  name: mobileEdit.name.trim(),
                  price: parseFloat(mobileEdit.price),
                  unit: mobileEdit.unit,
                  categoryIds: mobileEdit.categoryIds,
                  image: mobileEdit.image,
                  inStock: mobileEdit.inStock
                });
                setMobileEdit(null);
              }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MOBİL YENİ ÜRÜN MODALI ===================== */}
      {showMobileAdd && (
        <div className="modal-overlay" onClick={() => setShowMobileAdd(false)}>
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <span>Yeni Ürün Ekle</span>
              <button onClick={() => setShowMobileAdd(false)}>✕</button>
            </div>
            <div className="mobile-modal-body">

              {/* Görsel */}
              <div className="mobile-field-row">
                <div className="mobile-img-box" onClick={() => mobileAddFileRef.current.click()}>
                  {newRow.image ? <img src={newRow.image} alt="" /> : <span>📷</span>}
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
              <input className="mobile-input" value={newRow.name} onChange={e => setNewRow(prev => ({ ...prev, name: e.target.value.toUpperCase() }))} placeholder="Ürün adı..." />

              {/* Fiyat + Birim */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="mobile-label">Fiyat (₺)</label>
                  <input className="mobile-input" value={newRow.price} onChange={e => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                    setNewRow(prev => ({ ...prev, price: val }));
                  }} placeholder="0.00" />
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
                addProduct({ ...newRow, price: parseFloat(newRow.price) });
                setNewRow({ name: '', price: '', unit: units[0]?.name || 'Kg', categoryIds: [], image: '', inStock: true });
                setShowMobileAdd(false);
              }}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE COLUMN PREMIUM MANAGE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-header">
              <h3>{showModal === 'categories' ? 'Kategori Yönetimi' : 'Birim Yönetimi'}</h3>
              <button className="pm-close" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div className="pm-body">
              
              <div className="pm-add-form">
                <div className="pm-form-title">YENİ {showModal === 'categories' ? 'KATEGORİ' : 'BİRİM'} EKLE</div>
                {showModal === 'categories' && (
                  <select className="lite-select" value={modalParent} onChange={e => setModalParent(e.target.value)}>
                    <option value="">— Ana Kategori (İsteğe Bağlı) —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{getCategoryPath(c)}</option>)}
                  </select>
                )}
                <div className="pm-row">
                  <input type="text" className="lite-input" placeholder={`${showModal === 'categories' ? 'Kategori' : 'Birim'} adı...`} value={modalInput} onChange={e => setModalInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddModal()} />
                  <button className="pm-btn" onClick={handleAddModal}>Ekle</button>
                </div>
              </div>

                <div className="pm-list-section">
                  <div className="pm-search-box">
                    <span className="icon">🔍</span>
                    <input type="text" placeholder="Mevcutlar içinde ara..." value={modalSearch} onChange={e => setModalSearch(e.target.value)} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 8px 0', textAlign: 'right' }}>
                    Düzenlemek için çift tıklayın
                  </div>
                  <div className="pm-list">
                    {renderModalList()}
                  </div>
                </div>

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
    </div>
  );
}
