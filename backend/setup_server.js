const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("------------------------------------------------");
echo "🌐 BostanHub Sunucu Yapilandirma Sihirbazi";
console.log("------------------------------------------------\n");

const config = {};

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function startSetup() {
  console.log("💡 Bulut (Cloud) veritabani bilgilerinizi giriniz:\n");

  config.DB_HOST = await askQuestion("Veritabani Host (Varsayilan: localhost): ") || "localhost";
  config.DB_USER = await askQuestion("Veritabani Kullanici Adi: ");
  config.DB_PASS = await askQuestion("Veritabani Sifresi: ");
  config.DB_NAME = await askQuestion("Veritabani Ismi: ");
  config.PORT = await askQuestion("Backend Port (Varsayilan: 5000): ") || "5000";

  const envContent = `PORT=${config.PORT}
DB_HOST=${config.DB_HOST}
DB_USER=${config.DB_USER}
DB_PASS=${config.DB_PASS}
DB_NAME=${config.DB_NAME}
`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log("\n✅ .env dosyasi basariyla olusturuldu ve sunucuya uyarlandi!");
    console.log("🚀 Simdi 'npm start' yazarak sunucuyu baslatabilirsiniz.\n");
  } catch (err) {
    console.error("\n❌ Hata: .env dosyasi yazilamadi:", err.message);
  }

  rl.close();
}

startSetup();
