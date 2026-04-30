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
  const { kategori_adi } = req.body;
  db.query('UPDATE kategoriler SET kategori_adi = ? WHERE id = ?', [kategori_adi, req.params.id], (err) => {
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
    (SELECT degisim_tarihi FROM fiyat_gecmisi WHERE urun_id = u.id ORDER BY degisim_tarihi DESC LIMIT 1) as son_fiyat_degisimi
    FROM urunler u
    LEFT JOIN birimler b ON u.birim_id = b.id
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
  const { urun_adi, fiyat, birim_id, birim_adi, gorsel_yolu, kategori_ids, stok_durumu } = req.body;
  
  const price = parseFloat(fiyat) || 0;
  const stok = stok_durumu !== undefined ? stok_durumu : true;
  
  const insertProduct = (bId) => {
    db.query('INSERT INTO urunler (urun_adi, fiyat, birim_id, gorsel_yolu, stok_durumu) VALUES (?, ?, ?, ?, ?)',
      [urun_adi, price, bId, gorsel_yolu, stok], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const urunId = result.insertId;
      if (Array.isArray(kategori_ids) && kategori_ids.length > 0) {
        const values = kategori_ids.map(kid => [urunId, kid]);
        db.query('INSERT INTO urun_kategori_iliskisi (urun_id, kategori_id) VALUES ?', [values]);
      }
      res.json({ id: urunId, urun_adi, fiyat: price, birim_id: bId, gorsel_yolu, kategori_ids, stok_durumu: stok });
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
  const { urun_adi, fiyat, birim_id, birim_adi, gorsel_yolu, stok_durumu, kategori_ids } = req.body;
  const price = parseFloat(fiyat) || 0;

  const updateProd = (bId) => {
    // Once mevcut fiyati al, degistiyse gecmise kaydet
    db.query('SELECT fiyat FROM urunler WHERE id = ?', [req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const eskiFiyat = rows.length > 0 ? parseFloat(rows[0].fiyat) : null;

      db.query('UPDATE urunler SET urun_adi = ?, fiyat = ?, birim_id = ?, gorsel_yolu = ?, stok_durumu = ? WHERE id = ?',
        [urun_adi, price, bId, gorsel_yolu, stok_durumu, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Fiyat degistiyse fiyat_gecmisi tablosuna yaz
        if (eskiFiyat !== null && eskiFiyat !== price) {
          db.query('INSERT INTO fiyat_gecmisi (urun_id, eski_fiyat, yeni_fiyat) VALUES (?, ?, ?)',
            [req.params.id, eskiFiyat, price]);
        }
        
        if (Array.isArray(kategori_ids)) {
          db.query('DELETE FROM urun_kategori_iliskisi WHERE urun_id = ?', [req.params.id], () => {
            if (kategori_ids.length > 0) {
              const values = kategori_ids.map(kid => [req.params.id, kid]);
              db.query('INSERT INTO urun_kategori_iliskisi (urun_id, kategori_id) VALUES ?', [values]);
            }
          });
        }
        res.json({ success: true });
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
  db.query('INSERT INTO musteriler (ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani || 0, adres], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, ...req.body });
  });
});

app.put('/api/musteriler/:id', (req, res) => {
  const { ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres } = req.body;
  if (sifre) {
    db.query('UPDATE musteriler SET ad_soyad=?, vkn_tc=?, telefon=?, eposta=?, sifre=?, iskonto_orani=?, adres=? WHERE id=?',
      [ad_soyad, vkn_tc, telefon, eposta, sifre, iskonto_orani, adres, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  } else {
    db.query('UPDATE musteriler SET ad_soyad=?, vkn_tc=?, telefon=?, eposta=?, iskonto_orani=?, adres=? WHERE id=?',
      [ad_soyad, vkn_tc, telefon, eposta, iskonto_orani, adres, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
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
  const { ad_soyad, kullanici_adi, sifre, yetkiler } = req.body;
  const sql = sifre
    ? 'UPDATE personeller SET ad_soyad=?, kullanici_adi=?, sifre=? WHERE id=?'
    : 'UPDATE personeller SET ad_soyad=?, kullanici_adi=? WHERE id=?';
  const params = sifre
    ? [ad_soyad, kullanici_adi, sifre, req.params.id]
    : [ad_soyad, kullanici_adi, req.params.id];
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
    const custSql = 'SELECT * FROM musteriler WHERE (eposta = ? OR telefon = ? OR vkn_tc = ? OR ad_soyad = ?) AND sifre = ?';
    db.query(custSql, [identity, identity, identity, identity, password], (err2, cust) => {
      if (err2 || !cust || cust.length === 0) return res.status(401).json({ error: 'Bilgiler hatali!' });
      return res.json({ user: cust[0], role: 'customer' });
    });
  };

  // Once Personel mi diye bak (kullanici_adi ve sifre ile)
  db.query('SELECT * FROM personeller WHERE kullanici_adi = ? AND sifre = ?', [identity, password], (err, staff) => {
    if (err) return res.status(500).json({ error: err.message });
    if (staff && staff.length > 0) {
      const pId = staff[0].id;
      db.query('SELECT sayfa_adi FROM personel_yetkileri WHERE personel_id = ?', [pId], (err3, perms) => {
        const yetkiler = perms ? perms.map(p => p.sayfa_adi) : [];
        return res.json({ user: { ...staff[0], yetkiler }, role: 'staff' });
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

    // Eger Resend API key yoksa sadece konsola yaz ve basarili don (Test amacli)
    if (!resend) {
      console.log(`[TEST MODE] Reset Code for ${email}: ${code}`);
      return res.json({ success: true, message: 'Kod gonderildi (Test Modu: Konsola bakin)', test: true, code: code, remaining: limitCheck.remaining });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu port ${PORT} uzerinde calisiyor...`);
});
