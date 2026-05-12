const express = require('express'); 
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
dotenv.config();

// Mail Yapilandirmasi - Resend API
// Not: Gercek gonderim icin .env dosyasina RESEND_API_KEY eklenmelidir.
// Ucretsiz kayit: https://resend.com - Gunluk 100 email ucretsiz
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let resetCodes = {}; // { email: { code, expires } }

// Gunluk email limiti takibi (Resend ucretsiz: 100/gun)
const EMAIL_COUNT_FILE = path.join(__dirname, 'email-count.json');
const DAILY_EMAIL_LIMIT = 100;

function loadEmailCount() {
  try {
    if (fs.existsSync(EMAIL_COUNT_FILE)) {
      const data = JSON.parse(fs.readFileSync(EMAIL_COUNT_FILE, 'utf8'));
      return data;
    }
  } catch (e) {
    console.error('Email sayaci okuma hatasi:', e);
  }
  return { count: 0, date: new Date().toDateString() };
}

function saveEmailCount(data) {
  try {
    fs.writeFileSync(EMAIL_COUNT_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Email sayaci yazma hatasi:', e);
  }
}

let dailyEmailCount = loadEmailCount();

function checkDailyLimit() {
  const today = new Date().toDateString();
  if (dailyEmailCount.date !== today) {
    // Yeni gun, sayaci sifirla
    dailyEmailCount = { count: 0, date: today };
    saveEmailCount(dailyEmailCount);
  }
  if (dailyEmailCount.count >= DAILY_EMAIL_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: DAILY_EMAIL_LIMIT - dailyEmailCount.count };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb', type: 'text/plain' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Veritabani Baglantisi
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Baglantiyi Test Et
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Veritabani baglanti hatasi:', err.message);
  } else {
    console.log('✅ MySQL Veritabanina basariyla baglanildi: ' + process.env.DB_NAME);
    connection.release();
  }
});

// Startup migration: Yeni kolonlari ekle (MySQL uyumlu, kolon varsa sessizce atla)
['bilgi_guncelleme_tarihi'].forEach(col => {
  db.query(`ALTER TABLE urunler ADD COLUMN ${col} TIMESTAMP NULL DEFAULT NULL`, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      console.warn(`Migration uyarisi (${col}):`, err.message);
    } else if (!err) {
      console.log(`✅ Migration: ${col} kolonu eklendi`);
    }
  });
});

// Startup migration: personeller tablosuna eposta kolonu ekle
db.query('ALTER TABLE personeller ADD COLUMN eposta VARCHAR(255) DEFAULT NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.warn('Migration uyarisi (personeller.eposta):', err.message);
  } else if (!err) {
    console.log('✅ Migration: personeller.eposta kolonu eklendi');
  }
});

// Startup migration: site_settings tablosu oluştur
db.query(`CREATE TABLE IF NOT EXISTS site_settings (
  \`key\` VARCHAR(100) PRIMARY KEY,
  \`value\` MEDIUMTEXT
)`, (err) => {
  if (err) { console.warn('site_settings tablo oluşturma hatası:', err.message); return; }
  // Varsayılan değerleri ekle (INSERT IGNORE: varsa atla)
  const defaults = [
    ['site_adi', 'Bostan Manav'],
    ['logo', ''],
    ['favicon', '']
  ];
  defaults.forEach(([k, v]) => {
    db.query('INSERT IGNORE INTO site_settings (`key`, `value`) VALUES (?, ?)', [k, v]);
  });
});

// --- SİTE AYARLARI API ---
app.get('/api/ayarlar', (req, res) => {
  db.query('SELECT `key`, `value` FROM site_settings', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  });
});

app.put('/api/ayarlar', (req, res) => {
  const { site_adi, logo, favicon } = req.body;
  const updates = [];
  if (site_adi !== undefined) updates.push(['site_adi', site_adi]);
  if (logo !== undefined) updates.push(['logo', logo]);
  if (favicon !== undefined) updates.push(['favicon', favicon]);
  if (updates.length === 0) return res.json({ success: true });
  let done = 0;
  let hasError = false;
  updates.forEach(([k, v]) => {
    db.query('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [k, v, v], (err) => {
      if (err && !hasError) { hasError = true; return res.status(500).json({ error: err.message }); }
      done++;
      if (done === updates.length && !hasError) res.json({ success: true });
    });
  });
});

// Cleanup migration: fiyat_guncelleme_tarihi kolonu artik gerekmiyor, fiyat_gecmisi tablosu kullaniliyor
db.query(`ALTER TABLE urunler DROP COLUMN fiyat_guncelleme_tarihi`, (err) => {
  if (err && err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
    // Kolon zaten yoksa veya baska hata — sessizce atla
  } else if (!err) {
    console.log('✅ Migration: fiyat_guncelleme_tarihi kolonu kaldirildi');
  }
});

// Startup migration: fiyat_gecmisi tablosu yoksa olustur
db.query(`CREATE TABLE IF NOT EXISTS fiyat_gecmisi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  urun_id INT NOT NULL,
  eski_fiyat DECIMAL(10,2) NOT NULL,
  yeni_fiyat DECIMAL(10,2) NOT NULL,
  degisim_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (urun_id) REFERENCES urunler(id) ON DELETE CASCADE
)`, (err) => {
  if (err) console.warn('fiyat_gecmisi tablo olusturma hatasi:', err.message);
  else console.log('✅ Migration: fiyat_gecmisi tablosu hazir');
});

// Startup migration: markalar tablosu
db.query(`CREATE TABLE IF NOT EXISTS markalar (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ad VARCHAR(100) NOT NULL,
  gorsel LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
  if (err) console.warn('markalar tablo olusturma hatasi:', err.message);
  else console.log('✅ Migration: markalar tablosu hazir');
});

// Startup migration: markalar.gorsel kolonunu LONGTEXT'e yükselt (base64 görseller için)
db.query("ALTER TABLE markalar MODIFY COLUMN gorsel LONGTEXT DEFAULT NULL", (err) => {
  if (err && err.code !== 'ER_BAD_FIELD_ERROR') { /* zaten dogru tip */ }
  else if (!err) console.log('✅ Migration: markalar.gorsel LONGTEXT yapıldı');
});

// Startup migration: urunler.marka_id kolonu
db.query('ALTER TABLE urunler ADD COLUMN marka_id INT NULL DEFAULT NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.warn('Migration uyarisi (urunler.marka_id):', err.message);
  } else if (!err) {
    console.log('✅ Migration: urunler.marka_id kolonu eklendi');
  }
});

// Startup migration: urunler.kdv_orani + kdv_dahil
db.query('ALTER TABLE urunler ADD COLUMN kdv_orani DECIMAL(5,2) NULL DEFAULT NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') console.warn('Migration uyarisi (urunler.kdv_orani):', err.message);
  else if (!err) console.log('✅ Migration: urunler.kdv_orani kolonu eklendi');
});
db.query('ALTER TABLE urunler ADD COLUMN kdv_dahil TINYINT(1) NULL DEFAULT NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') console.warn('Migration uyarisi (urunler.kdv_dahil):', err.message);
  else if (!err) console.log('✅ Migration: urunler.kdv_dahil kolonu eklendi');
});

// Startup migration: urunler.stok_kodu kolonu
db.query('ALTER TABLE urunler ADD COLUMN stok_kodu VARCHAR(100) NULL UNIQUE', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') console.warn('Migration uyarisi (urunler.stok_kodu):', err.message);
  else if (!err) console.log('✅ Migration: urunler.stok_kodu kolonu eklendi');
});

// Startup migration: kdv_oranlari.dahil NULL yap (mevcut tablo icin)
db.query('ALTER TABLE kdv_oranlari MODIFY COLUMN dahil TINYINT(1) NULL DEFAULT NULL', (err) => {
  if (err) console.warn('Migration uyarisi (kdv_oranlari.dahil NULL):', err.message);
  else console.log('✅ Migration: kdv_oranlari.dahil NULL yapıldı');
});

// Startup migration: kdv_oranlari tablosu (önceden tanımlı oranlar)
db.query(`CREATE TABLE IF NOT EXISTS kdv_oranlari (
  id INT PRIMARY KEY AUTO_INCREMENT,
  oran DECIMAL(5,2) NOT NULL,
  dahil TINYINT(1) NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
  if (err) console.warn('kdv_oranlari tablo olusturma hatasi:', err.message);
  else console.log('✅ Migration: kdv_oranlari tablosu hazir');
});

