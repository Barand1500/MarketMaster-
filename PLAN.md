# 🗂️ PATRON RAPORU — UYGULAMA GELİŞTİRME PLANI

> **Kural:** Her adım bitmeden sonrakine geçme. Git'e yükleme BEN söyleyince yapılır.

---

## ✅ ADIM 1 — Kategori Bölme Çizgisi Ortalanacak

**Sorun:** İki kategori arasındaki yatay çizgi (---) şu an üst kategoriye çok yakın duruyor.
**Çözüm:** Çizginin üst ve alt boşluklarını eşit yapacağız. Müşteri portalındaki CSS'de `margin` değerini üstte daha fazla artırarak ortaya çekiyoruz.

**Dosya:** `src/pages/CustomerPortal.jsx` → CSS içindeki `.category-divider` kuralı

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 2 — Ürün Kutuları (Kartları) Baştan Tasarım

**Sorun:** Ürün kartları eski ve dağınık görünüyor, patronun istediği düzeni yok.

**Yapılacaklar:**
- 📋 **"Son Bilgi Güncellemesi"** satırı tamamen kaldırılacak
- 💰 **"Son Fiyat Güncellemesi"** tarih formatı tam olacak: `5 Mayıs 2026 14:30` (kısaltma yok)
- **Ürün ismi** (örn: ÇERİ DOMATES) kart üstünde ortalanacak
- **Birim** (Kg, Paket vb.) artık indirim rozetinin bulunduğu alanda gösterilecek — sağ üst köşede
- **"SANA ÖZEL" rozeti** kaldırılacak, yerine fotoğraftaki gibi düzgün bir rozet gelecek:
  - Renkli arka plan (sarı/turuncu)
  - Solda **%10** (indirim miktarı) yazılı
  - Yanında **İndirim** yazısı
  - Tasarım: Müşteri Yönetimi sayfasındaki mobil kartlardaki rozete bakılarak yapılacak

**Dosya:** `src/pages/CustomerPortal.jsx`

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 3 — Stokta Olmayan Ürünler Müşteri Portalında Gözükmeyecek

**Sorun:** Şu an stokta olmayan ürünler müşteriye gri/soluk olarak gösteriliyor.
**Çözüm:** Müşteri portalında ürün filtrelemesine `inStock !== false` kontrolü eklenecek. Stokta olmayan ürün hiç listelenmeyecek. Müşteri görmeyecek, varmış gibi gösterilmeyecek.

**Dosya:** `src/pages/CustomerPortal.jsx` → `filteredProducts` filtresi

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 4 — Admin Navbar'da Logo ve Yazı Yan Yana Görünecek

**Sorun:** Admin olarak girince üst çubukta (navbar) yüklenen resim logo yukarıda, "BOSTAN" yazısı aşağıda duruyor — yan yana değil.
**Çözüm:** Navbar bileşeninde logo resmi ve site adı yazısı `display: flex; align-items: center` ile yan yana hizalanacak. Resim boyutu sabitlenecek (yükseklik: ~28px).

**Dosya:** `src/components/Navbar.jsx` (logo bölümü) + `src/components/Navbar.css`

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 5 — Tüm Modaller ESC Tuşu ile Kapanacak + × Yanına ESC Yazısı

