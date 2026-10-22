const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Оқушының прогрессін алу
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, v.title as video_title, v.subject 
       FROM progress p 
       JOIN videos v ON p.video_id = v.id 
       WHERE p.student_id = ? 
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Прогресс алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Барлық оқушылардың прогрессін алу (мұғалім)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const result = await db.query(
      `SELECT p.*, u.name as student_name, v.title as video_title 
       FROM progress p 
       JOIN users u ON p.student_id = u.id 
       JOIN videos v ON p.video_id = v.id 
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Прогресс алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Оқушылардың статистикасы (мұғалім)
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    // Әр оқушының прогрессін есептеу
    const result = await db.query(
      `SELECT 
        u.id,
        u.name,
        COUNT(DISTINCT p.video_id) as videos_watched,
        COUNT(DISTINCT CASE WHEN p.completed = 1 THEN p.video_id END) as videos_completed,
        COUNT(DISTINCT s.id) as assignments_submitted,
        COALESCE(AVG(s.grade), 0) as average_grade
       FROM users u
       LEFT JOIN progress p ON u.id = p.student_id
       LEFT JOIN submissions s ON u.id = s.student_id
       WHERE u.role = 'student'
       GROUP BY u.id, u.name
       ORDER BY u.name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Статистика алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Прогресс жаңарту
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { video_id, watched_seconds, completed } = req.body;

    if (!video_id) {
      return res.status(400).json({ error: 'Видео ID міндетті' });
    }

    // Видеоның бар екенін тексеру
    const videoCheck = await db.query('SELECT id FROM videos WHERE id = ?', [video_id]);
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Видео табылмады' });
    }

    // Прогресс бар ма, тексеру
    const existing = await db.query(
      'SELECT id FROM progress WHERE video_id = ? AND student_id = ?',
      [video_id, req.user.id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Жаңарту (SQLite-та BOOLEAN -> INTEGER)
      await db.query(
        'UPDATE progress SET watched_seconds = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [watched_seconds || 0, completed ? 1 : 0, existing.rows[0].id]
      );
      result = await db.query('SELECT * FROM progress WHERE id = ?', [existing.rows[0].id]);
    } else {
      // Жаңа прогресс
      const insertResult = await db.query(
        'INSERT INTO progress (student_id, video_id, watched_seconds, completed) VALUES (?, ?, ?, ?)',
        [req.user.id, video_id, watched_seconds || 0, completed ? 1 : 0]
      );
      result = await db.query('SELECT * FROM progress WHERE id = ?', [insertResult.lastID]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Прогресс жаңарту қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

