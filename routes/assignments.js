const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole, requireApprovedTeacher } = require('../middleware/auth');

const router = express.Router();

// Барлық тапсырмаларды алу (пән бойынша фильтрлеу)
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
    
    let query = `SELECT a.*, u.name as teacher_name 
       FROM assignments a 
       JOIN users u ON a.teacher_id = u.id`;
    const params = [];
    const conditions = [];
    
    // Для студентов: фильтровать по их subjects
    if (user.role === 'student' && userSubjects && userSubjects.length > 0) {
      const placeholders = userSubjects.map(() => '?').join(',');
      conditions.push(`a.subject IN (${placeholders})`);
      params.push(...userSubjects);
    }
    
    // Дополнительная фильтрация по query параметру subject (для учителей и админов)
    if (subject && ['informatics', 'mathematics'].includes(subject)) {
      if (user.role === 'student' && userSubjects && userSubjects.length > 0) {
        // Для студентов проверяем, что запрашиваемый subject есть в их subjects
        if (userSubjects.includes(subject)) {
          conditions.push('a.subject = ?');
          params.push(subject);
        } else {
          // Если студент запрашивает subject, которого у него нет, возвращаем пустой массив
          return res.json([]);
        }
      } else {
        // Для учителей и админов просто добавляем фильтр
        conditions.push('a.subject = ?');
        params.push(subject);
      }
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Тапсырмаларды алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Бір тапсырманы алу
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    
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
      `SELECT a.*, u.name as teacher_name 
       FROM assignments a 
       JOIN users u ON a.teacher_id = u.id 
       WHERE a.id = ?`,
      [assignmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Тапсырма табылмады' });
    }
    
    const assignment = result.rows[0];
    
    // Для студентов: проверяем, что задание относится к их subjects
    if (user.role === 'student') {
      if (!userSubjects || userSubjects.length === 0) {
        return res.status(403).json({ error: 'Сізге бұл тапсырманы көруге рұқсат жоқ. Пәндер таңдалмаған.' });
      }
      if (!userSubjects.includes(assignment.subject)) {
        return res.status(403).json({ error: 'Сізге бұл тапсырманы көруге рұқсат жоқ. Бұл пән сіздің таңдаған пәндеріңізге жатпайды.' });
      }
    }

    res.json(assignment);
  } catch (error) {
    console.error('Тапсырма алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Тапсырма қосу (тек мұғалім, одобренный)
router.post('/', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const { title, description, file_url, deadline, subject } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ error: 'Атауы және пән міндетті' });
    }

    if (!['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }

    const insertResult = await db.query(
      'INSERT INTO assignments (title, description, file_url, teacher_id, deadline, subject) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', file_url || null, req.user.id, deadline || null, subject]
    );

    // Жаңа қосылған тапсырманы алу
    const result = await db.query(
      'SELECT * FROM assignments WHERE id = ?',
      [insertResult.lastID]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Тапсырма қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Тапсырманы жаңарту (тек мұғалім, одобренный)
router.put('/:id', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { title, description, file_url, deadline, subject } = req.body;
    
    if (subject && !['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }

    // Тапсырманың иесін тексеру
    const assignmentCheck = await db.query('SELECT teacher_id FROM assignments WHERE id = ?', [assignmentId]);
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тапсырма табылмады' });
    }
    if (assignmentCheck.rows[0].teacher_id !== req.user.id) {
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
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Жаңарту үшін деректер жоқ' });
    }
    
    values.push(assignmentId);
    await db.query(
      `UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Жаңартылған тапсырманы алу
    const result = await db.query('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Тапсырма жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Тапсырманы жою (тек мұғалім, одобренный)
router.delete('/:id', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const assignmentId = req.params.id;

    // Тапсырманың иесін тексеру
    const assignmentCheck = await db.query('SELECT teacher_id FROM assignments WHERE id = ?', [assignmentId]);
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тапсырма табылмады' });
    }
    if (assignmentCheck.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await db.query('DELETE FROM assignments WHERE id = ?', [assignmentId]);
    res.json({ message: 'Тапсырма сәтті жойылды' });
  } catch (error) {
    console.error('Тапсырма жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

