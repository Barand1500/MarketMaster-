# Bostan Manav — Büyük Güncelleme Planı
**Tarih:** Mayıs 2026  
**Kural:** Her adım biter → build alınır → sunucuya yüklenir → sonraki adıma geçilir.

---

## ADIM 1 — Admin Panel Temizliği (Hızlı, Kolay) YAPILDI
**Ne yapılacak:**
- Ürünler sayfasındaki "📦 Ürün ve Stok Yönetimi / Ürün Veritabanı ve Stok Yönetimi" açıklama yazısı kaldırılacak.
- Müşteriler sayfasındaki "👥 Müşteri Yönetimi / Müşteri portföyünüzü..." yazısı kaldırılacak.
- Kullanıcılar sayfasındaki "🛡️ Kullanıcı Yönetimi / Sisteme girebilecek..." yazısı kaldırılacak.
- Ayarlar sayfasındaki "⚙️ Site Ayarları / Sitenin adını..." yazısı kaldırılacak.
- Her sayfadaki "💡 Nasıl Kullanılır?" butonundan yazı kaldırılacak, sadece 💡 simgesi kalacak.
- Ürünler sayfasındaki "Excel'den Ürün Yükle" butonu, "Hızlı Ara" arama kutusunun yanına taşınacak.

**Neden bu sırada:** En hızlı adım, hiçbir şeye bağımlı değil, riske girmeden temizlenir.  
**Değişen dosyalar:** `Products.jsx`, `Customers.jsx`, `Users.jsx`, `Settings.jsx`, `PageHeader.jsx`

---

## ADIM 2 — Sayfalama Kalıcılığı (Hızlı, Kolay)   YAPILDI
**Ne yapılacak:**
- Ürünler sayfasındaki "5 / 10 / 20" sayfa boyutu seçimi localStorage'a kaydedilecek.
- Sayfa yenilendiğinde veya farklı sayfaya gidip gelindiğinde son seçilen sayfa boyutu korunacak.
- Varsayılan 10 olmaya devam edecek ama bir kez 20 seçilirse hep 20 açılacak.

**Neden bu sırada:** Tek satırlık düzeltme, bağımsız.  
**Değişen dosyalar:** `Products.jsx`

---

## ADIM 3 — KDV Oranları Görünüm Düzeltmesi (Hızlı, Kolay)  YAPILDI
**Ne yapılacak:**
- KDV Yönetimi modalında oranlar şu an "%%10" gibi görünüyor (iki tane % işareti var).
- Baştaki fazla % işareti kaldırılacak, sadece "%10" görünecek.
- Yeşil arkaplan (badge görünümü) kaldırılacak, düz metin olarak gösterilecek.

**Neden bu sırada:** Görsel düzeltme, 5 dakika iş.  
**Değişen dosyalar:** `Products.jsx`

---

## ADIM 4 — Sırala Butonu Taşıma (Kolay) 
**Ne yapılacak:**
- Müşteri portalı header'ındaki "Sırala" yazılı butondan yazı kaldırılacak, sadece ikon (⇅ veya benzeri) kalacak.
- Bu buton header'dan alınacak, ürün listesinin altındaki "Son Güncelleme / Döviz Kurları / Grid / Liste" butonlarının yanına taşınacak.
- Mantığı (sıralama açılır menüsü) aynı kalacak, sadece yeri değişecek.

**Neden bu sırada:** Bağımsız, frontend değişikliği.  
**Değişen dosyalar:** `CustomerPortal.jsx`

---

## ADIM 5 — Kategori Düzenleme: Üst Kategori Değiştirme (Orta) YAPILDI
**Ne yapılacak:**
- Şu an Kategori Yönetimi modalında bir kategoriye çift tıklayınca sadece ismini değiştirebiliyorsun.
- Yeni haliyle çift tıklanınca hem "Kategori Adı" hem de "Ana Kategori" (üst kategori) alanları dolacak.
- Üst kategoriyi de değiştirebilirsin — yani alt kategoriyi başka bir ana kategorinin altına taşıyabilirsin.
- Kaydet butonuna basınca hem isim hem üst kategori güncellenecek.

**Neden bu sırada:** Sadece modal mantığı, backend zaten destekliyor.  
**Değişen dosyalar:** `Products.jsx`

---

