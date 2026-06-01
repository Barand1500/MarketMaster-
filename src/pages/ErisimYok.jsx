import '../styles/ErisimYok.css';

export default function ErisimYok() {
  const handleWhatsApp = () => {
    // Güzel Teknoloji WhatsApp destek hattı (örnek)
    const phone = '905XXXXXXXXX'; // Gerçek numara girilecek
    const message = encodeURIComponent('Merhaba, Bostan için paket almak istiyorum.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="erisim-yok-container">
      <div className="erisim-yok-box">
        <div className="icon-wrapper">
          <span className="lock-icon">🔒</span>
        </div>

        <h1>Erişim Yok</h1>
        
        <p className="main-message">
          Bu hesap için aktif bir <strong>Bostan</strong> paketi bulunamadı.
        </p>

        <div className="info-box">
          <p>
            <strong>bostan.guzelteknoloji.com</strong> domaininde aktif bir paket 
            aboneliğiniz bulunmuyor.
          </p>
        </div>

        <div className="action-buttons">
          <button 
            className="whatsapp-button"
            onClick={handleWhatsApp}
          >
            <span className="whatsapp-icon">💬</span>
            WhatsApp ile İletişime Geç
          </button>

          <button 
            className="paket-button"
            onClick={() => window.location.href = 'https://panel.guzelteknoloji.com'}
          >
            Paket Satın Al
          </button>
        </div>

        <div className="footer-info">
          <p>
            Sorun olduğunu düşünüyorsanız, lütfen <strong>Güzel Teknoloji</strong> 
            destek ekibiyle iletişime geçin.
          </p>
        </div>

        <button 
          className="back-button"
          onClick={() => window.location.href = '/'}
        >
          ← Giriş Sayfasına Dön
        </button>
      </div>
    </div>
  );
}
