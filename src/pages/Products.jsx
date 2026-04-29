import { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import '../styles/ExcelTable.css';

export default function Products() {
  const { categories, products, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, units, addUnit, updateUnit, deleteUnit } = useData();

  const [newRow, setNewRow] = useState({ name: '', price: '', unit: 'Kg', categoryIds: [], image: '', inStock: true });
  const [editing, setEditing] = useState(null); // { id, field }
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
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

  const handleAddModal = () => {
    if (!modalInput.trim()) return;
    if (showModal === 'categories') addCategory(modalInput.trim(), modalParent || null);
    else addUnit(modalInput.trim());
    setModalInput('');
  };

  const renderModalList = () => {
    if (showModal === 'units') {
      const filtered = units.filter(u => u.toLowerCase().includes(modalSearch.toLowerCase()));
      if (filtered.length === 0) return <div className="pm-empty">Sonuç bulunamadı.</div>;
      return filtered.map(u => (
        <div key={u} className="pm-item">
          <div className="pm-item-left">
            <span className="pm-item-icon">⚖️</span>
            <span className="pm-item-name">{u}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-edit" onClick={() => {
              const newName = window.prompt("Birim için yeni ad:", u);
              if (newName && newName.trim()) updateUnit(u, newName.trim());
            }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px', opacity: 0.6 }}>✏️</button>
            <button className="pm-item-del" onClick={() => {
              if (window.confirm(`"${u}" birimini silmek istediğinize emin misiniz?`)) deleteUnit(u);
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
              <div className="pm-item-name">{c.name}</div>
              {c.parentId && <div className="pm-item-path">{c.path}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="pm-item-edit" onClick={() => {
              const newName = window.prompt("Kategori için yeni ad:", c.name);
              if (newName && newName.trim()) updateCategory(c.id, newName.trim());
            }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px', opacity: 0.6 }}>✏️</button>
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
          <div className="help-modal-content">
            <p>Bostan Manav stok yönetim paneline hoş geldiniz. Bu ekranı kullanarak mağazanızdaki ürünleri hızlı ve kolay bir şekilde yönetebilirsiniz.</p>
            <ul style={{ paddingLeft: '20px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><strong>📷 Görsel Ekleme:</strong> Yeni ekleme satırında kamera ikonuna tıklayarak veya mevcut ürün görseline çift tıklayarak resim ekleyip değiştirebilirsiniz.</li>
              <li><strong>✏️ Hızlı Düzenleme (Excel Tipi):</strong> Ürün adı, fiyatı veya biriminin üzerine <strong>çift tıklayarak</strong> anında düzenleme yapabilirsiniz. Kaydetmek için Enter'a basmanız veya dışarı tıklamanız yeterlidir.</li>
              <li><strong>🏷️ Kategoriler:</strong> Ürünlerin hangi reyonlarda görüneceğini seçebilirsiniz. Yeni kategori eklemek için tablo başlığındaki <strong>+</strong> butonuna tıklayın.</li>
              <li><strong>⚖️ Birimler:</strong> Kg, Adet, Demet gibi birimleri belirleyebilirsiniz. Yeni birim eklemek için tablo başlığındaki <strong>+</strong> butonuna tıklayın.</li>
              <li><strong>🔍 Hızlı Arama:</strong> Sağ üstteki arama çubuğu ile ürünleriniz arasında anında arama yapıp istediğiniz ürünü bulabilirsiniz.</li>
            </ul>
            <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(0, 184, 148, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
              <strong>💡 İpucu:</strong> Yeni ürün eklemek için tablonun en üstündeki <strong>boş satırı</strong> doldurup "EKLE" butonuna basmanız veya Enter tuşunu kullanmanız yeterlidir!
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
                <th style={{ width: '130px' }}>Son Güncelleme</th>
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
                <td><input type="text" className="lite-input" placeholder="Adı..." value={newRow.name} onChange={e => setNewRow({...newRow, name: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleAdd()} /></td>
                <td><input type="text" className="lite-input" placeholder="0.00" value={newRow.price} onChange={e => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if ((val.match(/\./g) || []).length > 1) val = val.slice(0, -1);
                  setNewRow({...newRow, price: val});
                }} onKeyDown={e => e.key === 'Enter' && handleAdd()} /></td>
                <td>
                  <select className="lite-select" value={newRow.unit} onChange={e => setNewRow({...newRow, unit: e.target.value})}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
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
              {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => {
                const isEditingCats = editing?.id === p.id && editing?.field === 'categoryIds';
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
                        <input autoFocus className="inline-edit" defaultValue={p.name} onBlur={(e) => handleBlur(p.id, 'name', e.target.value)} onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                      ) : (
                        <span className="edit-txt">{p.name}</span>
                      )}
                    </td>
                    <td onDoubleClick={() => setEditing({ id: p.id, field: 'price' })}>
                      {editing?.id === p.id && editing?.field === 'price' ? (
                        <input autoFocus type="text" className="inline-edit" defaultValue={p.price} onInput={e => {
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
                          {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      ) : (
                        <span className="badge-unit">{p.unit}</span>
                      )}
                    </td>
                    <td onDoubleClick={(e) => { e.stopPropagation(); setEditing({ id: p.id, field: 'categoryIds' }); setCatSearch(''); }}>
                      <div className="cat-drop-wrapper" ref={editDropRef}>
                        <div className="badge-group">
                          {p.categoryIds.map(cid => {
                            const cat = categories.find(c => c.id === cid);
                            return cat ? <span key={cid} className="badge-cat">{cat.name}</span> : null;
                          })}
                          {p.categoryIds.length === 0 && <span className="no-data">YOK</span>}
                        </div>
                        {isEditingCats && (
                          <div className="cat-drop-panel shadow-lg" onClick={e => e.stopPropagation()}>
                            <input type="text" placeholder="Ara..." value={catSearch} onChange={e => setCatSearch(e.target.value)} autoFocus />
                            <div className="cat-drop-scroll">
                              {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                                <label key={c.id} className="cat-label">
                                  <input type="checkbox" checked={p.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id, p.categoryIds, null, true, p.id)} />
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
                        onClick={() => updateProduct(p.id, { inStock: p.inStock === false ? true : false })}
                        style={{ background: p.inStock !== false ? 'rgba(0, 184, 148, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: p.inStock !== false ? 'var(--primary)' : 'var(--danger)', border: `1px solid ${p.inStock !== false ? 'rgba(0, 184, 148, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
                      >
                        {p.inStock !== false ? 'VAR' : 'YOK'}
                      </button>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column' }}>
                        <span>{p.priceHistory && p.priceHistory.length > 0 ? new Date(p.priceHistory[p.priceHistory.length - 1].date).toLocaleDateString('tr-TR') : '-'}</span>
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>{p.priceHistory && p.priceHistory.length > 0 ? new Date(p.priceHistory[p.priceHistory.length - 1].date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
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
      </div>

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