// --- MARKALAR API ---
app.get('/api/markalar', (req, res) => {
  db.query('SELECT * FROM markalar ORDER BY ad', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/markalar', (req, res) => {
  const { ad, gorsel } = req.body;
  if (!ad || !ad.trim()) return res.status(400).json({ error: 'Marka adı zorunludur.' });
  db.query('INSERT INTO markalar (ad, gorsel) VALUES (?, ?)', [ad.trim(), gorsel || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, ad: ad.trim(), gorsel: gorsel || null });
  });
});

app.put('/api/markalar/:id', (req, res) => {
  const { ad, gorsel } = req.body;
  if (!ad || !ad.trim()) return res.status(400).json({ error: 'Marka adı zorunludur.' });
  db.query('UPDATE markalar SET ad=?, gorsel=? WHERE id=?', [ad.trim(), gorsel || null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, ad: ad.trim(), gorsel: gorsel || null });
  });
});

app.delete('/api/markalar/:id', (req, res) => {
  db.query('DELETE FROM markalar WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- KDV ORANLARI API ---
app.get('/api/kdv-oranlari', (req, res) => {
  db.query('SELECT * FROM kdv_oranlari ORDER BY oran, dahil DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/kdv-oranlari', (req, res) => {
  const { oran } = req.body;
  const oranVal = parseFloat(oran);
  if (isNaN(oranVal) || oranVal < 0) return res.status(400).json({ error: 'Geçerli bir oran giriniz.' });
  db.query('INSERT INTO kdv_oranlari (oran, dahil) VALUES (?, NULL)', [oranVal], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, oran: oranVal, dahil: null });
  });
});

app.put('/api/kdv-oranlari/:id', (req, res) => {
  const { oran } = req.body;
  const oranVal = parseFloat(oran);
  if (isNaN(oranVal) || oranVal < 0) return res.status(400).json({ error: 'Geçerli bir oran giriniz.' });
  db.query('UPDATE kdv_oranlari SET oran = ?, dahil = NULL WHERE id = ?', [oranVal, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: parseInt(req.params.id), oran: oranVal, dahil: null });
  });
});

app.delete('/api/kdv-oranlari/:id', (req, res) => {
  db.query('DELETE FROM kdv_oranlari WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- BIRIMLER API ---
app.get('/api/birimler', (req, res) => {
  db.query('SELECT * FROM birimler', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/birimler', (req, res) => {
  const { birim_adi } = req.body;
  db.query('INSERT INTO birimler (birim_adi) VALUES (?)', [birim_adi], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, birim_adi });
  });
});

app.put('/api/birimler/:id', (req, res) => {
  const { birim_adi } = req.body;
  db.query('UPDATE birimler SET birim_adi = ? WHERE id = ?', [birim_adi, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, birim_adi });
  });
});