**Sorun:** Şu an bazı modaller sadece × butonuyla kapanıyor, ESC çalışmıyor. Dışarıya (overlay'a) dokunarak kapanma patronu rahatsız ediyor.
**Çözüm:**
- Sitedeki **tüm modaller** (admin ve müşteri portalı dahil) için `ESC` tuşu dinlenecek ve modal kapanacak
- Dışarıya tıklayarak kapanma **kaldırılacak** (`onClick` overlay listener silinecek)
- × butonu yanına küçük `ESC` etiketi eklenecek ki kullanıcı anlasın

**Dosyalar:** `src/pages/CustomerPortal.jsx`, `src/pages/Products.jsx`, `src/pages/Customers.jsx`, `src/pages/Users.jsx`, `src/pages/Settings.jsx`, `src/components/Navbar.jsx`

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 6 — Ürünler Sayfası "Nasıl Kullanılır" Modalından Logo/Yazı Kaldırılacak

**Sorun:** Ürünler sayfasındaki 💡 Nasıl Kullanılır? modalında BOSTAN logosu ve yazısı var, kalması gerekmiyor.
**Çözüm:** İlgili modal içeriğinde logo ve "BOSTAN" metnini içeren kısım kaldırılacak, sadece açıklama metni kalacak.

**Dosya:** `src/pages/Products.jsx` → `helpContent` prop'u içindeki logo/başlık kısmı

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 7 — Site Ayarları: Kırmızı Uyarı Kutusu Boydan Boya Olacak

**Sorun:** "Dikkat — Bu ayarlar tüm sistemi etkiler!" yazan kırmızı kutu şu an yarım genişlikte duruyor.
**Çözüm:** Kutunun `maxWidth` kısıtlaması kaldırılacak, sayfa genişliğinin tamamına yayılacak.

**Dosya:** `src/pages/Settings.jsx` → uyarı div'inin `maxWidth: '600px'` satırı kaldırılacak

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 8 — Site Ayarları: Logo ve Favicon Seçimleri Yan Yana Olacak

**Sorun:** Görünüm Ayarları kartında Logo ve Favicon alanları alt alta duruyor, bu yüzden kart çok uzun. Veri Yedekleme kartıyla aynı boyda olması istenmiyor.
**Çözüm:** Logo ve Favicon satırları tek satırda yan yana (`flex-direction: row`) dizilecek. Böylece kart daha kısa olacak ve Veri Yedekleme kartıyla eşit boya gelecek.

**Dosya:** `src/pages/Settings.jsx` → Logo + Favicon alanlarını saran `div`

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## ✅ ADIM 9 — İskonto Alanı: "20+20" Formatı + Oklar Kaldırılacak + Hesaplama

**Sorun:** İskonto alanı şu an sadece tek sayı (`%10` gibi) kabul ediyor. Patron `20+20` gibi zincirleme iskonto girebilmek istiyor.

**Zincirleme iskonto nasıl hesaplanır?**
> 20+20 → önce %20 uygula → kalan 80 → onun %20'si → kalan 64 → yani gerçek indirim %36 olur.
> Formül: `100 - ((100 - a) × (100 - b) / 100)`

**Yapılacaklar:**
- İskonto input'u `type="text"` olacak (number değil) — böylece `20+20` yazılabilecek
- Yukarı/aşağı oklar (spinners) CSS ile gizlenecek
- Müşteri portalında fiyat hesaplanırken bu formül kullanılacak
- Admin tabloda görünen değer yazılan metin olarak (`20+20`) gösterilecek, yanında parantez içinde gerçek oran `(%36)` yazılacak
- Kaydetme sırasında hesaplanan gerçek oran veritabanına kaydedilecek

**Dosyalar:** `src/pages/Customers.jsx`, `src/pages/CustomerPortal.jsx`

**Sunucuya yüklenecek:** `frontend/` klasörü *(backend değişmez, gerçek oran zaten DB'de)*

---

## ✅ ADIM 10 — Müşteri Portalı: Ürün Sıralama Butonu

**Sorun:** Müşteri ürünleri göreceli sırada görüyor, istediği gibi sıralayamıyor.
**Çözüm:** Müşteri portalı üst çubuğuna bir **Sırala** butonu/dropdown eklenecek. Tüm kategorilerdeki ürünleri etkileyecek.

**Sıralama seçenekleri:**
- 🔤 A → Z (isme göre)
- 🔤 Z → A (isme göre ters)
- 💰 En Düşük Fiyat
- 💰 En Yüksek Fiyat
- 🆕 En Yeni Eklenen
- 🕐 En Son Güncellenen

**Dosya:** `src/pages/CustomerPortal.jsx`

**Sunucuya yüklenecek:** `frontend/` klasörü

---

## 📦 GENEL SUNUCU YÜKLEME KURALI

| Ne değişti? | Ne yüklenecek? |
|---|---|
| Sadece frontend (src/) | `frontend/` klasörünü siteye yükle |
| Sadece backend (server.js) | `backend/server.js` yükle → `pm2 restart manav-backend` |
| Her ikisi | İkisini de yükle |

> **Not:** Her adım tamamlandığında ne yükleyeceğin burada yazıyor. Git'e yükleme ayrıca söylenecek.
