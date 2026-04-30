const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function temizle() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('🧹 Veritabani temizleniyor ve ID\'ler sifirlaniyor...');
    
    // Yabanci anahtar kontrollerini gecici olarak kapat (Hata almamak icin)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablolar = [
      'fiyat_gecmisi',
      'siparis_detaylari',
      'siparisler',
      'urun_kategori_iliskisi',
      'urunler',
      'personel_yetkileri',
      'personeller',
      'musteriler',
      'kategoriler',
      'birimler'
    ];

    for (const tablo of tablolar) {
      await connection.query(`TRUNCATE TABLE ${tablo}`);
      console.log(`✅ ${tablo} tablosu temizlendi.`);
    }

    // Kontrolleri geri ac
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✨ Basarili: Tum veriler silindi ve ID\'ler 1\'den baslayacak sekilde sifirlandi!');
    console.log('💡 Not: Admin kullanicisini tekrar olusturmak icin "node seed.js" calistirabilirsiniz.');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await connection.end();
  }
}

temizle();