app.delete('/api/birimler/:id', (req, res) => {
  db.query('DELETE FROM birimler WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- KATEGORILER API ---
app.get('/api/kategoriler', (req, res) => {
  db.query('SELECT * FROM kategoriler', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/kategoriler', (req, res) => {
  const { kategori_adi, ust_kategori_id } = req.body;
  db.query('INSERT INTO kategoriler (kategori_adi, ust_kategori_id) VALUES (?, ?)', 
    [kategori_adi, ust_kategori_id || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, kategori_adi, ust_kategori_id });
  });
});

app.put('/api/kategoriler/:id', (req, res) => {
  const { kategori_adi, ust_kategori_id } = req.body;
  db.query('UPDATE kategoriler SET kategori_adi = ?, ust_kategori_id = ? WHERE id = ?', [kategori_adi, ust_kategori_id ?? null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/kategoriler/:id', (req, res) => {
  db.query('DELETE FROM kategoriler WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- URUNLER API ---
app.get('/api/urunler', (req, res) => {
  // Urunleri bagli olduklari birim adi, kategori ID'leri ve son fiyat degisim tarihi ile birlikte getir
  const sql = `
    SELECT u.*, b.birim_adi, 
    (SELECT GROUP_CONCAT(kategori_id) FROM urun_kategori_iliskisi WHERE urun_id = u.id) as kategori_ids,
    (SELECT degisim_tarihi FROM fiyat_gecmisi WHERE urun_id = u.id ORDER BY degisim_tarihi DESC LIMIT 1) as son_fiyat_degisimi,
    pb.kisa_ad as pb_kisa_ad, pb.sembol as pb_sembol, pb.kur as pb_kur, pb.kur_turu as pb_kur_turu,
    m.ad as marka_ad, m.gorsel as marka_gorsel
    FROM urunler u
    LEFT JOIN birimler b ON u.birim_id = b.id
    LEFT JOIN para_birimleri pb ON u.para_birimi_id = pb.id
    LEFT JOIN markalar m ON u.marka_id = m.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(r => ({
      ...r,
      kategori_ids: r.kategori_ids ? r.kategori_ids.split(',').map(Number) : []
    })));
  });
});

app.post('/api/urunler', (req, res) => {
  const { urun_adi, fiyat, birim_id, birim_adi, gorsel_yolu, kategori_ids, stok_durumu, para_birimi_id, marka_id, kdv_orani, kdv_dahil, stok_kodu } = req.body;

  if (!urun_adi || !urun_adi.trim()) return res.status(400).json({ error: 'Ürün adı zorunludur.' });
  const price = parseFloat(fiyat);
  if (isNaN(price) || price < 0) return res.status(400).json({ error: 'Fiyat geçerli ve sıfır veya pozitif bir sayı olmalıdır.' });
  const stok = stok_durumu !== undefined ? stok_durumu : true;
  const pbId = para_birimi_id || 1;
  const markaId = marka_id || null;
  const kdvOrani = (kdv_orani !== undefined && kdv_orani !== null && kdv_orani !== '') ? parseFloat(kdv_orani) : null;
  const kdvDahil = (kdv_dahil !== undefined && kdv_dahil !== null) ? (kdv_dahil ? 1 : 0) : null;
  const stokKodu = (stok_kodu && stok_kodu.trim()) ? stok_kodu.trim() : null;
  
  const insertProduct = (bId) => {
    db.query('INSERT INTO urunler (urun_adi, fiyat, birim_id, gorsel_yolu, stok_durumu, para_birimi_id, marka_id, kdv_orani, kdv_dahil, stok_kodu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [urun_adi, price, bId, gorsel_yolu, stok, pbId, markaId, kdvOrani, kdvDahil, stokKodu], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Bu stok kodu zaten kullanılıyor.' });
        return res.status(500).json({ error: err.message });
      }
      const urunId = result.insertId;
      if (Array.isArray(kategori_ids) && kategori_ids.length > 0) {
        const values = kategori_ids.map(kid => [urunId, kid]);
        db.query('INSERT INTO urun_kategori_iliskisi (urun_id, kategori_id) VALUES ?', [values]);
      }
      res.json({ id: urunId, urun_adi, fiyat: price, birim_id: bId, gorsel_yolu, kategori_ids, stok_durumu: stok, para_birimi_id: pbId, stok_kodu: stokKodu });
    });
  };

  if (birim_adi) {
    db.query('SELECT id FROM birimler WHERE birim_adi = ?', [birim_adi], (err, bres) => {
      insertProduct(bres.length > 0 ? bres[0].id : 1);
    });
  } else {
    insertProduct(birim_id || 1);
  }
});

app.put('/api/urunler/:id', (req, res) => {
  const { urun_adi, fiyat, birim_id, birim_adi, gorsel_yolu, stok_durumu, kategori_ids, para_birimi_id, marka_id, kdv_orani, kdv_dahil, stok_kodu } = req.body;
  if (!urun_adi || !urun_adi.trim()) return res.status(400).json({ error: 'Ürün adı zorunludur.' });
  const price = parseFloat(fiyat);
  if (isNaN(price) || price < 0) return res.status(400).json({ error: 'Fiyat geçerli ve sıfır veya pozitif bir sayı olmalıdır.' });
  const pbId = para_birimi_id || 1;
  const markaId = marka_id !== undefined ? (marka_id || null) : undefined;
  const kdvOrani = kdv_orani !== undefined ? ((kdv_orani !== null && kdv_orani !== '') ? parseFloat(kdv_orani) : null) : undefined;
  const kdvDahil = kdv_dahil !== undefined ? (kdv_dahil !== null ? (kdv_dahil ? 1 : 0) : null) : undefined;
  const stokKodu = stok_kodu !== undefined ? ((stok_kodu && stok_kodu.trim()) ? stok_kodu.trim() : null) : undefined;

  const updateProd = (bId) => {
    // Once mevcut fiyati al, degistiyse gecmise kaydet
    db.query('SELECT fiyat, urun_adi, birim_id, gorsel_yolu, stok_durumu FROM urunler WHERE id = ?', [req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const current = rows[0];
      const eskiFiyat = current ? parseFloat(current.fiyat) : null;

      // Bilgi alanlarinda degisim var mi? (fiyat haric)
      const fiyatDegisti = eskiFiyat !== null && eskiFiyat !== price;
      const bilgiDegisti = current && (
        current.urun_adi !== urun_adi ||
        current.birim_id !== bId ||
        String(current.gorsel_yolu || '') !== String(gorsel_yolu || '') ||
        Number(current.stok_durumu) !== Number(stok_durumu ? 1 : 0) ||
        (current.para_birimi_id || 1) !== pbId
      );

      let updateSql = 'UPDATE urunler SET urun_adi = ?, fiyat = ?, birim_id = ?, gorsel_yolu = ?, stok_durumu = ?, para_birimi_id = ?';
      const updateParams = [urun_adi, price, bId, gorsel_yolu, stok_durumu, pbId];

      if (markaId !== undefined) { updateSql += ', marka_id = ?'; updateParams.push(markaId); }
      if (kdvOrani !== undefined) { updateSql += ', kdv_orani = ?'; updateParams.push(kdvOrani); }
      if (kdvDahil !== undefined) { updateSql += ', kdv_dahil = ?'; updateParams.push(kdvDahil); }
      if (stokKodu !== undefined) { updateSql += ', stok_kodu = ?'; updateParams.push(stokKodu); }
      if (bilgiDegisti) updateSql += ', bilgi_guncelleme_tarihi = NOW()';
      updateSql += ' WHERE id = ?';
      updateParams.push(req.params.id);

      db.query(updateSql, updateParams, (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Bu stok kodu zaten kullanılıyor.' });
          return res.status(500).json({ error: err.message });
        }
        
        // Fiyat degistiyse fiyat_gecmisi tablosuna yaz
        if (fiyatDegisti) {
          db.query('INSERT INTO fiyat_gecmisi (urun_id, eski_fiyat, yeni_fiyat) VALUES (?, ?, ?)',
            [req.params.id, eskiFiyat, price]);
        }
        
        if (Array.isArray(kategori_ids)) {
          // Kategori degisimini kontrol et
          db.query('SELECT kategori_id FROM urun_kategori_iliskisi WHERE urun_id = ? ORDER BY kategori_id', [req.params.id], (err2, catRows) => {
            const mevcutCatIds = catRows ? catRows.map(r => r.kategori_id).sort((a, b) => a - b) : [];
            const yeniCatIds = [...kategori_ids].map(Number).sort((a, b) => a - b);
            if (!bilgiDegisti && JSON.stringify(mevcutCatIds) !== JSON.stringify(yeniCatIds)) {
              db.query('UPDATE urunler SET bilgi_guncelleme_tarihi = NOW() WHERE id = ?', [req.params.id]);
            }
            db.query('DELETE FROM urun_kategori_iliskisi WHERE urun_id = ?', [req.params.id], () => {
              if (kategori_ids.length > 0) {
                const values = kategori_ids.map(kid => [req.params.id, kid]);
                db.query('INSERT INTO urun_kategori_iliskisi (urun_id, kategori_id) VALUES ?', [values]);
              }
            });
            res.json({ success: true });
          });
        } else {
          res.json({ success: true });
        }
      });
    });
  };

  if (birim_adi) {
    db.query('SELECT id FROM birimler WHERE birim_adi = ?', [birim_adi], (err, bres) => {
      updateProd(bres.length > 0 ? bres[0].id : 1);
    });
  } else {
    updateProd(birim_id || 1);
  }
});

app.delete('/api/urunler/:id', (req, res) => {
  db.query('DELETE FROM urunler WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- MUSTERILER API ---
app.get('/api/musteriler', (req, res) => {
  db.query('SELECT * FROM musteriler', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/musteriler', (req, res) => {
  const { ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres } = req.body;
  if (!ad_soyad || !ad_soyad.trim()) return res.status(400).json({ error: 'Müşteri adı zorunludur.' });
  const iskonto = iskonto_orani || '0';
  db.query('INSERT INTO musteriler (ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto, adres], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Bu TC/VKN numarası başka bir müşteriye kayıtlıdır. Lütfen TC/VKN numaranızı kontrol ediniz.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: result.insertId, ...req.body });
  });
});

app.put('/api/musteriler/:id', (req, res) => {
  const { ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres } = req.body;
  const handleDbErr = (err, res) => {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Bu TC/VKN numarası başka bir müşteriye kayıtlıdır. Lütfen TC/VKN numaranızı kontrol ediniz.' });
    }
    return res.status(500).json({ error: err.message });
  };
  if (sifre) {
    db.query('UPDATE musteriler SET ad_soyad=?, vkn_tc=?, telefon=?, eposta=?, sifre=?, iskonto_orani=?, adres=? WHERE id=?',
      [ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres, req.params.id], (err) => {
      if (err) return handleDbErr(err, res);
      res.json({ success: true });
    });
  } else {
    db.query('UPDATE musteriler SET ad_soyad=?, vkn_tc=?, telefon=?, eposta=?, iskonto_orani=?, adres=? WHERE id=?',
      [ad_soyad, vkn_tc, telefon, eposta, iskonto_orani, adres, req.params.id], (err) => {
      if (err) return handleDbErr(err, res);
      res.json({ success: true });
    });
  }
});

app.delete('/api/musteriler/:id', (req, res) => {
  db.query('DELETE FROM musteriler WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- PERSONELLER API ---
app.get('/api/personeller', (req, res) => {
  const sql = `
    SELECT p.id, p.ad_soyad, p.kullanici_adi, p.sifre, p.kayit_tarihi,
    (SELECT GROUP_CONCAT(sayfa_adi) FROM personel_yetkileri WHERE personel_id = p.id) as yetkiler
    FROM personeller p
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(r => ({
      ...r,
      yetkiler: r.yetkiler ? r.yetkiler.split(',') : []
    })));
  });
});
app.post('/api/personeller', (req, res) => {
  const { ad_soyad, kullanici_adi, sifre, yetkiler } = req.body;
  if (!ad_soyad || !ad_soyad.trim()) return res.status(400).json({ error: 'Ad Soyad zorunludur.' });
  if (!kullanici_adi || !kullanici_adi.trim()) return res.status(400).json({ error: 'Kullanıcı adı zorunludur.' });
  if (!sifre) return res.status(400).json({ error: 'Şifre zorunludur.' });
  db.query('INSERT INTO personeller (ad_soyad, kullanici_adi, sifre) VALUES (?, ?, ?)',
    [ad_soyad, kullanici_adi, sifre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const personelId = result.insertId;
    if (yetkiler && yetkiler.length > 0) {
      const values = yetkiler.map(y => [personelId, y]);
      db.query('INSERT INTO personel_yetkileri (personel_id, sayfa_adi) VALUES ?', [values], (err2) => {
        if (err2) console.error('Yetki ekleme hatasi:', err2);
      });
    }
    res.json({ id: personelId, ...req.body });
  });
});

app.put('/api/personeller/:id', (req, res) => {
  const { ad_soyad, kullanici_adi, sifre, yetkiler, eposta } = req.body;
  if (!ad_soyad || !ad_soyad.trim()) return res.status(400).json({ error: 'Ad Soyad zorunludur.' });
  if (!kullanici_adi || !kullanici_adi.trim()) return res.status(400).json({ error: 'Kullanıcı adı zorunludur.' });

  const sql = sifre
    ? 'UPDATE personeller SET ad_soyad=?, kullanici_adi=?, sifre=?, eposta=? WHERE id=?'
    : 'UPDATE personeller SET ad_soyad=?, kullanici_adi=?, eposta=? WHERE id=?';
  const params = sifre
    ? [ad_soyad, kullanici_adi, sifre, eposta || null, req.params.id]
    : [ad_soyad, kullanici_adi, eposta || null, req.params.id];
  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (Array.isArray(yetkiler)) {
      db.query('DELETE FROM personel_yetkileri WHERE personel_id = ?', [req.params.id], () => {
        if (yetkiler.length > 0) {
          const values = yetkiler.map(y => [req.params.id, y]);
          db.query('INSERT INTO personel_yetkileri (personel_id, sayfa_adi) VALUES ?', [values]);
        }
      });
    }
    res.json({ success: true });
  });
});

// Profil güncelleme (sadece ad_soyad ve eposta)
app.patch('/api/personeller/:id/profil', (req, res) => {
  const { ad_soyad, eposta } = req.body;
  if (!ad_soyad || !ad_soyad.trim()) return res.status(400).json({ error: 'Ad Soyad zorunludur.' });
  db.query('UPDATE personeller SET ad_soyad=?, eposta=? WHERE id=?',
    [ad_soyad.trim(), eposta ? eposta.trim() : null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Şifre değiştirme (mevcut şifre doğrulama ile)
app.post('/api/personeller/:id/sifre-degistir', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Yeni şifre zorunludur.' });
  db.query('SELECT id FROM personeller WHERE id=? AND sifre=?', [req.params.id, currentPassword], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'Mevcut şifre yanlış.' });
    db.query('UPDATE personeller SET sifre=? WHERE id=?', [newPassword, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// Personel şifre sıfırlama: kod gönder
app.post('/api/personeller-reset/send-code', (req, res) => {
  const { email } = req.body;
  db.query('SELECT id, ad_soyad FROM personeller WHERE eposta = ?', [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: 'Bu e-posta adresiyle kayıtlı personel bulunamadı.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    resetCodes[email] = { code, expires };

    const limitCheck = checkDailyLimit();
    if (!limitCheck.allowed) return res.status(429).json({ error: 'Günlük email limitine ulaşıldı.' });
    if (!resend) return res.status(503).json({ error: 'E-posta servisi şu an kullanılamıyor.' });

    try {
      await resend.emails.send({
        from: 'Bostan Manav <onboarding@resend.dev>',
        to: email,
        subject: '🔐 Şifre Sıfırlama Kodunuz',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f0fdf4;border-radius:16px"><div style="text-align:center;margin-bottom:24px"><div style="font-size:48px">🍉</div><h2 style="color:#0f172a">Bostan Manav</h2></div><p>Merhaba <strong>${rows[0].ad_soyad}</strong>,</p><p>Şifre sıfırlama kodunuz:</p><div style="text-align:center;padding:24px;background:#fff;border-radius:12px;border:2px dashed #00b894;margin:24px 0"><span style="font-size:36px;font-weight:800;color:#00b894;letter-spacing:8px;font-family:monospace">${code}</span></div><p style="color:#64748b;font-size:13px">Bu kod 5 dakika geçerlidir. Kimseyle paylaşmayın.</p></div>`
      });
      dailyEmailCount.count++;
      saveEmailCount(dailyEmailCount);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'E-posta gönderilemedi.' });
    }
  });
});

// Personel şifre sıfırlama: kodu doğrula ve yeni şifre ata
app.post('/api/personeller-reset/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const entry = resetCodes[email];
  if (!entry || entry.code !== code || Date.now() > entry.expires) {
    return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş kod.' });
  }
  db.query('UPDATE personeller SET sifre=? WHERE eposta=?', [newPassword, email], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    delete resetCodes[email];
    res.json({ success: true });
  });
});

app.delete('/api/personeller/:id', (req, res) => {
  if (req.params.id === '1') return res.status(403).json({ error: 'Admin silinemez' });
  db.query('DELETE FROM personeller WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});
// --- LOGIN (GIRIS) ---
app.post('/api/login', (req, res) => {
  const { identity, password } = req.body;

  const checkCustomer = () => {
    const custSql = 'SELECT * FROM musteriler WHERE (eposta = ? OR telefon = ? OR vkn_tc = ?) AND sifre = ?';
    db.query(custSql, [identity, identity, identity, password], (err2, cust) => {
      if (err2 || !cust || cust.length === 0) return res.status(401).json({ error: 'Bilgiler hatali!' });
      return res.json({ user: cust[0], role: 'customer' });
    });
  };

  // Once Personel mi diye bak (kullanici_adi ve sifre ile)
  db.query('SELECT * FROM personeller WHERE kullanici_adi = ? AND sifre = ?', [identity, password], (err, staff) => {
    if (err) return res.status(500).json({ error: err.message });
    if (staff && staff.length > 0) {
      const pId = staff[0].id;
      const isAdmin = staff[0].kullanici_adi === 'admin';
      db.query('SELECT sayfa_adi FROM personel_yetkileri WHERE personel_id = ?', [pId], (err3, perms) => {
        const yetkiler = perms ? perms.map(p => p.sayfa_adi) : [];
        return res.json({ user: { ...staff[0], yetkiler }, role: isAdmin ? 'admin' : 'staff' });
      });
      return;
    }
    checkCustomer();
  });
});

// --- SIFRE DOGRULAMA ---
app.post('/api/verify-password', (req, res) => {
  const { userId, password, role } = req.body;
  if (!['staff', 'customer'].includes(role)) return res.status(400).json({ valid: false });
  const table = role === 'staff' ? 'personeller' : 'musteriler';
  db.query(`SELECT id FROM ${table} WHERE id = ? AND sifre = ?`, [userId, password], (err, rows) => {
    if (err || !rows || rows.length === 0) return res.json({ valid: false });
    res.json({ valid: true });
  });
});

// --- SIFRE SIFIRLAMA (FORGOT PASSWORD) ---
app.post('/api/send-reset-code', (req, res) => {
  const { email } = req.body;
  db.query('SELECT id, ad_soyad FROM musteriler WHERE eposta = ?', [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: 'Bu e-posta adresiyle kayitli musteri bulunamadi.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 Dakika gecerli

    resetCodes[email] = { code, expires };

    // Gunluk email limiti kontrolu
    const limitCheck = checkDailyLimit();
    if (!limitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Gunluk email limitine ulasildi. Lutfen yarın tekrar deneyin.', 
        limitReached: true,
        retryAfter: 'Yarin'
      });
    }

    // Eger Resend API key yoksa hata don
    if (!resend) {
      console.error('[MAIL] RESEND_API_KEY bulunamadı. Lütfen .env dosyasını kontrol edin ve PM2\'yi yeniden başlatın: pm2 restart manav-backend');
      return res.status(503).json({ error: 'E-posta servisi şu an kullanılamıyor. Lütfen yöneticinizle iletişime geçin.' });
    }

    try {
      await resend.emails.send({
        from: 'Bostan Manav <onboarding@resend.dev>',
        to: email,
        subject: '🔐 Şifre Sıfırlama Kodunuz',
        text: `Merhaba ${rows[0].ad_soyad},\n\nŞifre sıfırlama kodunuz: ${code}\nBu kod 5 dakika süreyle geçerlidir.\n\nİyi günler dileriz.`,
        html: `
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Şifre Sıfırlama - Bostan Manav</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                    <!-- Logo & Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #00b894 0%, #00d2ab 100%); padding: 40px; text-align: center;">
                        <div style="font-size: 56px; margin-bottom: 12px;">🍉</div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">Bostan Manav</h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Şifre Sıfırlama İşlemi</p>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 32px;">
                        <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                          Merhaba <strong style="color: #00b894;">${rows[0].ad_soyad}</strong>,
                        </p>
                        <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 1.6;">
                          Şifrenizi sıfırlamak için aşağıdaki 6 haneli doğrulama kodunu kullanabilirsiniz:
                        </p>
                        <!-- Code Box -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <div style="background: #f0fdf4; border: 2px dashed #00b894; border-radius: 16px; padding: 28px 36px; display: inline-block;">
                                <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Doğrulama Kodunuz</p>
                                <div style="font-size: 40px; font-weight: 800; color: #00b894; letter-spacing: 10px; text-align: center; font-family: 'Courier New', monospace;">
                                  ${code}
                                </div>
                              </div>
                            </td>
                          </tr>
                        </table>
                        <!-- Timer Warning -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                          <tr>
                            <td align="center">
                              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 20px; display: inline-block;">
                                <span style="color: #92400e; font-size: 14px; font-weight: 600;">
                                  ⏱️ Bu kod <strong>5 dakika</strong> süreyle geçerlidir
                                </span>
                              </div>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: center;">
                          Bu kodu kimseyle paylaşmayın. E-postanızda kodu kopyalayıp şifre sıfırlama ekranına yapıştırabilirsiniz.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background: #f8fafc; padding: 28px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">
                          <strong>Bu talebi siz yapmadınız mı?</strong><br>
                          <span style="color: #94a3b8;">Hesabınızın güvenliği için bizimle iletişime geçin.</span>
                        </p>
                        <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #cbd5e1; font-size: 12px;">
                          © 2024 Bostan Manav
                        </p>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">
                    Bu e-posta otomatik olarak gönderilmiştir.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });
      dailyEmailCount.count++;
      saveEmailCount(dailyEmailCount);
      res.json({ success: true, message: 'Kod e-posta adresinize gonderildi.', remaining: limitCheck.remaining - 1 });
    } catch (error) {
      console.error('Mail gonderme hatasi:', error);
      res.status(500).json({ error: 'E-posta gonderilemedi. Lütfen daha sonra tekrar deneyin.' });
    }
  });
});

app.post('/api/verify-reset-code', (req, res) => {
  const { email, code } = req.body;
  const entry = resetCodes[email];

  if (!entry) return res.status(400).json({ valid: false, error: 'Kod bulunamadi veya suresi dolmus.' });
  if (Date.now() > entry.expires) {
    delete resetCodes[email];
    return res.status(400).json({ valid: false, error: 'Kodun suresi dolmus.' });
  }
  if (entry.code !== code) return res.status(400).json({ valid: false, error: 'Hatali kod.' });

  res.json({ valid: true });
});

app.post('/api/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const entry = resetCodes[email];

  if (!entry || entry.code !== code || Date.now() > entry.expires) {
    return res.status(400).json({ error: 'Gecersiz veya suresi dolmus kod.' });
  }

  db.query('UPDATE musteriler SET sifre = ? WHERE eposta = ?', [newPassword, email], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    delete resetCodes[email];
    res.json({ success: true, message: 'Sifreniz basariyla guncellendi.' });
  });
});

// ==================== VERİ YEDEKLEMe & GERİ YÜKLEME ====================

app.get('/api/backup', (req, res) => {
  const queries = {
    para_birimleri: 'SELECT id, ad, kisa_ad, sembol, kur_tipi, kur, kur_turu FROM para_birimleri WHERE id != 1',
    urunler: 'SELECT id, urun_adi, fiyat, birim_id, gorsel_yolu, stok_durumu, bilgi_guncelleme_tarihi, para_birimi_id FROM urunler',
    kategoriler: 'SELECT * FROM kategoriler',
    birimler: 'SELECT * FROM birimler',
    musteriler: 'SELECT id, ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres FROM musteriler',
    personeller: 'SELECT id, ad_soyad, kullanici_adi, sifre FROM personeller',
    personel_yetkileri: 'SELECT personel_id, sayfa_adi FROM personel_yetkileri',
    urun_kategori_iliskisi: 'SELECT urun_id, kategori_id FROM urun_kategori_iliskisi',
  };
  const result = {};
  const keys = Object.keys(queries);
  let done = 0;
  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      if (err) { result[key] = []; } else { result[key] = rows; }
      done++;
      if (done === keys.length) {
        res.setHeader('Content-Disposition', `attachment; filename="bostan_yedek_${new Date().toISOString().slice(0,10)}.json"`);
        res.json({ version: 2, createdAt: new Date().toISOString(), data: result });
      }
    });
  });
});

// ── SQL Backup ────────────────────────────────────────────────────────────────
app.get('/api/backup-sql', (req, res) => {
  const tableConfigs = {
    para_birimleri:         { sql: 'SELECT id, ad, kisa_ad, sembol, kur_tipi, kur, kur_turu FROM para_birimleri WHERE id != 1',                                                              fields: ['id','ad','kisa_ad','sembol','kur_tipi','kur','kur_turu'] },
    kategoriler:            { sql: 'SELECT id, kategori_adi, ust_kategori_id FROM kategoriler',                                                                                             fields: ['id','kategori_adi','ust_kategori_id'] },
    birimler:               { sql: 'SELECT id, birim_adi FROM birimler',                                                                                                                    fields: ['id','birim_adi'] },
    urunler:                { sql: 'SELECT id, urun_adi, fiyat, birim_id, gorsel_yolu, stok_durumu, bilgi_guncelleme_tarihi, para_birimi_id FROM urunler',                                   fields: ['id','urun_adi','fiyat','birim_id','gorsel_yolu','stok_durumu','bilgi_guncelleme_tarihi','para_birimi_id'] },
    musteriler:             { sql: 'SELECT id, ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres FROM musteriler',                                                             fields: ['id','ad_soyad','vkn_tc','telefon','eposta','sifre','iskonto_orani','adres'] },
    personeller:            { sql: 'SELECT id, ad_soyad, kullanici_adi, sifre FROM personeller WHERE kullanici_adi != "admin"',                                                            fields: ['id','ad_soyad','kullanici_adi','sifre'] },
    personel_yetkileri:     { sql: 'SELECT personel_id, sayfa_adi FROM personel_yetkileri',                                                                                                 fields: ['personel_id','sayfa_adi'] },
    urun_kategori_iliskisi: { sql: 'SELECT urun_id, kategori_id FROM urun_kategori_iliskisi',                                                                                               fields: ['urun_id','kategori_id'] },
    fiyat_gecmisi:           { sql: 'SELECT id, urun_id, eski_fiyat, yeni_fiyat, degisim_tarihi FROM fiyat_gecmisi',                                                                          fields: ['id','urun_id','eski_fiyat','yeni_fiyat','degisim_tarihi'] },
    site_settings:           { sql: 'SELECT `key`, `value` FROM site_settings',                                                                                                              fields: ['key','value'] },
  };

  const escapeSql = (v) => {
    if (v === null || v === undefined) return 'NULL';
    // MySQL2 TIMESTAMP/DATETIME alanlarini Date objesi olarak dondurur — ISO formatina cevir
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return 'NULL';
      return "'" + v.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + "'";
    }
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    return "'" + String(v)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x00/g, '\\0') + "'";
  };

  const results = {};
  const keys = Object.keys(tableConfigs);
  let done = 0;

  keys.forEach(key => {
    db.query(tableConfigs[key].sql, (err, rows) => {
      results[key] = err ? [] : rows;
      done++;
      if (done === keys.length) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        let out = `-- Bostan Manav SQL Yedeği\n`;
        out += `-- Oluşturulma: ${now.toISOString()}\n`;
        out += `-- Sürüm: 3\n`;
        out += `-- Bu dosya otomatik oluşturulmuştur.\n\n`;
        out += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;
        out += `-- Mevcut verileri temizle\n`;
        out += `TRUNCATE TABLE \`urun_kategori_iliskisi\`;\n`;
        out += `TRUNCATE TABLE \`personel_yetkileri\`;\n`;
        out += `TRUNCATE TABLE \`fiyat_gecmisi\`;\n`;
        out += `TRUNCATE TABLE \`site_settings\`;\n`;
        out += `TRUNCATE TABLE \`urunler\`;\n`;
        out += `TRUNCATE TABLE \`kategoriler\`;\n`;
        out += `TRUNCATE TABLE \`birimler\`;\n`;
        out += `TRUNCATE TABLE \`musteriler\`;\n`;
        out += `DELETE FROM \`para_birimleri\` WHERE id != 1;\n`;
        out += `DELETE FROM \`personeller\` WHERE \`kullanici_adi\` != 'admin';\n\n`;

        const insertOrder = ['para_birimleri','kategoriler','birimler','urunler','fiyat_gecmisi','musteriler','personeller','personel_yetkileri','urun_kategori_iliskisi','site_settings'];
        insertOrder.forEach(tbl => {
          const rows = results[tbl] || [];
          const fields = tableConfigs[tbl].fields;
          out += `-- ${tbl}\n`;
          if (rows.length === 0) { out += `-- (boş tablo)\n\n`; return; }
          const fieldList = fields.map(f => `\`${f}\``).join(', ');
          const CHUNK = 100;
          for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const vals = chunk.map(row => `(${fields.map(f => escapeSql(row[f])).join(', ')})`).join(',\n  ');
            out += `INSERT INTO \`${tbl}\` (${fieldList}) VALUES\n  ${vals};\n`;
          }
          out += '\n';
        });

        out += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="bostan_yedek_${dateStr}.sql"`);
        res.send(out);
      }
    });
  });
});

// ── SQL Restore ───────────────────────────────────────────────────────────────
app.post('/api/restore-sql', (req, res) => {
  // express.text() ile body string olarak gelir
  const body = typeof req.body === 'string' ? req.body : '';
  if (!body || !body.includes('-- Bostan Manav SQL Yedeği')) {
    return res.status(400).json({ success: false, error: 'Geçersiz SQL dosyası. Yalnızca bu sistemden alınan .sql yedekleri yüklenebilir.' });
  }

  // Her ; sonrası newline ile ayır; her chunk'tan başındaki yorum satırlarını temizle
  const statements = body
    .split(/;\s*\r?\n/)
    .map(s => {
      // Başındaki -- yorum satırlarını sil, geri kalanı al
      const lines = s.split('\n').filter(line => !line.trim().startsWith('--'));
      return lines.join('\n').trim();
    })
    .filter(s => s.length > 0);

  if (statements.length === 0) {
    return res.status(400).json({ success: false, error: 'SQL dosyasında geçerli komut bulunamadı.' });
  }

  // Foreign key kontrolünü kapat, tüm komutları çalıştır, sonra tekrar aç
  const allStatements = [
    'SET FOREIGN_KEY_CHECKS=0',
    ...statements,
    'SET FOREIGN_KEY_CHECKS=1'
  ];

  let idx = 0;
  let executed = 0;
  const runNext = () => {
    if (idx >= allStatements.length) {
      console.log(`[SQL Restore] Tamamlandı: ${executed}/${allStatements.length} komut çalıştırıldı.`);
      return res.json({ success: true, executed });
    }
    const stmt = allStatements[idx++];
    db.query(stmt, (err) => {
      if (err) {
        const preview = stmt.replace(/\n/g, ' ').slice(0, 150);
        console.error(`SQL restore hatası: ${preview} ${err.message}`);
        const up = stmt.trim().toUpperCase();
        if (up.startsWith('INSERT') || up.startsWith('TRUNCATE') || up.startsWith('DELETE')) {
          // Önce foreign key kontrolünü geri aç
          db.query('SET FOREIGN_KEY_CHECKS=1', () => {});
          return res.status(500).json({
            success: false,
            error: `Komut ${idx}/${allStatements.length} başarısız: ${err.message}`,
            failedStatement: stmt.slice(0, 200)
          });
        }
        // SET, ALTER vb. hataları logla ama devam et
      } else {
        executed++;
      }
      runNext();
    });
  };
  runNext();
});

app.post('/api/restore', (req, res) => {
  const backup = req.body;
  if (!backup || !backup.data) {
    return res.status(400).json({ error: 'Geçersiz yedek dosyası.' });
  }
  const { urunler, kategoriler, birimler, musteriler, personeller, personel_yetkileri } = backup.data;
  const para_birimleri = backup.data.para_birimleri || [];
  // Hem eski (urun_kategoriler) hem yeni (urun_kategori_iliskisi) key adını kabul et
  const urun_kategori_iliskisi = backup.data.urun_kategori_iliskisi || backup.data.urun_kategoriler || [];

  // Admin personeli koru
  const safePersoneller = (personeller || []).filter(p => p.kullanici_adi !== 'admin');

  // ISO tarih string'ini MySQL formatına çevirir: '2026-05-04T14:08:13.000Z' → '2026-05-04 14:08:13'
  const toMysqlDate = (v) => {
    if (!v) return null;
    if (typeof v === 'string' && v.includes('T')) {
      return v.replace('T', ' ').replace(/\.\d+Z$/, '').replace('Z', '');
    }
    return v;
  };

  const insertRows = (table, rows, fields, cb) => {
    if (!rows || rows.length === 0) return cb(null);
    const placeholders = rows.map(() => `(${fields.map(() => '?').join(',')})`).join(',');
    const values = rows.flatMap(r => fields.map(f => {
      const v = r[f] !== undefined ? r[f] : null;
      // sifre NULL olamaz (Excel yedeğinde şifre bulunmaz), boş string kullan
      if (f === 'sifre' && (v === null || v === undefined)) return '';
      return toMysqlDate(v);
    }));
    db.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES ${placeholders}`, values, cb);
  };

  // FK kontrolleri kapat, temizle, yükle, aç
  // Önce mevcut ürün resimlerini sakla — Excel yedeği gorsel_yolu içermez, resimleri koru
  db.query('SELECT id, gorsel_yolu FROM urunler', (imgErr, imgRows) => {
    const existingImages = {};
    if (!imgErr && imgRows) {
      imgRows.forEach(r => { if (r.gorsel_yolu) existingImages[r.id] = r.gorsel_yolu; });
    }
    // Excel restore'da gorsel_yolu null/undefined gelirse mevcut resmi geri koy
    const urunlerMerged = (urunler || []).map(u => (
      (!u.gorsel_yolu && existingImages[u.id]) ? { ...u, gorsel_yolu: existingImages[u.id] } : u
    ));

  db.query('SET FOREIGN_KEY_CHECKS=0', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const deletes = [
      'DELETE FROM urun_kategori_iliskisi',
      'DELETE FROM fiyat_gecmisi',
      'DELETE FROM personel_yetkileri',
      'DELETE FROM urunler',
      'DELETE FROM kategoriler',
      'DELETE FROM birimler',
      'DELETE FROM musteriler',
      'DELETE FROM para_birimleri WHERE id != 1',
      'DELETE FROM personeller WHERE kullanici_adi != "admin"',
    ];
    let di = 0;
    const runDeletes = () => {
      if (di >= deletes.length) return runInserts();
      db.query(deletes[di++], (e) => { if (e) console.warn('Delete uyarı:', e.message); runDeletes(); });
    };
    const runInserts = () => {
      insertRows('para_birimleri', para_birimleri, ['id','ad','kisa_ad','sembol','kur_tipi','kur','kur_turu'], err => {
        if (err) return finish(err);
        insertRows('kategoriler', kategoriler, ['id','kategori_adi','ust_kategori_id'], err => {
          if (err) return finish(err);
          insertRows('birimler', birimler, ['id','birim_adi'], err => {
            if (err) return finish(err);
            insertRows('urunler', urunlerMerged, ['id','urun_adi','fiyat','birim_id','gorsel_yolu','stok_durumu','bilgi_guncelleme_tarihi','para_birimi_id'], err => {
              if (err) return finish(err);
              insertRows('musteriler', musteriler, ['id','ad_soyad','vkn_tc','telefon','eposta','sifre','iskonto_orani','adres'], err => {
                if (err) return finish(err);
                insertRows('personeller', safePersoneller, ['id','ad_soyad','kullanici_adi','sifre'], err => {
                  if (err) return finish(err);
                  insertRows('personel_yetkileri', personel_yetkileri || [], ['personel_id','sayfa_adi'], err => {
                    if (err) return finish(err);
                    insertRows('urun_kategori_iliskisi', urun_kategori_iliskisi || [], ['urun_id','kategori_id'], err => {
                      finish(err);
                    });
                  });
                });
              });
            });
          });
        });
      });
    };
    const finish = (err) => {
      db.query('SET FOREIGN_KEY_CHECKS=1', () => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Veriler başarıyla geri yüklendi.' });
      });
    };
    runDeletes();
  });
  }); // SELECT gorsel_yolu
});

// ==================== PARA BİRİMİ ====================

// Startup migration: para_birimleri tablosu
db.query(`CREATE TABLE IF NOT EXISTS para_birimleri (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ad VARCHAR(100) NOT NULL,
  kisa_ad VARCHAR(20) NOT NULL,
  sembol VARCHAR(10) NOT NULL,
  kur_tipi ENUM('manuel','api') NOT NULL DEFAULT 'manuel',
  kur DECIMAL(15,6) NOT NULL DEFAULT 1.000000,
  son_guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`, (err) => {
  if (err) { console.warn('para_birimleri tablo olusturma hatasi:', err.message); return; }
  // Varsayılan: Türk Lirası
  db.query(`INSERT IGNORE INTO para_birimleri (id, ad, kisa_ad, sembol, kur_tipi, kur) VALUES (1, 'Türk Lirası', 'TRY', '₺', 'manuel', 1.000000)`, (e) => {
    if (!e) console.log('✅ Migration: para_birimleri tablosu ve varsayılan TRY hazır');
    // para_birimi_id kolonu urunler tablosuna ekle
    db.query(`ALTER TABLE urunler ADD COLUMN para_birimi_id INT NULL DEFAULT 1`, (e2) => {
      if (e2 && e2.code !== 'ER_DUP_FIELDNAME') console.warn('Migration uyarisi (urunler.para_birimi_id):', e2.message);
      else if (!e2) console.log('✅ Migration: urunler.para_birimi_id kolonu eklendi');
    });
    // kur_turu kolonu para_birimleri tablosuna ekle
    db.query(`ALTER TABLE para_birimleri ADD COLUMN kur_turu ENUM('doviz_alis','doviz_satis','efektif_alis','efektif_satis') NOT NULL DEFAULT 'doviz_satis'`, (e3) => {
      if (e3 && e3.code !== 'ER_DUP_FIELDNAME') console.warn('Migration uyarisi (para_birimleri.kur_turu):', e3.message);
      else if (!e3) console.log('✅ Migration: para_birimleri.kur_turu kolonu eklendi');
    });
  });
});

// TCMB kur XML'ini çek ve parse et
const https = require('https');
const http = require('http');
function tcmbKurlariCek(callback) {
  const url = 'https://www.tcmb.gov.tr/kurlar/today.xml';
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        // Her Currency blogu için dört kur tipini parse et
        const kurlar = {};
        const blocks = data.matchAll(/<Currency[^>]*CurrencyCode="([^"]+)"[^>]*>([\s\S]*?)<\/Currency>/g);
        const getVal = (block, tag) => {
          const m = block.match(new RegExp(`<${tag}>\\s*([\\d,.]+)\\s*<\\/${tag}>`));
          if (!m) return null;
          const v = parseFloat(m[1].replace(',', '.'));
          return (!isNaN(v) && v > 0) ? v : null;
        };
        for (const m of blocks) {
          const kod = m[1];
          const block = m[2];
          const entry = {
            doviz_alis: getVal(block, 'ForexBuying'),
            doviz_satis: getVal(block, 'ForexSelling'),
            efektif_alis: getVal(block, 'BanknoteBuying'),
            efektif_satis: getVal(block, 'BanknoteSelling')
          };
          if (entry.doviz_satis || entry.efektif_satis) kurlar[kod] = entry;
        }
        callback(null, kurlar);
      } catch (e) {
        callback(e, null);
      }
    });
  }).on('error', (e) => callback(e, null));
}

