/**
 * ENT-Bilim - Admin API Routes
 * API маршруты для админ панели
 * 
 * Этот файл содержит все API endpoints для админ панели:
 * - Управление пользователями (CRUD операции)
 * - Управление видео-уроками
 * - Управление заданиями
 * - Управление комментариями
 * - Просмотр статистики и прогресса
 * - Одобрение пользователей
 * - Отметка оплаты для учеников
 * - Вход в аккаунт ученика от имени админа
 * 
 * ВСЕ маршруты требуют:
 * 1. Авторизации (authenticateToken)
 * 2. Прав админа (requireAdmin)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Все роуты требуют админ-прав
// Применяется ко всем маршрутам в этом файле
router.use(authenticateToken);  // Проверка JWT токена
router.use(requireAdmin());      // Проверка роли админа

/**
 * GET /api/admin/users
 * Получение списка всех пользователей с фильтрацией
 * 
 * Query параметры:
 * - role: фильтр по роли ('all', 'student', 'teacher')
 * - search: поиск по имени или email
 * - pending: если 'true', показывает только неодобренных пользователей
 * 
 * Для каждого пользователя добавляет статистику:
 * - Для учеников: количество просмотренных/завершенных видео
 * - Для учителей: количество созданных видео и заданий
 * 
 * Возвращает массив пользователей с их статистикой
 */
