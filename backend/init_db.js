const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true // SQL dosyasindaki tum komutlari tek seferde calistirmak icin
  });

  try {
    console.log('⏳ Veritabani tablolari olusturuluyor...');
    
    const sqlPath = path.join(__dirname, 'database_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);
    
    console.log('✅ Basarili: Tum tablolar ve iliskiler "manav_db" icinde olusturuldu!');
  } catch (error) {
    console.error('❌ Hata: Tablolar olusturulurken bir sorun yasandi:', error.message);
  } finally {
    await connection.end();
  }
}

initializeDatabase();
