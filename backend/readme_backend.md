# BostanHub Backend & Veritabani Yapilandirmasi

Bu dizin, projenin veritabani mimarisini ve backend yapilandirmasini icermektedir. Veritabani tasarimi, iliskisel (Relational) model üzerine kurulu olup verimlilik ve veri bütünlügü (integrity) on planda tutulmustur.

## 🛠 Veritabani Tasarim Kurallari
1.  **Isimlendirme:** Tum tablo ve sutun isimleri Turkce kelimelerden secilmistir.
2.  **Karakter Seti:** Uyumluluk acisindan `g, u, s, i, o, c` gibi standart Latin karakterleri kullanilmis; `ğ, ü, ş, İ, ö, ç` harflerinden kacinilmistir.
3.  **Iliskiler (Foreign Keys):** Tablolar arasi baglantilar `FOREIGN KEY` kisitlamalari ile guclendirilmistir. (Ornegin: Bir kategori silindiginde urunlerin kategorisiz kalmasi veya bir urun silindiginde fiyat gecmisinin otomatik silinmesi gibi).

## 📊 Tablo Yapilari

### 1. `birimler` & `kategoriler`
*   **Birimler:** 'Kg', 'Adet', 'Paket' gibi statik verileri tutar. Urunler buraya baglidir.
*   **Kategoriler:** `ust_kategori_id` ile kendi icinde iliskilidir. Bu sayede 'Meyve > Yaz Meyveleri > Karpuz' gibi sonsuz derinlikte hiyerarsi olusturulabilir.

### 2. `urunler` & `urun_kategori_iliskisi`
*   Bir urunun birden fazla kategoriye (ornegin hem 'Kampanyali' hem 'Meyve') atanabilmesi icin **Many-to-Many** (Coka-Cok) iliski kurulmustur.

### 3. `musteriler` & `personeller`
*   **Musteriler:** Portal girisi yapacak olan son kullanicilari tutar. `iskonto_orani` buradan kontrol edilir.
*   **Personeller:** Yonetici panelini kullanacak yetkili kisilerdir.

### 4. `personel_yetkileri`
*   Esnek yetkilendirme sistemi. Bir personelin sadece 'Urunler' sayfasini gormesini veya tum sayfalara (admin) erismesini saglar.

### 5. `fiyat_gecmisi` (Log Sistemi)
*   Urunun fiyati her degistiginde eski ve yeni fiyati tarihle birlikte kaydeder. Boylece fiyat dalgalanmalari analiz edilebilir.

### 6. `siparisler` & `siparis_detaylari`
*   Sistem su an siparis almasa da, altyapi buna tam uyumlu olarak hazirlanmistir.

---

## 🚀 Uygulama
Bu SQL dosyasini MySQL, PostgreSQL veya SQLite gibi iliskisel veritabani yonetim sistemlerinde calistirarak tablo yapisini aninda olusturabilirsiniz.
