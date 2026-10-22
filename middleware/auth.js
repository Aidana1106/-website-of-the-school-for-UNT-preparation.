/**
 * ENT-Bilim - Authentication Middleware
 * Middleware для проверки авторизации и прав доступа
 * 
 * Этот файл содержит middleware функции для:
 * - Проверки JWT токена
 * - Проверки роли пользователя
 * - Проверки прав админа
 * - Проверки одобрения учителя
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware для проверки JWT токена
 * Извлекает токен из заголовка Authorization: Bearer <token>
 * Проверяет валидность токена и добавляет данные пользователя в req.user
 * 
 * Если токен отсутствует или невалиден, возвращает ошибку 401/403
 * 
 * @param {object} req - Express request объект
 * @param {object} res - Express response объект
 * @param {function} next - Express next функция
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен жоқ' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Жарамсыз токен' });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware для проверки роли пользователя
 * Проверяет, что пользователь имеет одну из указанных ролей
 * 
 * @param {Array<string>} roles - Массив разрешенных ролей (например, ['teacher', 'admin'])
 * @returns {function} Middleware функция
 * 
 * Использование:
 * router.get('/some-route', authenticateToken, requireRole(['teacher', 'admin']), handler)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Авторизация қажет' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    next();
  };
};

/**
 * Middleware для проверки прав админа
 * Проверяет, что пользователь имеет роль 'admin'
 * 
 * @returns {function} Middleware функция
 * 
 * Использование:
 * router.get('/admin-route', authenticateToken, requireAdmin(), handler)
 */
const requireAdmin = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Авторизация қажет' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Тек админ рұқсаты бар' });
    }
    next();
  };
};

/**
 * Middleware для проверки одобрения учителя
 * Проверяет, что учитель одобрен админом (approved = 1)
 * Только одобренные учителя могут создавать видео и задания
 * 
 * Для не-учителей пропускает проверку (проверка роли делается в requireRole)
 * 
 * @param {object} req - Express request объект (должен содержать req.user после authenticateToken)
 * @param {object} res - Express response объект
 * @param {function} next - Express next функция
 * 
 * Использование:
 * router.post('/videos', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, handler)
 */
const requireApprovedTeacher = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Авторизация қажет' });
  }
  
  if (req.user.role !== 'teacher') {
    return next(); // Для не-учителей пропускаем (проверка роли делается в requireRole)
  }
  
  try {
    const db = require('../config/database');
    const result = await db.query(
      'SELECT approved FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    if (!result.rows[0].approved) {
      return res.status(403).json({ 
        error: 'Сіздің тіркелуіңіз әлі бекітілмеді. Админ бекіткеннен кейін контент қоса аласыз.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Одобрение тексеру қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
};

module.exports = { authenticateToken, requireRole, requireAdmin, requireApprovedTeacher };

