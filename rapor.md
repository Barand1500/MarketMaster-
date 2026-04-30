# Proje Oturum Raporu — 29 Nisan 2026

## Proje: Manav Yönetim Sistemi
**Stack:** React 19 + Vite (frontend) | Node.js + Express 4 (backend) | MySQL2

---

## 1. Kategori Dropdown Hemen Kapanıyordu — `src/pages/Products.jsx`

**Sorun:** Ürün satırına çift tıklayınca kategori dropdown'ı açılıyor ama hemen kapanıyordu.

**Kök Neden:** `editDropRef` tüm `map()` döngüsünde tek bir ref'ti. React her render'da bunu son satırın DOM node'una bağlıyordu. "Dışarı tıklandı mı?" event listener'ı hep son satırı izliyordu, diğer satırlarda dropdown'ı hemen kapatıyordu.

**Çözüm:**
```jsx
// ESKİ — hep son satıra işaret ediyordu
ref={editDropRef}

// YENİ — sadece o an düzenlenen satıra bağlandı
ref={isEditingCats ? editDropRef : null}
```

---

## 2. Kategori Güncelleme/Silme Çalışmıyordu — `src/context/DataContext.jsx`

**Sorun:** `updateCategory` ve `deleteCategory` sadece local state'i güncelliyordu, API'ye hiç istek atmıyordu.

**Çözüm:** Her iki fonksiyona da `fetch()` çağrısı + `try/catch` + `apiError` state'i eklendi.

---

## 3. Birimler String'den Object'e Çevrildi — `DataContext.jsx` + `Products.jsx` + `server.js`

**Sorun:** Birimler `["kg", "adet"]` şeklinde düz string dizisiydi. Güncelleme/silme için ID gerekiyordu.

**Çözüm:**
- Birimler artık `{ id: 1, name: "kg" }` objesi
- Backend'e eksik olan `PUT /api/birimler/:id` endpoint'i eklendi
- `Products.jsx`'teki `<option>` elementleri `key={u.id} value={u.name}` olarak güncellendi

---

## 4. API Hata Yönetimi + Loading State Eklendi — `DataContext.jsx` + `App.jsx`

**Eklenenler:**
- `DataContext`'teki tüm CRUD fonksiyonları `try/catch` bloğuna alındı
- `apiError` state + `clearApiError` fonksiyonu eklendi
- `loading` state eklendi (ilk veri yüklenirken)
- `App.jsx`'e:
  - Uygulama açılırken yeşil 🌿 spinner ekranı
  - Sağ altta çıkan, × ile kapatılabilen hata toast'ı

---

## 5. Fiyat Geçmişi Takibi — `server.js` + `DataContext.jsx` + `CustomerPortal.jsx`

**Sorun:** `fiyat_gecmisi` tablosu schema'da vardı ama hiç kullanılmıyordu. Müşteri portalında "son fiyat değişim tarihi" gözükmüyordu.

**Çözümler:**

**Backend `PUT /api/urunler/:id`:**
```js
// Eski fiyatı çek, farklıysa fiyat_gecmisi'ne kaydet
if (Number(eskiUrun.fiyat) !== Number(fiyat)) {
  await db.query(
    'INSERT INTO fiyat_gecmisi (urun_id, eski_fiyat, yeni_fiyat) VALUES (?, ?, ?)',
    [id, eskiUrun.fiyat, fiyat]
  );
}
```

**Backend `GET /api/urunler`:**
```sql
-- Subquery ile son değişim tarihi çekildi
(SELECT degisim_tarihi FROM fiyat_gecmisi 
 WHERE urun_id = u.id 
 ORDER BY degisim_tarihi DESC LIMIT 1) as son_fiyat_degisimi
```

**CustomerPortal:** `p.priceHistory` → `p.lastPriceChange` (gerçek alan adı) olarak düzeltildi.

---

## 6. Stok Durumu "Yok" Kaydedilmiyordu — `server.js` + `DataContext.jsx`

**Sorun:** `POST /api/urunler` INSERT sorgusunda `stok_durumu` hiç yoktu. DB her zaman default `TRUE` kaydediyordu. Yani stok yok seçsen bile "var" yazıyordu.

