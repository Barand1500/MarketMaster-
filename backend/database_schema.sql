-- BostanHub Veritabani Semasi (Database Schema) (Lütfen Ellemeyiniz)
-- Tum isimler Turkce karakter icermeden (g, u, s, i, o, c) Turkce olarak adlandirilmistir.
-- Foreign Key (Yabanci Anahtar) baglantilari mimari olarak eksiksiz kurulmustur.

-- 1. BIRIMLER TABLOSU (Kg, Adet, Demet vb.)
CREATE TABLE IF NOT EXISTS birimler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    birim_adi VARCHAR(50) NOT NULL UNIQUE
);

-- Varsayilan birimleri ekle
INSERT IGNORE INTO birimler (birim_adi) VALUES ('Kg'), ('Adet'), ('Demet'), ('Kasa'), ('Paket');

-- 2. KATEGORILER TABLOSU (Meyveler, Sebzeler vb.)
CREATE TABLE IF NOT EXISTS kategoriler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    kategori_adi VARCHAR(100) NOT NULL,
    ust_kategori_id INT DEFAULT NULL,
    FOREIGN KEY (ust_kategori_id) REFERENCES kategoriler(id) ON DELETE SET NULL
);

-- 3. URUNLER TABLOSU
CREATE TABLE IF NOT EXISTS urunler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    urun_adi VARCHAR(255) NOT NULL,
    fiyat DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    birim_id INT NOT NULL,
    gorsel_yolu LONGTEXT DEFAULT NULL,
    stok_durumu BOOLEAN DEFAULT TRUE,
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    bilgi_guncelleme_tarihi TIMESTAMP NULL DEFAULT NULL,
    fiyat_guncelleme_tarihi TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (birim_id) REFERENCES birimler(id) ON DELETE RESTRICT
);

-- 4. URUN_KATEGORI_ILISKISI (Many-to-Many)
CREATE TABLE IF NOT EXISTS urun_kategori_iliskisi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    urun_id INT NOT NULL,
    kategori_id INT NOT NULL,
    FOREIGN KEY (urun_id) REFERENCES urunler(id) ON DELETE CASCADE,
    FOREIGN KEY (kategori_id) REFERENCES kategoriler(id) ON DELETE CASCADE,
    UNIQUE(urun_id, kategori_id)
);

-- 5. MUSTERILER TABLOSU
CREATE TABLE IF NOT EXISTS musteriler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_soyad VARCHAR(255) NOT NULL,
    vkn_tc VARCHAR(11) DEFAULT NULL UNIQUE,
    telefon VARCHAR(20) DEFAULT NULL UNIQUE,
    eposta VARCHAR(255) NOT NULL UNIQUE,
    sifre VARCHAR(255) NOT NULL,
    iskonto_orani DECIMAL(5, 2) DEFAULT 0.00,
    adres TEXT DEFAULT NULL,
    kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. PERSONELLER TABLOSU
CREATE TABLE IF NOT EXISTS personeller (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_soyad VARCHAR(255) NOT NULL,
    kullanici_adi VARCHAR(100) NOT NULL UNIQUE,
    sifre VARCHAR(255) NOT NULL,
    kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PERSONEL_YETKILERI
CREATE TABLE IF NOT EXISTS personel_yetkileri (
    id INT PRIMARY KEY AUTO_INCREMENT,
    personel_id INT NOT NULL,
    sayfa_adi VARCHAR(100) NOT NULL,
    FOREIGN KEY (personel_id) REFERENCES personeller(id) ON DELETE CASCADE,
    UNIQUE(personel_id, sayfa_adi)
);

-- 8. FIYAT_GECMISI
CREATE TABLE IF NOT EXISTS fiyat_gecmisi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    urun_id INT NOT NULL,
    eski_fiyat DECIMAL(10, 2) NOT NULL,
    yeni_fiyat DECIMAL(10, 2) NOT NULL,
    degisim_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (urun_id) REFERENCES urunler(id) ON DELETE CASCADE
);
