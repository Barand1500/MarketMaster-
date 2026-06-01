// Panel API İletişim Servisi
// Güzel Teknoloji paneline paket kontrolü için istek atar

const https = require('https');
const http = require('http');

/**
 * Panel API'sine paket erişim kontrolü yapar
 * @param {string} eposta - Kullanıcı e-posta
 * @returns {Promise<{basarili: boolean, erisim_var: boolean, musteri?: object, kisi?: object}>}
 */
async function paketKontrol(eposta) {
  const apiUrl = process.env.PANEL_API_URL || 'https://panel.guzelteknoloji.com';
  const apiKey = process.env.PANEL_API_KEY;
  const domain = process.env.BOSTAN_DOMAIN || 'bostan.guzelteknoloji.com';
  const urunAdi = process.env.BOSTAN_URUN_ADI || 'Bostan';

  if (!apiKey) {
    console.error('❌ PANEL_API_KEY tanımlı değil!');
    return { basarili: false, erisim_var: false };
  }

  const body = JSON.stringify({
    eposta,
    domain,
    urun_adi: urunAdi
  });

  const url = new URL(apiUrl);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: '/api/erisim/paket-kontrol',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          console.error('Panel API yanıt parse hatası:', e);
          resolve({ basarili: false, erisim_var: false });
        }
      });
    });

    req.on('error', (e) => {
      console.error('Panel API bağlantı hatası:', e.message);
      resolve({ basarili: false, erisim_var: false });
    });

    req.on('timeout', () => {
      console.error('Panel API zaman aşımı');
      req.destroy();
      resolve({ basarili: false, erisim_var: false });
    });

    req.setTimeout(10000); // 10 saniye timeout
    req.write(body);
    req.end();
  });
}

module.exports = { paketKontrol };