**Çözüm:**

Backend:
```js
// ESKİ
'INSERT INTO urunler (urun_adi, fiyat, birim_id, gorsel_yolu) VALUES (?, ?, ?, ?)'

// YENİ
'INSERT INTO urunler (urun_adi, fiyat, birim_id, gorsel_yolu, stok_durumu) VALUES (?, ?, ?, ?, ?)'
```

DataContext:
```js
// ESKİ — hardcoded
inStock: true

// YENİ — API'den gelen gerçek değer
inStock: data.stok_durumu === 1 || data.stok_durumu === true || data.stok_durumu === 'true'
```

---

## 7. Siparişler Sistemi Kaldırıldı — `database_schema.sql`

**Sorun:** Sipariş alma/verme özelliği artık istenmiyor.

**Yapılan:** `siparisler` ve `siparis_detaylari` tabloları schema'dan silindi. 10 tablo → 8 tablo kaldı.

---

## 8. Bcrypt Şifre Hashleme Sistemi Kuruldu

### 8a. Backend kurulum
```bash
cd backend
npm install bcrypt
```

### 8b. `server.js` başına eklendi:
```js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
```

### 8c. Kullanıcı/Müşteri Oluşturma (`POST`) — `server.js`
```js
// ESKİ
'INSERT INTO personeller (kullanici_adi, sifre, ...) VALUES (?, ?, ...)', [sifre, ...]

// YENİ
const hashedPassword = await bcrypt.hash(sifre, SALT_ROUNDS);
'INSERT INTO personeller (..., sifre, ...) VALUES (..., ?, ...)', [hashedPassword, ...]
```

### 8d. Kullanıcı/Müşteri Güncelleme (`PUT`) — `server.js`
```js
// Şifre gönderilmişse hashle, gönderilmemişse değiştirme
if (sifre) {
  const hashed = await bcrypt.hash(sifre, SALT_ROUNDS);
  await db.query('UPDATE personeller SET sifre = ? WHERE id = ?', [hashed, id]);
}
```

### 8e. Login bcrypt.compare ile güvenli hale getirildi — `server.js`
```js
// ESKİ — plain text SQL karşılaştırması (GÜVENSİZ)
'SELECT * FROM personeller WHERE kullanici_adi = ? AND sifre = ?', [username, password]

// YENİ — sadece kullanıcıyı bul, sonra bcrypt.compare ile karşılaştır
'SELECT * FROM personeller WHERE kullanici_adi = ?', [username]
const match = await bcrypt.compare(password, staff[0].sifre);
if (!match) return res.status(401).json({ error: 'Hatalı şifre' });
```

### 8f. Login yanıtından şifre çıkarıldı — `server.js`
```js
// ESKİ — hash bile olsa şifre frontend'e gidiyordu
res.json({ success: true, user: staff[0] })

// YENİ — destructuring ile sifre alanı çıkarıldı
const { sifre: _, ...safeUser } = staff[0];
res.json({ success: true, user: safeUser });
```

### 8g. `GET /api/personeller` şifre döndürmüyor — `server.js`
```sql
-- ESKİ
SELECT * FROM personeller

-- YENİ
SELECT id, ad, kullanici_adi, rol FROM personeller
```

### 8h. Yeni endpoint: `POST /api/verify-password` — `server.js`
CustomerPortal şifre değiştirirken mevcut şifreyi doğrulamak için:
```js
app.post('/api/verify-password', async (req, res) => {
  const { role, id, password } = req.body;
  // role: 'staff' veya 'customer'
  // ilgili tablodan hash çek, bcrypt.compare yap
});
```

---

## 9. Session'da Şifre Kalmadı — `Login.jsx`

```js
// ESKİ
password: data.user.sifre  // plain/hash şifre session'a giriyordu

// YENİ — tamamen kaldırıldı
delete mappedUser.sifre;
```

---

## 10. CustomerPortal Şifre Değiştirme Güvenli Hale Getirildi — `CustomerPortal.jsx`

**Sorun:** Şifre değiştirme butonu `customer.password === inputValue` şeklinde frontend'de plain text karşılaştırıyordu.

