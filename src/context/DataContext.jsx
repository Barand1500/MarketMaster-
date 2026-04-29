import { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext(null);

const INITIAL_CATEGORIES = [
  { id: uuidv4(), name: 'Meyveler', parentId: null },
  { id: uuidv4(), name: 'Sebzeler', parentId: null },
];

const INITIAL_UNITS = ['Kg', 'Adet', 'Demet', 'Kasa', 'Paket'];

const load = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

export function DataProvider({ children }) {
  const [categories, setCategories] = useState(() => load('manav_categories', INITIAL_CATEGORIES));
  const [products, setProducts] = useState(() => load('manav_products', []));
  const [users, setUsers] = useState(() => load('manav_users', [{ id: 'admin', username: 'ercan', password: '123', contact: 'Yönetici', allowedPages: ['products', 'customers', 'users'] }]));
  const [customers, setCustomers] = useState(() => load('manav_customers', []));
  const [units, setUnits] = useState(() => load('manav_units', INITIAL_UNITS));
  const [extraPrices, setExtraPrices] = useState(() => load('manav_extra_prices', []));

  const safeSave = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Depolama alanı doldu! Lütfen çok büyük resimler yüklemeyin veya bazı verileri silin.');
      }
    }
  };

  useEffect(() => { safeSave('manav_categories', categories); }, [categories]);
  useEffect(() => { safeSave('manav_products', products); }, [products]);
  useEffect(() => { safeSave('manav_users', users); }, [users]);
  useEffect(() => { safeSave('manav_customers', customers); }, [customers]);
  useEffect(() => { safeSave('manav_units', units); }, [units]);
  useEffect(() => { safeSave('manav_extra_prices', extraPrices); }, [extraPrices]);

  const clearAllData = () => {
    if (window.confirm('Tüm veriler silinecek! Emin misiniz?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // CATEGORIES
  const addCategory = (name, parentId = null) => {
    setCategories(prev => [...prev, { id: uuidv4(), name, parentId }]);
  };
  const updateCategory = (id, name) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };
  const deleteCategory = (id) => {
    const getAllChildren = (parentId) => {
      const children = categories.filter(c => c.parentId === parentId);
      return children.reduce((acc, c) => [...acc, c.id, ...getAllChildren(c.id)], []);
    };
    const toDelete = [id, ...getAllChildren(id)];
    setCategories(prev => prev.filter(c => !toDelete.includes(c.id)));
    setProducts(prev => prev.map(p => ({ ...p, categoryIds: (p.categoryIds || []).filter(cid => !toDelete.includes(cid)) })));
  };

  // USERS (STAFF)
  const addUser = (user) => {
    setUsers(prev => [...prev, { id: uuidv4(), ...user }]);
  };
  const updateUser = (id, updates) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };
  const deleteUser = (id) => {
    if (id === 'admin') return; // Admin silinemez
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // UNITS
  const addUnit = (name) => {
    if (!units.includes(name)) setUnits(prev => [...prev, name]);
  };
  const updateUnit = (oldName, newName) => {
    if (!newName.trim() || units.includes(newName)) return;
    setUnits(prev => prev.map(u => u === oldName ? newName : u));
    setProducts(prev => prev.map(p => p.unit === oldName ? { ...p, unit: newName } : p));
  };
  const deleteUnit = (name) => {
    setUnits(prev => prev.filter(u => u !== name));
  };

  // PRODUCTS
  const addProduct = (product) => {
    setProducts(prev => [...prev, { id: uuidv4(), ...product, unit: product.unit || 'Kg', createdAt: Date.now(), priceHistory: [{ price: product.price, date: Date.now() }] }]);
  };
  const updateProduct = (id, updates) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const priceChanged = updates.price !== undefined && updates.price !== p.price;
      return {
        ...p,
        ...updates,
        priceHistory: priceChanged
          ? [...(p.priceHistory || []), { price: updates.price, date: Date.now() }]
          : p.priceHistory,
      };
    }));
  };
  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setExtraPrices(prev => prev.filter(ep => ep.productId !== id));
  };



  // CUSTOMERS
  const addCustomer = (customer) => {
    setCustomers(prev => [...prev, { id: uuidv4(), ...customer, createdAt: Date.now() }]);
  };
  const updateCustomer = (id, updates) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };
  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // EXTRA PRICES
  const addExtraPrice = (ep) => setExtraPrices(prev => [...prev, { id: uuidv4(), ...ep }]);
  const updateExtraPrice = (id, updates) => setExtraPrices(prev => prev.map(ep => ep.id === id ? { ...ep, ...updates } : ep));
  const deleteExtraPrice = (id) => setExtraPrices(prev => prev.filter(ep => ep.id !== id));

  return (
    <DataContext.Provider value={{
      categories, addCategory, updateCategory, deleteCategory,
      products, addProduct, updateProduct, deleteProduct,
      users, addUser, updateUser, deleteUser,
      customers, addCustomer, updateCustomer, deleteCustomer,
      units, addUnit, updateUnit, deleteUnit,
      extraPrices, addExtraPrice, updateExtraPrice, deleteExtraPrice,
      clearAllData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
