const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Veritabanina baglanildi:', process.env.DB_NAME);
    console.log('⏳ Tablolar olusturuluyor...');

    const sqlPath = path.join(__dirname, 'database_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await connection.query(sql);

    console.log('✅ Tum tablolar basariyla olusturuldu!');
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initializeDatabase();
