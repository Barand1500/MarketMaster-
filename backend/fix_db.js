const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function fixDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('🛠️ Veritabani iyilestirmeleri uygulaniyor...');

    // 1. Gorsel yolu boyutunu artir (Base64 icin LONGTEXT)
    console.log('🖼️ Urun gorsel boyutu artiriliyor...');
    await connection.execute('ALTER TABLE urunler MODIFY COLUMN gorsel_yolu LONGTEXT');
    console.log('✅ Urun gorsel boyutu LONGTEXT yapildi.');

    // 2. Varsayilan birimleri kontrol et ve ekle
    console.log('⚖️ Varsayilan birimler (Kg, Adet vb.) kontrol ediliyor...');
    const birimler = ['Kg', 'Adet', 'Demet', 'Kasa', 'Paket'];
    for (const b of birimler) {
      await connection.execute('INSERT IGNORE INTO birimler (birim_adi) VALUES (?)', [b]);
    }
    console.log('✅ Birimler kontrol edildi ve eksikler tamamlandi.');

    // 3. iskonto_orani kolonunu VARCHAR(20) yap (zincirleme "20+20" formatini desteklemek icin)
    console.log('💰 iskonto_orani kolonu VARCHAR(20) yapiliyor...');
    await connection.execute("ALTER TABLE musteriler MODIFY COLUMN iskonto_orani VARCHAR(20) DEFAULT '0'");
    console.log('✅ iskonto_orani kolonu VARCHAR(20) yapildi.');

    console.log('\n✨ Tum duzeltmeler basariyla uygulandi! Artik buyuk resimli urunleri ekleyebilirsiniz.');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await connection.end();
  }
}

fixDatabase();