router.get('/users', async (req, res) => {
  try {
    const { role, search, pending } = req.query;
    
    let query = 'SELECT id, name, email, role, avatar_url, approved, paid, created_at, subjects FROM users WHERE 1=1';
    const params = [];
    
    if (role && role !== 'all') {
      query += ' AND role = ?';
      params.push(role);
    }
    
    if (pending === 'true') {
      query += ' AND approved = 0';
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    
    // Статистика для каждого пользователя
    const usersWithStats = await Promise.all(result.rows.map(async (user) => {
      let stats = {};
      
      if (user.role === 'student') {
        const progressResult = await db.query(
          'SELECT COUNT(*) as total, SUM(completed) as completed FROM progress WHERE student_id = ?',
          [user.id]
        );
        stats = {
          videosWatched: progressResult.rows[0]?.completed || 0,
          videosTotal: progressResult.rows[0]?.total || 0
        };
      } else if (user.role === 'teacher') {
        const videosResult = await db.query(
          'SELECT COUNT(*) as count FROM videos WHERE teacher_id = ?',
          [user.id]
        );
        const assignmentsResult = await db.query(
          'SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ?',
          [user.id]
        );
        stats = {
          videosCreated: videosResult.rows[0]?.count || 0,
          assignmentsCreated: assignmentsResult.rows[0]?.count || 0
        };
      }
      
      return { ...user, stats };
    }));
    
    res.json(usersWithStats);
  } catch (error) {
    console.error('Пайдаланушыларды алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить одного пользователя
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, created_at, subjects FROM users WHERE id = ?',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    const user = result.rows[0];
    
    console.log('Получение пользователя ID:', id, 'Subjects из БД:', user.subjects, 'Тип:', typeof user.subjects); // Для отладки
    
    // Парсинг subjects из JSON
    let userSubjects = null;
    if (user.subjects && user.subjects !== null && user.subjects !== '') {
      try {
        userSubjects = JSON.parse(user.subjects);
        console.log('Subjects успешно распарсены для пользователя:', id, userSubjects); // Для отладки
      } catch (e) {
        console.error('Ошибка парсинга subjects для пользователя', id, ':', e, 'Raw:', user.subjects); // Для отладки
        userSubjects = null;
      }
    } else {
      console.log('Subjects пустые или null для пользователя:', id); // Для отладки
    }
    
    // Детальная статистика
    let stats = {};
    if (user.role === 'student') {
      const progressResult = await db.query(
        'SELECT COUNT(*) as total, SUM(completed) as completed FROM progress WHERE student_id = ?',
        [user.id]
      );
      const submissionsResult = await db.query(
        'SELECT COUNT(*) as count FROM submissions WHERE student_id = ?',
        [user.id]
      );
      stats = {
        videosWatched: progressResult.rows[0]?.completed || 0,
        videosTotal: progressResult.rows[0]?.total || 0,
        submissionsCount: submissionsResult.rows[0]?.count || 0
      };
    } else if (user.role === 'teacher') {
      const videosResult = await db.query(
        'SELECT COUNT(*) as count FROM videos WHERE teacher_id = ?',
        [user.id]
      );
      const assignmentsResult = await db.query(
        'SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ?',
        [user.id]
      );
      stats = {
        videosCreated: videosResult.rows[0]?.count || 0,
        assignmentsCreated: assignmentsResult.rows[0]?.count || 0
      };
    }
    
    const responseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      subjects: userSubjects,
      stats: stats
    };
    
    console.log('Ответ для пользователя ID:', id, 'Subjects:', userSubjects); // Для отладки
    
    res.json(responseData);
  } catch (error) {
    console.error('Пайдаланушыны алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Обновить пользователя
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, subjects } = req.body;
    
    // Проверка, что не изменяем админа
    const userCheck = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    if (userCheck.rows[0].role === 'admin' && role !== 'admin') {
      return res.status(400).json({ error: 'Админ рөлін өзгертуге болмайды' });
    }
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    
    if (email !== undefined) {
      // Проверка уникальности email
      const emailCheck = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Бұл email бойынша пайдаланушы бар' });
      }
      updates.push('email = ?');
      values.push(email);
    }
    
    if (role !== undefined && role !== 'admin') {
      if (!['teacher', 'student'].includes(role)) {
        return res.status(400).json({ error: 'Жарамсыз рөл' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    
    // Упрощенная логика обновления subjects
    // Определяем целевую роль (новая или текущая)
    const targetRole = role !== undefined ? role : userCheck.rows[0].role;
    
    // ВАЖНО: Для студентов subjects должны быть всегда переданы и обновлены
    // Если subjects не переданы, но роль студент - это ошибка
    if (targetRole === 'student') {
      if (subjects === undefined) {
        console.error('ОШИБКА: subjects не переданы для студента ID:', id);
        return res.status(400).json({ error: 'Пәндер міндетті студенттер үшін' });
      }
      console.log('Обновление subjects для студента ID:', id, 'Subjects:', subjects);
      if (!Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: 'Кемінде бір пән таңдаңыз' });
      }
      const validSubjects = ['mathematics', 'informatics'];
      const invalidSubjects = subjects.filter(s => !validSubjects.includes(s));
      if (invalidSubjects.length > 0) {
        return res.status(400).json({ error: 'Жарамсыз пән таңдалды' });
      }
      const subjectsJson = JSON.stringify(subjects);
      console.log('Subjects JSON для сохранения:', subjectsJson);
      updates.push('subjects = ?');
      values.push(subjectsJson);
    } else if (subjects !== undefined) {
      // Для учителей и других ролей: subjects должны быть null
      console.log('Очистка subjects для не-студента ID:', id);
      updates.push('subjects = ?');
      values.push(null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Жаңарту үшін деректер жоқ' });
    }
    
    // Логируем что будем обновлять
    console.log('=== ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ===');
    console.log('User ID:', id);
    console.log('Updates:', updates);
    console.log('Values:', values);
    console.log('SQL:', `UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    
    values.push(id);
    const updateResult = await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    console.log('Update result:', updateResult);
    
    // Проверяем, что subjects действительно сохранились в БД
    const checkResult = await db.query(
      'SELECT subjects FROM users WHERE id = ?',
      [id]
    );
    console.log('Проверка сохранения subjects в БД для пользователя ID:', id);
    console.log('Subjects в БД после обновления:', checkResult.rows[0]?.subjects, 'Тип:', typeof checkResult.rows[0]?.subjects);
    
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, created_at, subjects FROM users WHERE id = ?',
      [id]
    );
    
    const user = result.rows[0];
    
    // Парсинг subjects из JSON
    let userSubjects = null;
    if (user.subjects !== null && user.subjects !== undefined && user.subjects !== '') {
      try {
        if (Array.isArray(user.subjects)) {
          userSubjects = user.subjects;
        } else if (typeof user.subjects === 'string') {
          userSubjects = JSON.parse(user.subjects);
        }
        console.log('Subjects распарсены для ответа:', userSubjects);
      } catch (e) {
        console.error('Ошибка парсинга subjects при ответе:', e, 'Raw:', user.subjects);
        userSubjects = null;
      }
    } else {
      console.warn('Subjects пустые в БД для пользователя ID:', id);
    }
    
    const responseData = { ...user, subjects: userSubjects };
    console.log('Ответ сервера с subjects:', responseData.subjects);
    
    res.json(responseData);
  } catch (error) {
    console.error('Пайдаланушыны жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Удалить пользователя
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка, что не удаляем админа
    const userCheck = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    if (userCheck.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Админды жоюға болмайды' });
    }
    
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'Пайдаланушы сәтті жойылды' });
  } catch (error) {
    console.error('Пайдаланушыны жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Сбросить пароль пользователя
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль кемінде 6 таңбадан тұруы керек' });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    
    res.json({ message: 'Пароль сәтті өзгертілді' });
  } catch (error) {
    console.error('Парольді қалпына келтіру қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Одобрить пользователя (четко разделяем одобрение и оплату)
router.post('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid } = req.body; // Опционально: для студентов можно сразу отметить оплату
    
    // Получить информацию о пользователе
    const userCheck = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    const userRole = userCheck.rows[0].role;
    
    // Одобряем пользователя
    await db.query('UPDATE users SET approved = 1 WHERE id = ?', [id]);
    
    // Для студентов можно сразу отметить оплату при одобрении
    if (userRole === 'student' && paid !== undefined) {
      await db.query('UPDATE users SET paid = ? WHERE id = ?', [paid ? 1 : 0, id]);
    }
    
    res.json({ 
      message: 'Пайдаланушы бекітілді',
      approved: true,
      paid: userRole === 'student' && paid !== undefined ? (paid ? 1 : 0) : null
    });
  } catch (error) {
    console.error('Бекіту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Отметить оплату студента
router.post('/users/:id/mark-paid', async (req, res) => {
  try {
    await db.query('UPDATE users SET paid = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Төлем белгіленді' });
  } catch (error) {
    console.error('Төлем белгілеу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Войти в аккаунт ученика (только для админа)
router.post('/users/:id/login-as', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получить данные пользователя
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, approved, paid FROM users WHERE id = ?',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    const user = result.rows[0];
    
    // Проверка, что это ученик
    if (user.role !== 'student') {
      return res.status(400).json({ error: 'Тек оқушылардың аккаунтына кіруге болады' });
    }
    
    // Генерировать JWT токен для ученика
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, adminImpersonation: true },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' } // Токен на 24 часа для безопасности
    );
    
    res.json({
      message: 'Оқушы аккаунтына кіру сәтті',
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
    console.error('Оқушы аккаунтына кіру қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Создать пользователя (админ)
router.post('/users', async (req, res) => {
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
    
    const existingUser = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Бұл email бойынша пайдаланушы бар' });
    }
    
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Сохранить subjects в формате JSON (только для студентов)
    const subjectsJson = role === 'student' && subjects ? JSON.stringify(subjects) : null;
    
    // Админ создает пользователей сразу одобренными
    await db.query(
      'INSERT INTO users (name, email, password_hash, role, approved, paid, subjects) VALUES (?, ?, ?, ?, 1, ?, ?)',
      [name, email, passwordHash, role, role === 'student' ? 0 : 1, subjectsJson]
    );
    
    const result = await db.query(
      'SELECT id, name, email, role, avatar_url, approved, paid, created_at, subjects FROM users WHERE email = ?',
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
    
    res.status(201).json({ ...user, subjects: userSubjects });
  } catch (error) {
    console.error('Пайдаланушы қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Общая статистика
router.get('/stats', async (req, res) => {
  try {
    const [studentsResult, teachersResult, videosResult, assignmentsResult, commentsResult, progressResult, pendingResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ? AND approved = 1', ['student']),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ? AND approved = 1', ['teacher']),
      db.query('SELECT COUNT(*) as count FROM videos'),
      db.query('SELECT COUNT(*) as count FROM assignments'),
      db.query('SELECT COUNT(*) as count FROM comments'),
      db.query('SELECT COUNT(*) as count FROM progress WHERE completed = 1'),
      db.query('SELECT COUNT(*) as count FROM users WHERE approved = 0')
    ]);
    
    res.json({
      students: studentsResult.rows[0]?.count || 0,
      teachers: teachersResult.rows[0]?.count || 0,
      videos: videosResult.rows[0]?.count || 0,
      assignments: assignmentsResult.rows[0]?.count || 0,
      comments: commentsResult.rows[0]?.count || 0,
      completedVideos: progressResult.rows[0]?.count || 0,
      pendingApprovals: pendingResult.rows[0]?.count || 0
    });
  } catch (error) {
    console.error('Статистика алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ========== ВИДЕО УПРАВЛЕНИЕ ==========

// Получить все видео
router.get('/videos', async (req, res) => {
  try {
    const { subject, search } = req.query;
    let query = `SELECT v.*, u.name as teacher_name 
                 FROM videos v 
                 JOIN users u ON v.teacher_id = u.id 
                 WHERE 1=1`;
    const params = [];
    
    if (subject && subject !== 'all') {
      query += ' AND v.subject = ?';
      params.push(subject);
    }
    
    if (search) {
      query += ' AND (v.title LIKE ? OR v.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY v.created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Видеоларды алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Создать видео (админ может создавать от имени любого учителя)
router.post('/videos', async (req, res) => {
  try {
    const { title, description, youtube_url, subject, teacher_id } = req.body;
    
    if (!title || !youtube_url || !subject) {
      return res.status(400).json({ error: 'Атауы, YouTube URL және пән міндетті' });
    }
    
    if (!['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }
    
    const teacherId = teacher_id || req.user.id;
    
    const insertResult = await db.query(
      'INSERT INTO videos (title, description, youtube_url, teacher_id, subject) VALUES (?, ?, ?, ?, ?)',
      [title, description || '', youtube_url, teacherId, subject]
    );
    
    const result = await db.query(
      `SELECT v.*, u.name as teacher_name 
       FROM videos v 
       JOIN users u ON v.teacher_id = u.id 
       WHERE v.id = ?`,
      [insertResult.lastID]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Видео қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Обновить видео
router.put('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, youtube_url, subject, teacher_id } = req.body;
    
    if (subject && !['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (youtube_url !== undefined) {
      updates.push('youtube_url = ?');
      values.push(youtube_url);
    }
    if (subject !== undefined) {
      updates.push('subject = ?');
      values.push(subject);
    }
    if (teacher_id !== undefined) {
      updates.push('teacher_id = ?');
      values.push(teacher_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Жаңарту үшін деректер жоқ' });
    }
    
    values.push(id);
    await db.query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const result = await db.query(
      `SELECT v.*, u.name as teacher_name 
       FROM videos v 
       JOIN users u ON v.teacher_id = u.id 
       WHERE v.id = ?`,
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Видео жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Удалить видео
router.delete('/videos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM videos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Видео сәтті жойылды' });
  } catch (error) {
    console.error('Видео жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ========== ЗАДАНИЯ УПРАВЛЕНИЕ ==========

// Получить все задания
router.get('/assignments', async (req, res) => {
  try {
    const { subject, search } = req.query;
    let query = `SELECT a.*, u.name as teacher_name 
                 FROM assignments a 
                 JOIN users u ON a.teacher_id = u.id 
                 WHERE 1=1`;
    const params = [];
    
    if (subject && subject !== 'all') {
      query += ' AND a.subject = ?';
      params.push(subject);
    }
    
    if (search) {
      query += ' AND (a.title LIKE ? OR a.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Тапсырмаларды алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Создать задание
router.post('/assignments', async (req, res) => {
  try {
    const { title, description, file_url, deadline, subject, teacher_id, video_id } = req.body;
    
    if (!title || !subject) {
      return res.status(400).json({ error: 'Атауы және пән міндетті' });
    }
    
    if (!['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }
    
    const teacherId = teacher_id || req.user.id;
    
    const insertResult = await db.query(
      'INSERT INTO assignments (title, description, file_url, teacher_id, deadline, subject, video_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', file_url || null, teacherId, deadline || null, subject, video_id || null]
    );
    
    const result = await db.query(
      `SELECT a.*, u.name as teacher_name 
       FROM assignments a 
       JOIN users u ON a.teacher_id = u.id 
       WHERE a.id = ?`,
      [insertResult.lastID]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Тапсырма қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Обновить задание
router.put('/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, file_url, deadline, subject, teacher_id, video_id } = req.body;
    
    if (subject && !['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (file_url !== undefined) {
      updates.push('file_url = ?');
      values.push(file_url);
    }
    if (deadline !== undefined) {
      updates.push('deadline = ?');
      values.push(deadline);
    }
    if (subject !== undefined) {
      updates.push('subject = ?');
      values.push(subject);
    }
    if (teacher_id !== undefined) {
      updates.push('teacher_id = ?');
      values.push(teacher_id);
    }
    if (video_id !== undefined) {
      updates.push('video_id = ?');
      values.push(video_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Жаңарту үшін деректер жоқ' });
    }
    
    values.push(id);
    await db.query(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const result = await db.query(
      `SELECT a.*, u.name as teacher_name 
       FROM assignments a 
       JOIN users u ON a.teacher_id = u.id 
       WHERE a.id = ?`,
      [id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Тапсырма жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Удалить задание
router.delete('/assignments/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Тапсырма сәтті жойылды' });
  } catch (error) {
    console.error('Тапсырма жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ========== КОММЕНТАРИИ УПРАВЛЕНИЕ ==========

// Получить все комментарии
router.get('/comments', async (req, res) => {
  try {
    const { video_id } = req.query;
    let query = `SELECT c.*, u.name as user_name, u.role as user_role, u.avatar_url, v.title as video_title
                 FROM comments c 
                 JOIN users u ON c.user_id = u.id 
                 JOIN videos v ON c.video_id = v.id 
                 WHERE 1=1`;
    const params = [];
    
    if (video_id) {
      query += ' AND c.video_id = ?';
      params.push(video_id);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Комментарийлерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Удалить комментарий
router.delete('/comments/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Комментарий сәтті жойылды' });
  } catch (error) {
    console.error('Комментарий жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ========== ПРОГРЕСС ==========

// Получить весь прогресс
router.get('/progress', async (req, res) => {
  try {
    const { student_id, video_id } = req.query;
    let query = `SELECT p.*, u.name as student_name, v.title as video_title, v.subject
                 FROM progress p 
                 JOIN users u ON p.student_id = u.id 
                 JOIN videos v ON p.video_id = v.id 
                 WHERE 1=1`;
    const params = [];
    
    if (student_id) {
      query += ' AND p.student_id = ?';
      params.push(student_id);
    }
    
    if (video_id) {
      query += ' AND p.video_id = ?';
      params.push(video_id);
    }
    
    query += ' ORDER BY p.updated_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Прогресс алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить список учителей для выбора
router.get('/teachers', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email FROM users WHERE role = ? AND approved = 1 ORDER BY name',
      ['teacher']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Мұғалімдерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить задания для видео
router.get('/videos/:id/assignments', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as teacher_name 
       FROM assignments a 
       JOIN users u ON a.teacher_id = u.id 
       WHERE a.video_id = ? 
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Тапсырмаларды алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить прогресс и задания студента
router.get('/students/:id/details', async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Прогресс по видео
    const progressResult = await db.query(
      `SELECT p.*, v.title as video_title, v.subject, u.name as teacher_name
       FROM progress p
       JOIN videos v ON p.video_id = v.id
       JOIN users u ON v.teacher_id = u.id
       WHERE p.student_id = ?
       ORDER BY p.updated_at DESC`,
      [studentId]
    );
    
    // Выполненные задания
    const submissionsResult = await db.query(
      `SELECT s.*, a.title as assignment_title, a.subject, u.name as teacher_name
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN users u ON a.teacher_id = u.id
       WHERE s.student_id = ?
       ORDER BY s.created_at DESC`,
      [studentId]
    );
    
    // Статистика
    const statsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT p.video_id) as videos_watched,
        SUM(p.completed) as videos_completed,
        COUNT(DISTINCT s.assignment_id) as assignments_submitted,
        AVG(s.grade) as average_grade
       FROM progress p
       LEFT JOIN submissions s ON s.student_id = p.student_id
       WHERE p.student_id = ?`,
      [studentId]
    );
    
    res.json({
      progress: progressResult.rows,
      submissions: submissionsResult.rows,
      stats: statsResult.rows[0] || {}
    });
  } catch (error) {
    console.error('Студент деректерін алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить все заявки на одобрение
router.get('/pending', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, paid, created_at FROM users WHERE approved = 0 ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Күтудегілерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

