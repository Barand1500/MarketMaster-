// Migration: kullanicilar tablosunu oluşturur
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('✅ Veritabanına bağlandı.');

    // kullanicilar tablosu oluştur
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kullanicilar (
        id INT PRIMARY KEY AUTO_INCREMENT,
        eposta VARCHAR(255) NOT NULL UNIQUE,
        sifre VARCHAR(255) NOT NULL COMMENT 'DÜZ METİN - GÜVENLİK RİSKİ',
        aktif BOOLEAN DEFAULT TRUE,
        ilk_giris_mi BOOLEAN DEFAULT TRUE,
        son_giris_tarihi TIMESTAMP NULL DEFAULT NULL,
        musteri_id INT NULL DEFAULT NULL COMMENT 'Panel müşteri id (opsiyonel)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ kullanicilar tablosu oluşturuldu (veya zaten mevcut).');
    console.log('\n📌 Artık seed-users.js ile varsayılan kullanıcıları ekleyebilirsiniz:');
    console.log('   node seed-users.js\n');

  } catch (err) {
    console.error('❌ Migration hatası:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
