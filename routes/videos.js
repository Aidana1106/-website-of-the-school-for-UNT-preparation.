const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole, requireApprovedTeacher } = require('../middleware/auth');

const router = express.Router();

// Барлық видеоларды алу (пән бойынша фильтрлеу)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { subject } = req.query;
    
    // Получить информацию о пользователе и его subjects
    const userResult = await db.query(
      'SELECT role, subjects FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    const user = userResult.rows[0];
    let userSubjects = null;
    
    // Парсинг subjects для студентов
    if (user.role === 'student' && user.subjects) {
      try {
        userSubjects = typeof user.subjects === 'string' 
          ? JSON.parse(user.subjects) 
          : user.subjects;
        if (!Array.isArray(userSubjects)) {
          userSubjects = null;
        }
      } catch (e) {
        console.error('Ошибка парсинга subjects:', e);
        userSubjects = null;
      }
    }
    
    let query = `SELECT v.*, u.name as teacher_name 
       FROM videos v 
       JOIN users u ON v.teacher_id = u.id`;
    const params = [];
    const conditions = [];
    
    // Для студентов: фильтровать по их subjects
    if (user.role === 'student' && userSubjects && userSubjects.length > 0) {
      const placeholders = userSubjects.map(() => '?').join(',');
      conditions.push(`v.subject IN (${placeholders})`);
      params.push(...userSubjects);
    }
    
    // Дополнительная фильтрация по query параметру subject (для учителей и админов)
    if (subject && ['informatics', 'mathematics'].includes(subject)) {
      if (user.role === 'student' && userSubjects && userSubjects.length > 0) {
        // Для студентов проверяем, что запрашиваемый subject есть в их subjects
        if (userSubjects.includes(subject)) {
          conditions.push('v.subject = ?');
          params.push(subject);
        } else {
          // Если студент запрашивает subject, которого у него нет, возвращаем пустой массив
          return res.json([]);
        }
      } else {
        // Для учителей и админов просто добавляем фильтр
        conditions.push('v.subject = ?');
        params.push(subject);
      }
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY v.created_at DESC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Видеоларды алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Бір видеоны алу
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Получить информацию о пользователе и его subjects
    const userResult = await db.query(
      'SELECT role, subjects FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    const user = userResult.rows[0];
    let userSubjects = null;
    
    // Парсинг subjects для студентов
    if (user.role === 'student' && user.subjects) {
      try {
        userSubjects = typeof user.subjects === 'string' 
          ? JSON.parse(user.subjects) 
          : user.subjects;
        if (!Array.isArray(userSubjects)) {
          userSubjects = null;
        }
      } catch (e) {
        console.error('Ошибка парсинга subjects:', e);
        userSubjects = null;
      }
    }
    
    const result = await db.query(
      `SELECT v.*, u.name as teacher_name 
       FROM videos v 
       JOIN users u ON v.teacher_id = u.id 
       WHERE v.id = ?`,
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Видео табылмады' });
    }
    
    const video = result.rows[0];
    
    // Для студентов: проверяем, что видео относится к их subjects
    if (user.role === 'student') {
      if (!userSubjects || userSubjects.length === 0) {
        return res.status(403).json({ error: 'Сізге бұл видеоны көруге рұқсат жоқ. Пәндер таңдалмаған.' });
      }
      if (!userSubjects.includes(video.subject)) {
        return res.status(403).json({ error: 'Сізге бұл видеоны көруге рұқсат жоқ. Бұл пән сіздің таңдаған пәндеріңізге жатпайды.' });
      }
    }

    res.json(video);
  } catch (error) {
    console.error('Видео алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Видео қосу (тек мұғалім, одобренный)
router.post('/', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const { title, description, youtube_url, subject } = req.body;

    if (!title || !youtube_url || !subject) {
      return res.status(400).json({ error: 'Атауы, YouTube URL және пән міндетті' });
    }

    if (!['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }

    const insertResult = await db.query(
      'INSERT INTO videos (title, description, youtube_url, teacher_id, subject) VALUES (?, ?, ?, ?, ?)',
      [title, description || '', youtube_url, req.user.id, subject]
    );

    // Жаңа қосылған видеоны алу
    const result = await db.query(
      'SELECT * FROM videos WHERE id = ?',
      [insertResult.lastID]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Видео қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Видеоны жаңарту (тек мұғалім, одобренный)
router.put('/:id', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { title, description, youtube_url, subject } = req.body;
    
    if (subject && !['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }

    // Видеоның иесін тексеру
    const videoCheck = await db.query('SELECT teacher_id FROM videos WHERE id = ?', [videoId]);
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Видео табылмады' });
    }
    if (videoCheck.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
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
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Жаңарту үшін деректер жоқ' });
    }
    
    values.push(videoId);
    await db.query(
      `UPDATE videos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Жаңартылған видеоны алу
    const result = await db.query('SELECT * FROM videos WHERE id = ?', [videoId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Видео жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Видеоны жою (тек мұғалім, одобренный)
router.delete('/:id', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const videoId = req.params.id;

    // Видеоның иесін тексеру
    const videoCheck = await db.query('SELECT teacher_id FROM videos WHERE id = ?', [videoId]);
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Видео табылмады' });
    }
    if (videoCheck.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await db.query('DELETE FROM videos WHERE id = ?', [videoId]);
    res.json({ message: 'Видео сәтті жойылды' });
  } catch (error) {
    console.error('Видео жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

