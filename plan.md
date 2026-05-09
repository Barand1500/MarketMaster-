# Patron Talepleri — Uygulama Planı (Tur 2)

> Adım adım gidiyoruz. Her adımda "adım X yap" diyeceksin.
> En sonda plan.md silinir.

---

## ADIM 1 — Products: Birim ve Kategori modal listesinde hover tooltip
**Dosya:** `src/pages/Products.jsx`

- Birim Yönetimi ve Kategori Yönetimi modallarındaki her liste öğesinin üzerine gelinince, ~600ms gecikmeyle gri konuşma balonu tarzı tooltip çıkar: **"Düzenlemek için çift tıklayınız"**
- Tooltip CSS ile yapılır (JS state veya title değil, `::after` veya tiny state)
- Tasarım: gri arka plan, beyaz metin, küçük aşağı ok, hafif shadow — mevcut tasarımı bozmaz
- Mouse çekince tooltip kaybolur

**Deploy:** sadece `frontend/`

---

## ADIM 2 — Products: Marka Yönetimi (yeni özellik)
**Dosya:** `backend/server.js`, `backend/database_schema.sql`, `src/context/DataContext.jsx`, `src/pages/Products.jsx`

### 2a — Veritabanı
- `markalar` tablosu: `id`, `ad` (varchar 100), `gorsel` (text, nullable), `created_at`
- Backend'e CRUD endpoint'leri: `GET /api/markalar`, `POST /api/markalar`, `PUT /api/markalar/:id`, `DELETE /api/markalar/:id`
- `urunler` tablosuna `marka_id` (int, nullable, FK → markalar.id) kolonu eklenir

### 2b — DataContext
- `markalar`, `addMarka`, `updateMarka`, `deleteMarka` context'e eklenir
- Ürün mapping'ine `markaId`, `markaAd`, `markaGorsel` alanları eklenir

### 2c — Products.jsx
- Tablo başlığına **Marka +** butonu eklenir (Birim + gibi aynı stil)
- Marka Yönetimi modalı: birim yönetimi ile aynı tasarım — liste + ekle formu
- Her marka satırında çift tıklayınca düzenlenebilir (adım 1'deki tooltip dahil)
- Ürün satırında **Kategori'den hemen sonra** marka alanı: `<input>` yazarken autocomplete dropdown açılır
  - Kullanıcı "a" yazınca "AMD", "Apple" gibi eşleşen markalar listelenir
  - Seçince marka adı + varsa görseli (küçük thumbnail) görünür
  - Boş bırakılabilir (zorunlu değil)

**Deploy:** `frontend/` + `backend/server.js`

---

## ADIM 3 — Products (admin): "Son Güncelleme" sütununu info ikonuna taşı
**Dosya:** `src/pages/Products.jsx`

- Tablodan **"Son Güncelleme"** başlığı ve her ürün satırındaki güncelleme tarihi sütunu kaldırılır
- İşlem sütunundaki çöp kutusu yanına **ℹ️** ikonu eklenir (küçük, aynı tarzda buton)
- ℹ️'ya tıklayınca o ürün için güzel bir bilgi popup'ı açılır:
  - Ürün adı, son fiyat değişikliği tarihi/saati, oluşturulma tarihi
  - Popup dışına tıklayınca kapanır
- Tasarım: mevcut işlem butonlarıyla uyumlu, popup hafif shadow + rounded

**Deploy:** sadece `frontend/`

---

## ADIM 4 — Products: KDV Yönetimi
**Dosya:** `backend/server.js`, `src/pages/Products.jsx`

### 4a — Veritabanı
- `urunler` tablosuna 2 kolon eklenir:
  - `kdv_orani` (decimal 5,2, nullable) — örn: 8.00, 18.00
  - `kdv_dahil` (tinyint(1), default NULL) — 1=dahil, 0=hariç, NULL=belirtilmemiş
- Backend GET/POST/PUT urunler bu kolonları içerir

### 4b — Products.jsx
- Ürün formunda (hem yeni ekleme hem düzenleme) fiyattan hemen sonra **KDV** bölümü:
  - Birim seçicisiyle aynı tasarım
  - **+** butonuna basınca KDV seçici açılır
  - Oran input'u (sayı, ör: 8 veya 18) + **Dahil / Hariç** toggle butonu
  - Boş bırakılabilir; seçilmişse yanında küçük etiket gösterilir (ör: `%8 Dahil`)
  - Kaldırmak için × butonu

**Deploy:** `frontend/` + `backend/server.js`

---

## ADIM 5 — CustomerPortal: Header'a Marka filtresi
**Dosya:** `src/pages/CustomerPortal.jsx`

- Header'da Kategoriler butonu gibi **Markalar** filtre butonu eklenir (aynı stil, aynı pozisyon)
- Tıklayınca dropdown açılır: sistemdeki markalar listelenir, her birinde marka adı + varsa küçük görsel
- Birden fazla marka seçilebilir
- Filtre hem kategori hem marka filtresini birlikte uygular
- Seçim yapılınca buton üzerinde seçili marka sayısı gösterilir (Kategoriler butonu gibi)

**Deploy:** sadece `frontend/`

---

## ADIM 6 — CustomerPortal: Yenileme süresini 1 dakikaya çıkar
**Dosya:** `src/pages/CustomerPortal.jsx`

- `setInterval(..., 20000)` → `setInterval(..., 60000)`

**Deploy:** sadece `frontend/`

---

## ADIM 7 — CustomerPortal: Ürün kutularında KDV bilgisi göster
**Dosya:** `src/pages/CustomerPortal.jsx`

- Grid ve liste görünümünde, "Son Fiyat Güncellemesi" metninin üstünde KDV bilgisi gösterilir
- Örnek: `%8 KDV Dahil` veya `%18 KDV Hariç`
- Sadece kdv_orani ve kdv_dahil dolu ürünlerde gösterilir, boşsa hiç çıkmaz
- Küçük, soluk bir etiket (mevcut "son güncelleme" yazısıyla aynı tarz)
- DataContext'te kdv alanları product mapping'e eklenir

**Deploy:** sadece `frontend/`

---

## ADIM 8 — CustomerPortal: Grid/Liste/Kur butonlarını birleştir
**Dosya:** `src/pages/CustomerPortal.jsx`

- Şu an ayrı duran **Grid ⊞**, **Liste ☰** ve **Kur ₺** butonları yan yana **tek bir grup** haline getirilir
- Sıralama: `⊞ | ☰ | ₺` (grid → list → kur) — aralarında ince ayırıcı çizgi
- Dışı tek kutucuk gibi görünür (border-radius sadece köşelerde), aktif olan highlight olur
- Tasarım: mevcut header renk temasıyla uyumlu, sade ve kompakt

**Deploy:** sadece `frontend/`

---

## ADIM 9 — Build & Deploy
- `npm run build` çalıştırılır
- Sunucuya yüklenecekler belirlenir ve sana söylenir

---

> Her adımda söyle: **"adım X yap"**
