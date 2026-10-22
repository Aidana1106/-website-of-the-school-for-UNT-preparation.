/**
 * ENT-Bilim - Authentication Routes
 * Маршруты для аутентификации и авторизации
 * 
 * Этот файл содержит API endpoints для:
 * - Регистрации пользователей (учеников и учителей)
 * - Входа в систему
 * - Получения профиля пользователя
 * - Входа админа
 * - Одобрения пользователей
 * - Отметки оплаты для учеников
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Регистрация нового пользователя (ученика или учителя)
 * 
 * Принимает:
 * - name: имя пользователя
 * - email: email (должен быть уникальным)
 * - password: пароль
 * - role: роль ('student' или 'teacher')
 * - subjects: массив предметов для учеников (['mathematics', 'informatics'] или один из них)
 * 
 * Для учеников:
 * - Требуется выбрать хотя бы один предмет
 * - approved = 0 (требуется одобрение админа)
 * - paid = 0 (требуется оплата)
 * - subjects сохраняется в формате JSON
 * 
 * Для учителей:
 * - subjects не требуется
 * - approved = 0 (требуется одобрение админа)
 * - paid = 1 (учителя не требуют оплаты)
 * 
 * Возвращает:
 * - message: сообщение об успешной регистрации
 * - requiresApproval: true (пользователь должен ждать одобрения)
 * - user: данные пользователя (без токена, так как не одобрен)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, subjects } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Барлық өрістерді толтырыңыз' });
    }

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Жарамсыз рөл' });
    }

    // Для учеников проверка выбранных предметов
    if (role === 'student') {
      if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: 'Кемінде бір пән таңдаңыз' });
      }
      // Проверка валидности предметов
      const validSubjects = ['mathematics', 'informatics'];
      const invalidSubjects = subjects.filter(s => !validSubjects.includes(s));
      if (invalidSubjects.length > 0) {
        return res.status(400).json({ error: 'Жарамсыз пән таңдалды' });
      }
    } else if (role === 'teacher') {
      // Учителя не должны передавать subjects
      if (subjects !== undefined && subjects !== null) {
        return res.status(400).json({ error: 'Мұғалімдер пәндер таңдамайды' });
      }
    }

    // Email тексеру
    const existingUser = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Бұл email бойынша пайдаланушы бар' });
    }

    // Парольді хэштеу
    const passwordHash = await bcrypt.hash(password, 10);

    // Пайдаланушыны қосу (одобрение требуется для всех кроме админа)
    const approved = role === 'admin' ? 1 : 0;
    const paid = role === 'student' ? 0 : 1; // Учителя не требуют оплаты
    
    // Сохранить subjects в формате JSON
    const subjectsJson = role === 'student' && subjects ? JSON.stringify(subjects) : null;
    
    await db.query(
      'INSERT INTO users (name, email, password_hash, role, approved, paid, subjects) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, approved, paid, subjectsJson]
    );

    // Жаңа қосылған пайдаланушыны алу
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, subjects FROM users WHERE email = ?',
      [email]
    );

    const user = result.rows[0];
    
    // Парсинг subjects из JSON
    let userSubjects = null;
    if (user.subjects) {
      try {
        userSubjects = JSON.parse(user.subjects);
      } catch (e) {
        userSubjects = null;
      }
    }

    // Для новых пользователей не выдаем токен сразу - требуется одобрение
    // Токен не создаем, так как пользователь еще не одобрен
    res.status(201).json({
      message: 'Тіркелу сәтті. Сіздің тіркелуіңіз бекіту күтуде. Админ бекіткеннен кейін кіре аласыз.',
      requiresApproval: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        subjects: userSubjects
      }
    });
  } catch (error) {
    console.error('Тіркелу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

/**
 * POST /api/auth/login
 * Вход в систему для учеников и учителей
 * 
 * Принимает:
 * - email: email пользователя
 * - password: пароль
 * 
 * Проверяет:
 * 1. Существование пользователя
 * 2. Правильность пароля
 * 3. Одобрение пользователя (approved = 1) - кроме админа
 * 4. Для учеников: оплату (paid = 1)
 * 
 * Возвращает:
 * - message: сообщение об успешном входе
 * - token: JWT токен для авторизации
 * - user: данные пользователя (id, name, email, role, avatar_url, subjects)
 * 
 * Если пользователь не одобрен или не оплатил (для учеников), возвращает ошибку 403
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email және парольді енгізіңіз' });
    }

    // Пайдаланушыны табу
    const result = await db.query(
      'SELECT id, name, email, password_hash, role, avatar_url, approved, paid, subjects FROM users WHERE email = ?',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Жарамсыз email немесе пароль' });
    }

    const user = result.rows[0];

    // Парольді тексеру
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Жарамсыз email немесе пароль' });
    }
    
    // Проверка одобрения (кроме админа)
    if (user.role !== 'admin' && !user.approved) {
      return res.status(403).json({ error: 'Сіздің тіркелуіңіз әлі бекітілмеді. Күте тұрыңыз.' });
    }
    
    // Для студентов проверка оплаты
    if (user.role === 'student' && !user.paid) {
      return res.status(403).json({ error: 'Төлем жасалмаған. Төлемді күтіңіз немесе админге хабарласыңыз.' });
    }

    // JWT токен жасау
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Парсинг subjects из JSON
    let userSubjects = null;
    if (user.subjects) {
      try {
        userSubjects = JSON.parse(user.subjects);
      } catch (e) {
        userSubjects = null;
      }
    }

    res.json({
      message: 'Кіру сәтті',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        subjects: userSubjects
      }
    });
  } catch (error) {
    console.error('Кіру қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Профиль алу
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, subjects FROM users WHERE id = ?',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }

    const user = result.rows[0];
    
    console.log('Профиль пользователя из БД (сырые данные):', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subjects_raw: user.subjects,
      subjects_type: typeof user.subjects
    }); // Для отладки
    
    // Парсинг subjects из JSON
    let userSubjects = null;
    if (user.subjects !== null && user.subjects !== undefined && user.subjects !== '') {
      try {
        // Если subjects уже массив (не должно быть, но на всякий случай)
        if (Array.isArray(user.subjects)) {
          userSubjects = user.subjects;
          console.log('Subjects уже массив:', userSubjects);
        } else if (typeof user.subjects === 'string') {
          // Парсим JSON строку
          userSubjects = JSON.parse(user.subjects);
          console.log('Subjects успешно распарсены из JSON:', userSubjects);
        } else {
          console.warn('Subjects неожиданный тип:', typeof user.subjects, user.subjects);
          userSubjects = null;
        }
      } catch (e) {
        console.error('Ошибка парсинга subjects:', e, 'Raw subjects:', user.subjects, 'Тип:', typeof user.subjects);
        userSubjects = null;
      }
    } else {
      console.log('Subjects пустые или null в БД для пользователя ID:', user.id, 'Role:', user.role);
    }
    
    const responseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      subjects: userSubjects
    };
    
    console.log('Профиль пользователя возвращается:', JSON.stringify(responseData, null, 2)); // Для отладки
    
    res.json(responseData);
  } catch (error) {
    console.error('Профиль алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Профильді жаңарту
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar_url } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Жаңарту үшін деректер жоқ' });
    }

    values.push(req.user.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    await db.query(query, values);

    // Жаңартылған пайдаланушыны алу
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Профиль жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Парольді өзгерту
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Ескі және жаңа парольді енгізіңіз' });
    }

    // Ағымдағы парольді тексеру
    const result = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const user = result.rows[0];

    const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Ескі пароль дұрыс емес' });
    }

    // Жаңа парольді хэштеу
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);

    res.json({ message: 'Пароль сәтті өзгертілді' });
  } catch (error) {
    console.error('Пароль өзгерту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Админ кіру (отдельный роут)
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email және парольді енгізіңіз' });
    }

    // Пайдаланушыны табу (только админы)
    const result = await db.query(
      'SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = ? AND role = ?',
      [email, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Жарамсыз email немесе пароль' });
    }

    const user = result.rows[0];

    // Парольді тексеру
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Жарамсыз email немесе пароль' });
    }

    // JWT токен жасау
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Кіру сәтті',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Админ кіру қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