## ADIM 6 — Görsel Depolama: Base64'ten Dosya Sistemine (Büyük, Altyapı)
**Ne yapılacak:**
- Şu an ürün ve marka görselleri veritabanına base64 metin olarak kaydediliyor. Bu veritabanını şişiriyor.
- Backend'e yeni bir `/uploads` klasörü açılacak. Görseller buraya `.jpg/.png` olarak kaydedilecek.
- Veritabanında artık sadece dosya yolu tutulacak: örn. `/uploads/urunler/elma.jpg`
- Frontend'de görsel seçildiğinde artık base64 yerine gerçek dosya yükleme (form-data) yapılacak.
- Aynı sistem marka görselleri için de geçerli olacak.
- **Eski görseller:** Mevcut base64 görseller olduğu gibi kalır (eski ürünler görünmeye devam eder). Yeni eklenen veya güncellenen ürünler artık dosya yoluyla çalışır.
- Marka Yönetimi modalında görselin üzerine gelince çıkan kalem simgesi de bu adımda kaldırılacak.

**Neden bu sırada:** Adım 7 (Markalar sayfası) ve Adım 9 (Fiyat sistemi) bu altyapıya ihtiyaç duyuyor.  
**Yeni paket:** `multer` (dosya yükleme için)  
**Değişen dosyalar:** `server.js`, `Products.jsx`  
**Yeni klasör:** `backend/uploads/urunler/`, `backend/uploads/markalar/`

---

## ADIM 7 — Müşteri Portalı: Kategori Navigasyonu Yenileme (Büyük, Frontend)
**Ne yapılacak:**
- Header'daki "Kategoriler" butonuna tıklayınca açılan menü tamamen yenileniyor.
- Yeni tasarım:
  - Header altında bir **breadcrumb** (Ev > Meyveler > Tropik Meyveler gibi navigasyon çubuğu) gösterilecek.
  - Bir ana kategoriye tıklanınca alt kategorileri altında listelenecek.
  - Alt kategorinin alt kategorisi varsa o da açılacak (accordion/tree yapısı).
  - Herhangi bir kategoriye tıklayınca ürünler o kategoriye göre filtrelenecek.
  - Sonsuz derinlikte alt kategori desteklenecek.
- Header sabit kalacak.

**Neden bu sırada:** Tamamen frontend, backend değişmiyor.  
**Değişen dosyalar:** `CustomerPortal.jsx`

---

## ADIM 8 — Müşteri Portalı: Markalar Sayfası (Orta, Frontend)
**Ne yapılacak:**
- Header'daki "Markalar" butonuna tıklayınca artık açılır menü değil, yeni bir ekran/sayfa açılacak.
- Markalar sayfasında her marka bir kart olarak gösterilecek.
- Kart içinde: Logo varsa logo + isim, yoksa ismin baş harfi büyük kutu içinde + isim.
- Kartın altında "X ürün" yazacak (o markaya bağlı kaç ürün var).
- Bir markaya tıklayınca ürün listesi o markaya göre filtrelenecek.
- Header her iki sayfada da sabit kalacak.

**Neden bu sırada:** Adım 6 ile görsel altyapısı hazır, bu adım görece kolay.  
**Değişen dosyalar:** `CustomerPortal.jsx`

---

## ADIM 9 — Fiyat Listesi Sistemi (EN BÜYÜK ADIM)
**Ne yapılacak (sade anlatım):**

### Sorun ne şu an?
Şu an her ürünün tek bir fiyatı var. Tüm müşteriler aynı fiyatı görüyor (sadece iskonto oranı farklı).

### Yeni sistem nasıl çalışacak?
Her ürünün artık **birden fazla birimi** olabilecek. Örneğin:
- 1 Adet → 10 ₺
- 1 Paket (10 Adet) → 90 ₺ (çarpan: 10)
- 1 Koli (100 Adet) → 800 ₺ (çarpan: 100)

Her birim için **3 farklı fiyat seviyesi** tanımlanabilecek:
- **Fiyat 1** (örn. perakende): 10 ₺
- **Fiyat 2** (örn. bayi): 8 ₺
- **Fiyat 3** (örn. toptancı): 6 ₺

Her fiyat seviyesinin kendi para birimi ve iskonto oranı olabilecek.

**"Fiyat Tanımı"** sistemi:
- Admin, "BARAN" veya "Bayi Fiyatı" gibi fiyat tanımları oluşturacak.
- Her tanımda başlangıç/bitiş tarihi ve müşteri tipi (Son Kullanıcı, Bayi, Dağıtıcı) seçilebilecek.
- Bir müşteriye bu tanımlardan biri atanacak.
- Atama yapılınca o müşterinin İskonto % alanı devre dışı kalacak (pasif görünecek).