**Yeni akış:**
1. Kullanıcı "mevcut şifre" alanını iki kez girer (format doğrulaması)
2. İki alan birbirine eşit mi → ✅
3. `POST /api/verify-password` → backend `bcrypt.compare` yapar → ✅
4. Eşleşirse `PUT /api/musteriler/:id` ile yeni hash'li şifre kaydedilir

---

## 11. Profil Header'ı Güncellenmiyordu — `App.jsx` + `CustomerPortal.jsx`

**Sorun:** Müşteri profil bilgilerini düzenleyip kaydedince sayfanın üstündeki isim/bilgiler değişmiyordu.

**Çözüm:**
- `App.jsx`: `<CustomerPortal onSessionUpdate={setSession} />` prop'u eklendi
- `CustomerPortal.jsx`: Profil kaydedilince `onSessionUpdate(prev => ({ ...prev, name: ... }))` çağrısı yapıldı

---

## 12. Timer Gerçekten Veri Çekmiyordu — `DataContext.jsx` + `CustomerPortal.jsx`

**Sorun:** 20 saniyelik otomatik yenileme yalnızca `new Date()` state'ini güncelliyordu, API'ye hiç gitmiyordu.

**Çözüm:**
- `DataContext`'e `refetchProducts` async fonksiyonu eklendi (sadece ürünleri yeniden çeker)
- Timer: `await refetchProducts(); setLastRefreshed(new Date());`
- "Yenile" butonu: aynı şekilde `refetchProducts()` çağrısı

---

## 13. Dead Code Temizlendi — `DataContext.jsx`

Silinen şeyler:
- `import { v4 as uuidv4 } from 'uuid'`
- `INITIAL_CATEGORIES` sabit dizisi
- `INITIAL_UNITS` sabit dizisi
- `clearAllData` fonksiyonu

---

## 14. Empty String Bug'ı Düzeltildi — `DataContext.jsx`

```js
// ESKİ — kasıtlı olarak alanı boşaltmak imkansızdı
name: updates.name || current.name  // "" → current.name'e düşüyordu

// YENİ — undefined kontrolü
name: updates.name !== undefined ? updates.name : current.name
```

---

## 15. Seed.js Bcrypt ile Güncellendi — `backend/seed.js`

```js
// ESKİ — plain text şifre INSERT
'INSERT INTO personeller (kullanici_adi, sifre, rol) VALUES ("baran", "123", "admin")'

// YENİ — hashlenmiş şifre
const hash = await bcrypt.hash('123', SALT_ROUNDS);
'INSERT INTO personeller (...) VALUES ("baran", ?, "admin")', [hash]
```

Ayrıca kontrol `"ercan"` → `"baran"` olarak düzeltildi (yanlış kullanıcı adı kontrol ediliyordu).

---

## Genel Durum

| Alan | Durum |
|------|-------|
| Kategori dropdown bug | ✅ Düzeltildi |
| Birim CRUD (ID tabanlı) | ✅ Düzeltildi |
| API hata yönetimi | ✅ Eklendi |
| Loading spinner | ✅ Eklendi |
| Fiyat geçmişi otomatik kayıt | ✅ Eklendi |
| Stok durumu bug | ✅ Düzeltildi |
| Siparişler sistemi | ✅ Kaldırıldı |
| bcrypt şifre hashleme | ✅ Tüm noktalarda aktif |
| Session şifre güvenliği | ✅ Temizlendi |
| Müşteri profil header güncelleme | ✅ Düzeltildi |
| Timer gerçek veri çekme | ✅ Düzeltildi |

---

## ⚠️ Önemli Not — Veritabanı Bağlantısında Dikkat Et

Veritabanı başka bir PC'de. Bağlandığında:
1. `backend/.env` dosyasını oluştur (`backend/.env.example`'dan kopyala), `DB_HOST` o PC'nin IP'si
2. Eğer `personeller` tablosunda eski plain text şifreli kayıtlar varsa artık giriş yapılamaz
3. `node seed.js` çalıştır — "baran" kullanıcısı yoksa bcrypt'li şifreyle oluşturur
4. Mevcut müşteri kayıtları için şifreleri admin panelinden yeniden set et
