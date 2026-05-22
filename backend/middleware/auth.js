const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'sonyalpha_secret_2025';

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};