**Müşteri portalında:**
- Müşteriye hangi fiyat tanımı atandıysa, o tanımın gösterdiği fiyat sütununu (1/2/3) görecek.
- Hiçbir fiyat tanımı atanmamış müşteri eski sistemle (normal fiyat + iskonto %) çalışmaya devam edecek.

### Veritabanına eklenecek tablolar:
1. **`urun_birim_fiyatlari`** — Her ürün için birim + çarpan + Fiyat1/2/3 + KDV + barkod satırları
2. **`fiyat_tanimlari`** — Fiyat listesi tanımları (Ad, Tip, Tarih aralığı)
3. **`musteri_fiyat_tanimi`** — Müşteri ↔ Fiyat Tanımı bağlantısı

### Admin panelde:
- Ürünler sayfasına her ürüne tıklayınca "Fiyat Bilgisi" sekmesi eklenecek.
- Müşteriler sayfasında İskonto % yanına "Fiyat Tipi" seçimi eklenecek.
- Fiyat Tanımı Yönetimi eklenecek (Ayarlar veya ayrı sayfa).

**⚠️ Bu adım ikiye bölünecek:**
- **9A:** Veritabanı + backend API'ler
- **9B:** Frontend: Admin panel UI
- **9C:** Frontend: Müşteri portalında doğru fiyatı göstermek

**Değişen/eklenen dosyalar:** `server.js` (yeni tablolar + API'ler), `Products.jsx`, `Customers.jsx`, `CustomerPortal.jsx`, `DataContext.jsx`

---

## SIRA ÖZETİ

| Adım | Konu | Zorluk | Süre tahmini |
|------|------|--------|--------------|
| 1 | Admin yazı temizliği + Excel buton taşıma | ⭐ Kolay | 15 dk |
| 2 | Sayfalama localStorage kalıcılığı | ⭐ Kolay | 10 dk |
| 3 | KDV oranları görünüm düzeltmesi | ⭐ Kolay | 10 dk |
| 4 | Sırala butonu ikon + yer değiştirme | ⭐⭐ Kolay | 20 dk |
| 5 | Kategori düzenleme üst kategori desteği | ⭐⭐ Orta | 30 dk |
| 6 | Görsel sistemi dosya yoluna geçiş | ⭐⭐⭐ Büyük | 1-2 saat |
| 7 | Müşteri kategoriler navigasyonu yenileme | ⭐⭐⭐ Büyük | 1-2 saat |
| 8 | Markalar sayfası | ⭐⭐ Orta | 45 dk |
| 9A | Fiyat sistemi - veritabanı + backend | ⭐⭐⭐⭐ Çok Büyük | 2-3 saat |
| 9B | Fiyat sistemi - admin paneli UI | ⭐⭐⭐⭐ Çok Büyük | 2-3 saat |
| 9C | Fiyat sistemi - müşteri portalı | ⭐⭐⭐ Büyük | 1-2 saat |

---

## SUNUCUYA YÜKLEME KURALI
Her adım bittikten sonra:
1. `npm run build` komutu çalıştırılır (`frontend/` klasörü oluşur)
2. Değişen dosyalar sunucuya yüklenir (her adımda hangi dosyalar değişti yazılacak)
3. Adım 6'dan itibaren backend dosyası da değiştiği için `pm2 restart manav-backend` gerekecek

---

## AÇIK SORULAR (CEVAPLANDI ✅)
- [x] **Soru 1 — Müşteri portalında fiyat gösterimi:**
  - Ürün kutusunda önce varsayılan (normal) fiyat görünecek.
  - Altında "Sana Özel" badge'i + müşteriye atanmış özel fiyat gösterilecek.
  - Badge'de normal fiyat ile özel fiyat arasındaki indirim % yazacak.
  - Fiyat tanımı atanmış müşteride İskonto % alanı pasif/devre dışı olacak (elle giriş yapılamayacak).

- [x] **Soru 2 — İskonto % alanı:**
  - Alan tamamen kaybolmayacak. Admin sayfasında görünecek ama gri/disabled olacak.
  - Fiyat tanımı varken İskonto % alanına elle girilemeyecek.

- [x] **Soru 3 — Mevcut base64 görseller:**
  - Adım 6'da mevcut base64 görseller için de bir çözüm yapılacak.
  - Backend'e bir "migration endpoint" eklenecek: mevcut base64 verileri dosya sistemine taşıyıp yolu DB'ye yazacak.
  - Böylece eski görseller de temizlenmiş olacak.