// GET /api/tcmb-kur — Güncel TCMB kurlarını döndür
app.get('/api/tcmb-kur', (req, res) => {
  tcmbKurlariCek((err, kurlar) => {
    if (err || !kurlar) return res.status(500).json({ error: 'TCMB kurları çekilemedi.' });
    res.json(kurlar);
  });
});

// GET /api/para-birimleri
app.get('/api/para-birimleri', (req, res) => {
  db.query('SELECT * FROM para_birimleri ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/para-birimleri
app.post('/api/para-birimleri', (req, res) => {
  const { ad, kisa_ad, sembol, kur_tipi, kur, kur_turu } = req.body;
  if (!ad || !kisa_ad || !sembol) return res.status(400).json({ error: 'Ad, kısa ad ve sembol zorunludur.' });
  const kurDegeri = parseFloat(kur) || 1;
  const validKurTuru = ['doviz_alis','doviz_satis','efektif_alis','efektif_satis'].includes(kur_turu) ? kur_turu : 'doviz_satis';
  const kisaAdNorm = kisa_ad.trim().toUpperCase();
  // Aynı kisa_ad'dan sadece bir tane olabilir
  db.query('SELECT id FROM para_birimleri WHERE kisa_ad = ?', [kisaAdNorm], (checkErr, checkRows) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (checkRows && checkRows.length > 0) return res.status(400).json({ error: `"${kisaAdNorm}" zaten ekli. Aynı döviz kodu birden fazla eklenemez.` });
    db.query(
      'INSERT INTO para_birimleri (ad, kisa_ad, sembol, kur_tipi, kur, kur_turu) VALUES (?, ?, ?, ?, ?, ?)',
      [ad.trim(), kisaAdNorm, sembol.trim(), kur_tipi || 'manuel', kurDegeri, validKurTuru],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query('SELECT * FROM para_birimleri WHERE id = ?', [result.insertId], (e, rows) => {
          res.json(rows ? rows[0] : { id: result.insertId });
        });
      }
    );
  });
});

// PUT /api/para-birimleri/:id
app.put('/api/para-birimleri/:id', (req, res) => {
  const { ad, kisa_ad, sembol, kur_tipi, kur, kur_turu } = req.body;
  if (!ad || !kisa_ad || !sembol) return res.status(400).json({ error: 'Ad, kısa ad ve sembol zorunludur.' });
  const kurDegeri = parseFloat(kur) || 1;
  const validKurTuru = ['doviz_alis','doviz_satis','efektif_alis','efektif_satis'].includes(kur_turu) ? kur_turu : 'doviz_satis';
  db.query(
    'UPDATE para_birimleri SET ad=?, kisa_ad=?, sembol=?, kur_tipi=?, kur=?, kur_turu=?, son_guncelleme=NOW() WHERE id=?',
    [ad.trim(), kisa_ad.trim().toUpperCase(), sembol.trim(), kur_tipi || 'manuel', kurDegeri, validKurTuru, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query('SELECT * FROM para_birimleri WHERE id = ?', [req.params.id], (e, rows) => {
        res.json(rows ? rows[0] : { success: true });
      });
    }
  );
});

// DELETE /api/para-birimleri/:id
app.delete('/api/para-birimleri/:id', (req, res) => {
  if (req.params.id === '1') return res.status(403).json({ error: 'Varsayılan Türk Lirası silinemez.' });
  // Önce bu para biriminin kurunu al
  db.query('SELECT kur FROM para_birimleri WHERE id = ?', [req.params.id], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ error: 'Para birimi bulunamadı.' });
    const kur = parseFloat(rows[0].kur) || 1;
    // Bu para birimini kullanan ürünlerin fiyatını TL'ye çevir, para_birimi_id'yi 1 yap
    db.query(
      'UPDATE urunler SET fiyat = ROUND(fiyat * ?, 2), para_birimi_id = 1 WHERE para_birimi_id = ?',
      [kur, req.params.id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.query('DELETE FROM para_birimleri WHERE id = ?', [req.params.id], (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ success: true });
        });
      }
    );
  });
});

