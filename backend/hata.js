/**
 * iskonto_orani field'larını VARCHAR'a çevirme scripti
 * Bu script ile '20+20' veya '20+20+20' gibi ifadeler yazılabilir hale gelir
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixIskontoOrani() {
  let connection;
  
  try {
    // .env dosyasından değerleri al
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'manav_db'
    };

    // Veritabanı bilgilerini göster (şifre hariç)
    console.log('📋 Veritabanı Bağlantı Bilgileri:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Password: ${dbConfig.password ? '****' + dbConfig.password.slice(-2) : '(BOŞ - .env dosyasını kontrol edin!)'}`);
    
    if (!dbConfig.password) {
      console.error('\n❌ HATA: Veritabanı şifresi bulunamadı!');
      console.error('   .env dosyasında DB_PASSWORD değerini kontrol edin.');
      console.error('   Örnek: DB_PASSWORD=your_password_here');
      process.exit(1);
    }

    console.log('\n🔌 Veritabanına bağlanılıyor...');

    // Veritabanı bağlantısı
    connection = await mysql.createConnection(dbConfig);

    console.log('✅ Veritabanına bağlanıldı');

    // Değiştirilecek tablolar
    const tables = ['kategoriler', 'markalar', 'musteriler'];

    for (const table of tables) {
      console.log(`\n📋 ${table} tablosu güncelleniyor...`);

      // 1. Tablo yapısını kontrol et
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'iskonto_orani'`
      );

      if (columns.length === 0) {
        console.log(`  ℹ️  ${table} tablosunda iskonto_orani kolonu yok, ekleniyor...`);
        await connection.query(
          `ALTER TABLE ${table} ADD COLUMN iskonto_orani VARCHAR(50) DEFAULT NULL`
        );
        console.log(`  ✅ iskonto_orani kolonu eklendi`);
        continue;
      }

      const column = columns[0];
      const currentType = column.Type;

      // 2. Eğer zaten VARCHAR ise mevcut değerleri temizle
      if (currentType.toLowerCase().includes('varchar') || currentType.toLowerCase().includes('char')) {
        console.log(`  ✅ ${table}.iskonto_orani zaten VARCHAR tipinde (${currentType})`);
        
        // Mevcut değerleri kontrol et ve temizle (20.00 → 20)
        const [rows] = await connection.query(
          `SELECT id, iskonto_orani FROM ${table} WHERE iskonto_orani IS NOT NULL`
        );

        if (rows.length > 0) {
          console.log(`  🔍 ${rows.length} kayıt kontrol ediliyor...`);
          let temizlenenSayisi = 0;
          
          for (const row of rows) {
            const oranStr = String(row.iskonto_orani);
            // Eğer decimal formatında ise (örn: "20.00"), temizle
            if (oranStr.includes('.')) {
              const cleanValue = parseFloat(oranStr).toString();
              await connection.query(
                `UPDATE ${table} SET iskonto_orani = ? WHERE id = ?`,
                [cleanValue, row.id]
              );
              console.log(`     "${oranStr}" → "${cleanValue}" (ID: ${row.id})`);
              temizlenenSayisi++;
            }
          }
          
          if (temizlenenSayisi > 0) {
            console.log(`  ✅ ${temizlenenSayisi} değer temizlendi`);
          } else {
            console.log(`  ✅ Tüm değerler zaten temiz`);
          }
        } else {
          console.log(`  ℹ️  ${table} tablosunda iskonto_orani değeri yok`);
        }
        
        continue;
      }

      // 3. DECIMAL ise VARCHAR'a çevir
      if (currentType.toLowerCase().includes('decimal') || currentType.toLowerCase().includes('numeric')) {
        console.log(`  ⚠️  ${table}.iskonto_orani şu an ${currentType} tipinde`);
        console.log(`  🔄 VARCHAR(50)'ye çeviriliyor...`);

        // Mevcut değerleri al ve NULL olmayanları string'e çevir
        const [rows] = await connection.query(
          `SELECT id, iskonto_orani FROM ${table} WHERE iskonto_orani IS NOT NULL`
        );

        console.log(`  📊 ${rows.length} kayıtta iskonto_orani değeri var`);

        // Önce kolonu VARCHAR'a çevir
        await connection.query(
          `ALTER TABLE ${table} MODIFY COLUMN iskonto_orani VARCHAR(50) DEFAULT NULL`
        );

        console.log(`  ✅ ${table}.iskonto_orani VARCHAR(50) olarak güncellendi`);

        // Değerleri temizle (örn: 20.00 → '20')
        for (const row of rows) {
          const oranStr = String(row.iskonto_orani);
          // Eğer decimal ise (örn: 20.00), integer kısmını al
          const cleanValue = oranStr.includes('.') ? parseFloat(oranStr).toString() : oranStr;
          
          await connection.query(
            `UPDATE ${table} SET iskonto_orani = ? WHERE id = ?`,
            [cleanValue, row.id]
          );
        }

        console.log(`  ✅ Mevcut değerler temizlendi`);
      }
    }

    console.log('\n✅ Tüm güncellemeler tamamlandı!');
    console.log('📝 Artık iskonto_orani field\'larına şu şekilde değer girebilirsiniz:');
    console.log('   • Tek değer: "20"');
    console.log('   • Toplam: "20+20" veya "20+20+20"');
    console.log('   • Herhangi bir string ifade');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Veritabanı bağlantısı kapatıldı');
    }
  }
}

// Scripti çalıştır
fixIskontoOrani();
