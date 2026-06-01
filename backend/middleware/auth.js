// JWT Authentication Middleware
const jwt = require('jsonwebtoken');

/**
 * Cookie'den JWT token'ı okur ve doğrular
 * Token geçerliyse req.user'a kullanıcı bilgisini ekler
 */
function authMiddleware(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Oturum bulunamadı. Lütfen giriş yapın.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, eposta, iat, exp }
    next();
  } catch (err) {
    console.error('JWT doğrulama hatası:', err.message);
    return res.status(401).json({ error: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' });
  }
}

module.exports = authMiddleware;
