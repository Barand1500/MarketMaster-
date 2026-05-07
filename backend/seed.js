const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const SALT_ROUNDS = 10;

async function seedAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log('⏳ Varsayilan Admin kullanicisi olusturuluyor...');

    // 1. Admin var mi kontrol et
    // ⬇️ DEĞİŞTİR: Hangi kullanıcı adıyla kontrol yapılacağını belirler
    const [rows] = await connection.execute('SELECT * FROM personeller WHERE kullanici_adi = ?', ['baran']);

    if (rows.length === 0) {
      // 2. Admini ekle
      // ⬇️ DEĞİŞTİR: Ad Soyad, kullanıcı adı ve şifreyi buradan ayarla
      const [result] = await connection.execute(
        'INSERT INTO personeller (ad_soyad, kullanici_adi, sifre) VALUES (?, ?, ?)',
        ['Baran', 'baran', '123'] // ['Ad Soyad', 'kullanici_adi', 'sifre']
      );

      const adminId = result.insertId;
      console.log(`✅ Admin personeli olusturuldu (ID: ${adminId})`);

      // 4. Yetkileri ekle
      const pages = ['products', 'customers', 'users', 'settings'];
      for (const page of pages) {
        await connection.execute(
          'INSERT INTO personel_yetkileri (personel_id, sayfa_adi) VALUES (?, ?)',
          [adminId, page]
        );
      }
      console.log('✅ Admin yetkileri tanimlandi.');
    // site_settings varsayilan degerleri
    // ⬇️ DEĞİŞTİR: Sitenin adını buradan belirle
    await connection.execute(
      `INSERT INTO site_settings (\`key\`, \`value\`) VALUES ('site_adi', 'BOSTAN')
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`
    );
    await connection.execute(
      `INSERT INTO site_settings (\`key\`, \`value\`) VALUES ('logo', '')
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`
    );
    await connection.execute(
      `INSERT INTO site_settings (\`key\`, \`value\`) VALUES ('favicon', '')
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`
    );
    console.log('✅ Site ayarlari varsayilan degerlerle yuklendi.');

    } else {
      console.log('ℹ️ Admin zaten mevcut, yetkiler guncelleniyor...');
      const adminId = rows[0].id;
      const allPages = ['products', 'customers', 'users', 'settings'];
      const [existingPerms] = await connection.execute(
        'SELECT sayfa_adi FROM personel_yetkileri WHERE personel_id = ?',
        [adminId]
      );
      const existing = existingPerms.map(p => p.sayfa_adi);
      for (const page of allPages) {
        if (!existing.includes(page)) {
          await connection.execute(
            'INSERT INTO personel_yetkileri (personel_id, sayfa_adi) VALUES (?, ?)',
            [adminId, page]
          );
          console.log(`✅ Yetki eklendi: ${page}`);
        }
      }
      console.log('✅ Yetkiler guncellendi.');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await connection.end();
  }
}

seedAdmin();
