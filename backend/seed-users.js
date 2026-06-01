// Kullanıcı Seed Script
// İlk kullanıcıları oluşturur (varsayılan şifre: admin123)

const mysql = require('mysql2/promise');
require('dotenv').config();

const defaultUsers = [
  { eposta: 'test@guzelteknoloji.com', sifre: 'admin123' },
  { eposta: 'demo@bostan.com', sifre: 'admin123' },
  // Buraya daha fazla kullanıcı eklenebilir
];

async function seedUsers() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('✅ Veritabanına bağlandı.');

    for (const user of defaultUsers) {
      try {
        const [existing] = await connection.query(
          'SELECT id FROM kullanicilar WHERE eposta = ?',
          [user.eposta]
        );

        if (existing.length > 0) {
          console.log(`⚠️  ${user.eposta} zaten mevcut, atlanıyor.`);
          continue;
        }

        await connection.query(
          'INSERT INTO kullanicilar (eposta, sifre, aktif, ilk_giris_mi) VALUES (?, ?, TRUE, TRUE)',
          [user.eposta, user.sifre]
        );

        console.log(`✅ ${user.eposta} oluşturuldu (şifre: ${user.sifre})`);
      } catch (err) {
        console.error(`❌ ${user.eposta} oluşturulamadı:`, err.message);
      }
    }

    console.log('\n✅ Kullanıcı seed tamamlandı!');

  } catch (err) {
    console.error('❌ Seed hatası:', err);
  } finally {
    if (connection) await connection.end();
  }
}

seedUsers();
