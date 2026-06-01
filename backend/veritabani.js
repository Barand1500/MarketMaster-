// ============================================
// VERİTABANI GÜNCELLEME DOSYASI
// ============================================
// Bu dosya mevcut veritabanını güncel şemaya yükseltir
// Tüm eksik tabloları ve kolonları ekler
// Çalıştırma: node veritabani.js
// ============================================

require('dotenv').config();
const mysql = require('mysql2');

// Veritabanı bağlantısı
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'b2b-bostan'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Veritabanı bağlantı hatası:', err.message);
    process.exit(1);
  }
  console.log('✅ Veritabanına bağlanıldı');
  runMigrations();
});

function runMigrations() {
  console.log('\n🔄 Veritabanı güncellemeleri başlıyor...\n');

  // 1. BİRİMLER TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS birimler (
    id INT PRIMARY KEY AUTO_INCREMENT,
    birim_adi VARCHAR(50) NOT NULL UNIQUE
  )`, (err) => {
    if (err) console.warn('⚠️  birimler tablo hatası:', err.message);
    else {
      console.log('✅ birimler tablosu hazır');
      // Varsayılan birimleri ekle
      db.query(`INSERT IGNORE INTO birimler (id, birim_adi) VALUES 
        (1, 'Adet'),
        (2, 'Kg'),
        (3, 'Demet'),
        (4, 'Kasa'),
        (5, 'Paket')`, (err2) => {
        if (!err2) console.log('✅ Varsayılan birimler eklendi');
      });
    }
  });

  // 2. SITE AYARLARI TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS site_settings (
    \`key\` VARCHAR(100) PRIMARY KEY,
    \`value\` MEDIUMTEXT
  )`, (err) => {
    if (err) console.warn('⚠️  site_settings tablo hatası:', err.message);
    else {
      console.log('✅ site_settings tablosu hazır');
      // Varsayılan değerleri ekle
      const defaults = [
        ['site_adi', 'Bostan Manav'],
        ['logo', ''],
        ['favicon', ''],
        ['gorsel_kayit_tipi', 'veritabani']
      ];
      defaults.forEach(([k, v]) => {
        db.query('INSERT IGNORE INTO site_settings (\`key\`, \`value\`) VALUES (?, ?)', [k, v]);
      });
    }
  });

  // 3. MARKALAR TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS markalar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad VARCHAR(100) NOT NULL,
    gorsel LONGTEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.warn('⚠️  markalar tablo hatası:', err.message);
    else console.log('✅ markalar tablosu hazır');
  });

  // markalar.gorsel kolonunu LONGTEXT'e yükselt
  db.query("ALTER TABLE markalar MODIFY COLUMN gorsel LONGTEXT DEFAULT NULL", (err) => {
    if (err && err.code !== 'ER_BAD_FIELD_ERROR') {
      // Kolon yoksa veya başka hata
    } else if (!err) {
      console.log('✅ markalar.gorsel LONGTEXT yapıldı');
    }
  });

  // 4. PARA BİRİMLERİ TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS para_birimleri (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad VARCHAR(100) NOT NULL,
    kisa_ad VARCHAR(20) NOT NULL,
    sembol VARCHAR(10) NOT NULL,
    kur_tipi ENUM('manuel','api') NOT NULL DEFAULT 'manuel',
    kur DECIMAL(15,6) NOT NULL DEFAULT 1.000000,
    son_guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.warn('⚠️  para_birimleri tablo hatası:', err.message);
    else {
      console.log('✅ para_birimleri tablosu hazır');
      // Varsayılan TRY ekle
      db.query(`INSERT IGNORE INTO para_birimleri (id, ad, kisa_ad, sembol, kur_tipi, kur) 
                VALUES (1, 'Türk Lirası', 'TRY', '₺', 'manuel', 1.000000)`);
    }
  });

  // para_birimleri.kur_turu kolonu ekle
  db.query(`ALTER TABLE para_birimleri ADD COLUMN kur_turu ENUM('doviz_alis','doviz_satis','efektif_alis','efektif_satis') NOT NULL DEFAULT 'doviz_satis'`, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ para_birimleri.kur_turu kolonu eklendi');
    }
  });

  // 5. KDV ORANLARI TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS kdv_oranlari (
    id INT PRIMARY KEY AUTO_INCREMENT,
    oran DECIMAL(5,2) NOT NULL,
    dahil TINYINT(1) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.warn('⚠️  kdv_oranlari tablo hatası:', err.message);
    else console.log('✅ kdv_oranlari tablosu hazır');
  });

  // kdv_oranlari.dahil NULL yap
  db.query('ALTER TABLE kdv_oranlari MODIFY COLUMN dahil TINYINT(1) NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_BAD_FIELD_ERROR') {
      // Zaten NULL ise
    } else if (!err) {
      console.log('✅ kdv_oranlari.dahil NULL yapıldı');
    }
  });

  // 6. FİYAT TANIMLARI TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS fiyat_tanimlari (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad VARCHAR(100) NOT NULL,
    baslangic_tarihi DATE NULL,
    bitis_tarihi DATE NULL,
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.warn('⚠️  fiyat_tanimlari tablo hatası:', err.message);
    else console.log('✅ fiyat_tanimlari tablosu hazır');
  });

  // 7. FİYATLAR TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS fiyatlar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fiyat_adi VARCHAR(100) NULL DEFAULT NULL,
    urun_id INT NOT NULL,
    birim_id INT NOT NULL,
    carpan DECIMAL(10,4) NOT NULL DEFAULT 1,
    fiyat DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    para_birimi_id INT NOT NULL DEFAULT 1,
    kdv_oran_id INT DEFAULT NULL,
    iskonto_tipi ENUM('oran','tutar') DEFAULT NULL,
    iskonto_orani DECIMAL(10,2) DEFAULT NULL,
    barkod VARCHAR(100) DEFAULT NULL,
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (urun_id) REFERENCES urunler(id) ON DELETE CASCADE,
    FOREIGN KEY (birim_id) REFERENCES birimler(id) ON DELETE RESTRICT,
    FOREIGN KEY (para_birimi_id) REFERENCES para_birimleri(id) ON DELETE RESTRICT,
    FOREIGN KEY (kdv_oran_id) REFERENCES kdv_oranlari(id) ON DELETE SET NULL
  )`, (err) => {
    if (err) console.warn('⚠️  fiyatlar tablo hatası:', err.message);
    else console.log('✅ fiyatlar tablosu hazır');
  });

  // fiyatlar.kdv_dahil kolonu ekle
  db.query('ALTER TABLE fiyatlar ADD COLUMN kdv_dahil TINYINT(1) NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ fiyatlar.kdv_dahil kolonu eklendi');
    }
  });

  // fiyatlar.fiyat_tanimi_id kolonu ekle
  db.query('ALTER TABLE fiyatlar ADD COLUMN fiyat_tanimi_id INT NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ fiyatlar.fiyat_tanimi_id kolonu eklendi');
    }
  });

  // fiyatlar.fiyat_adi kolonunu NULL yap (INSERT sorgusunda kullanılmıyor)
  db.query('ALTER TABLE fiyatlar MODIFY COLUMN fiyat_adi VARCHAR(100) NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_BAD_FIELD_ERROR') {
      // Kolon yoksa
    } else if (!err) {
      console.log('✅ fiyatlar.fiyat_adi NULL yapıldı');
    }
  });

  // 8. FİYAT GEÇMİŞİ TABLOSU
  db.query(`CREATE TABLE IF NOT EXISTS fiyat_gecmisi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    urun_id INT NOT NULL,
    eski_fiyat DECIMAL(10,2) NOT NULL,
    yeni_fiyat DECIMAL(10,2) NOT NULL,
    degisim_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (urun_id) REFERENCES urunler(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) console.warn('⚠️  fiyat_gecmisi tablo hatası:', err.message);
    else console.log('✅ fiyat_gecmisi tablosu hazır');
  });

  // fiyat_gecmisi kolonları ekle
  db.query("ALTER TABLE fiyat_gecmisi ADD COLUMN degisim_tipi ENUM('urun_fiyati','fiyat_satiri') NOT NULL DEFAULT 'urun_fiyati'", (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ fiyat_gecmisi.degisim_tipi kolonu eklendi');
    }
  });

  db.query('ALTER TABLE fiyat_gecmisi ADD COLUMN fiyat_id INT NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ fiyat_gecmisi.fiyat_id kolonu eklendi');
    }
  });

  db.query('ALTER TABLE fiyat_gecmisi ADD COLUMN fiyat_tanimi_id INT NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ fiyat_gecmisi.fiyat_tanimi_id kolonu eklendi');
    }
  });

  // 9. URUNLER TABLOSU KOLONLARI
  // bilgi_guncelleme_tarihi ve fiyat_guncelleme_tarihi
  ['bilgi_guncelleme_tarihi', 'fiyat_guncelleme_tarihi'].forEach(col => {
    db.query(`ALTER TABLE urunler ADD COLUMN ${col} TIMESTAMP NULL DEFAULT NULL`, (err) => {
      if (err && err.code !== 'ER_DUP_FIELDNAME') {
        // Kolon zaten varsa
      } else if (!err) {
        console.log(`✅ urunler.${col} kolonu eklendi`);
      }
    });
  });

  // urunler.marka_id kolonu
  db.query('ALTER TABLE urunler ADD COLUMN marka_id INT NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ urunler.marka_id kolonu eklendi');
    }
  });

  // urunler.kdv_orani + kdv_dahil
  db.query('ALTER TABLE urunler ADD COLUMN kdv_orani DECIMAL(5,2) NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ urunler.kdv_orani kolonu eklendi');
    }
  });

  db.query('ALTER TABLE urunler ADD COLUMN kdv_dahil TINYINT(1) NULL DEFAULT NULL', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ urunler.kdv_dahil kolonu eklendi');
    }
  });

  // urunler.stok_kodu kolonu
  db.query('ALTER TABLE urunler ADD COLUMN stok_kodu VARCHAR(100) NULL UNIQUE', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ urunler.stok_kodu kolonu eklendi');
    }
  });

  // urunler.para_birimi_id kolonu
  db.query('ALTER TABLE urunler ADD COLUMN para_birimi_id INT NULL DEFAULT 1', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      // Kolon zaten varsa
    } else if (!err) {
      console.log('✅ urunler.para_birimi_id kolonu eklendi');
    }
  });

  // 10. İSKONTO KOLONLARI (urunler, kategoriler, markalar)
  ['urunler', 'kategoriler', 'markalar'].forEach(tbl => {
    db.query(`ALTER TABLE ${tbl} ADD COLUMN iskonto_orani DECIMAL(10,2) NULL DEFAULT NULL`, (err) => {
      if (err && err.code !== 'ER_DUP_FIELDNAME') {
        // Kolon zaten varsa
      } else if (!err) {
        console.log(`✅ ${tbl}.iskonto_orani kolonu eklendi`);
      }
    });

    db.query(`ALTER TABLE ${tbl} ADD COLUMN iskonto_tipi ENUM('oran','tutar') NULL DEFAULT NULL`, (err) => {
      if (err && err.code !== 'ER_DUP_FIELDNAME') {
        // Kolon zaten varsa
      } else if (!err) {
        console.log(`✅ ${tbl}.iskonto_tipi kolonu eklendi`);
      }
    });

    // iskonto_orani VARCHAR(100) yap (bileşik "20+20" ifadesi için)
    db.query(`ALTER TABLE ${tbl} MODIFY COLUMN iskonto_orani VARCHAR(100) DEFAULT NULL`, (err) => {
      if (err && err.code !== 'ER_BAD_FIELD_ERROR') {
        // Kolon yoksa veya başka hata
      } else if (!err) {
        console.log(`✅ ${tbl}.iskonto_orani VARCHAR(100) yapıldı`);
      }
    });
  });

  // Tüm işlemler tamamlandığında (5 saniye bekle - tüm callback'lerin bitmesi için)
  setTimeout(() => {
    console.log('\n✅ Veritabanı güncellemeleri tamamlandı!');
    console.log('📦 Tüm tablolar ve kolonlar güncel şemaya yükseltildi.\n');
    console.log('ℹ️  Eğer bazı kolonlar eklenmediysiz tekrar çalıştırın: node veritabani.js\n');
    db.end();
    process.exit(0);
  }, 5000);
}