// PUT /api/para-birimleri/:id/guncelle-api — TCMB'den kur güncelle
app.put('/api/para-birimleri/:id/guncelle-api', (req, res) => {
  db.query('SELECT * FROM para_birimleri WHERE id = ?', [req.params.id], (err, rows) => {
    if (err || !rows.length) return res.status(404).json({ error: 'Para birimi bulunamadı.' });
    const pb = rows[0];
    if (pb.kur_tipi !== 'api') return res.status(400).json({ error: 'Bu para birimi manuel kur kullanıyor.' });
    tcmbKurlariCek((tcmbErr, kurlar) => {
      if (tcmbErr || !kurlar) return res.status(500).json({ error: 'TCMB kurları çekilemedi.' });
      const kurEntry = kurlar[pb.kisa_ad];
      const kurTuru = pb.kur_turu || 'doviz_satis';
      const yeniKur = kurEntry ? kurEntry[kurTuru] : null;
      if (!yeniKur) return res.status(404).json({ error: `${pb.kisa_ad} için TCMB ${kurTuru} kuru bulunamadı.` });
      db.query('UPDATE para_birimleri SET kur=?, son_guncelleme=NOW() WHERE id=?', [yeniKur, req.params.id], (e) => {
        if (e) return res.status(500).json({ error: e.message });
        db.query('SELECT * FROM para_birimleri WHERE id = ?', [req.params.id], (e2, r2) => {
          res.json(r2 ? r2[0] : { success: true });
        });
      });
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu port ${PORT} uzerinde calisiyor...`);
});
