// Authentication Routes
const express = require('express');
const jwt = require('jsonwebtoken');
const { paketKontrol } = require('../services/panelService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Kullanıcı girişi: e-posta + şifre kontrolü + panel paket kontrolü
 */
router.post('/login', async (req, res) => {
  const { eposta, sifre } = req.body;

  if (!eposta || !sifre) {
    return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
  }

  const db = req.app.locals.db;

  try {
    // 1. Kullanıcıyı veritabanından bul
    const [rows] = await db.query(
      'SELECT * FROM kullanicilar WHERE eposta = ? AND aktif = TRUE',
      [eposta]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const kullanici = rows[0];

    // 2. Şifre kontrolü (DÜZ METİN - GÜVENLİK RİSKİ)
    if (kullanici.sifre !== sifre) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    // 3. Panel API'sine paket kontrolü
    const paketSonuc = await paketKontrol(eposta);

    if (!paketSonuc.basarili) {
      console.error('Panel API hatası:', paketSonuc);
      return res.status(500).json({ 
        error: 'Erişim kontrolü yapılamadı. Lütfen daha sonra tekrar deneyin.' 
      });
    }

    if (!paketSonuc.erisim_var) {
      return res.status(403).json({ 
        error: 'Bu hesap için aktif paket bulunamadı.',
        erisim_yok: true 
      });
    }

    // 4. JWT oluştur (7 gün geçerli)
    const token = jwt.sign(
      { id: kullanici.id, eposta: kullanici.eposta },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. httpOnly cookie olarak gönder
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // production'da HTTPS zorunlu
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
    });

    // 6. Son giriş tarihini güncelle
    await db.query(
      'UPDATE kullanicilar SET son_giris_tarihi = NOW(), ilk_giris_mi = FALSE WHERE id = ?',
      [kullanici.id]
    );

    // 7. Başarılı giriş
    res.json({ 
      success: true, 
      kullanici: {
        id: kullanici.id,
        eposta: kullanici.eposta,
        ilk_giris_mi: kullanici.ilk_giris_mi
      }
    });

  } catch (err) {
    console.error('Login hatası:', err);
    res.status(500).json({ error: 'Giriş yapılırken bir hata oluştu.' });
  }
});

/**
 * POST /api/auth/logout
 * Çıkış yapar (cookie'yi temizler)
 */
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ success: true, message: 'Çıkış başarılı.' });
});

/**
 * GET /api/auth/me
 * Oturum bilgisini döndürür (protected)
 */
router.get('/me', authMiddleware, async (req, res) => {
  const db = req.app.locals.db;
  
  try {
    const [rows] = await db.query(
      'SELECT id, eposta, aktif, ilk_giris_mi, son_giris_tarihi FROM kullanicilar WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({ kullanici: rows[0] });
  } catch (err) {
    console.error('Me endpoint hatası:', err);
    res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı.' });
  }
});

module.exports = router;
