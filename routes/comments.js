const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Видео бойынша комментарийлерді алу
router.get('/video/:videoId', authenticateToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const result = await db.query(
      `SELECT c.*, u.name as user_name, u.role as user_role, u.avatar_url 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.video_id = ? 
       ORDER BY c.created_at DESC`,
      [videoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Комментарийлерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Комментарий қосу
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { video_id, text } = req.body;

    if (!video_id || !text) {
      return res.status(400).json({ error: 'Видео ID және мәтін міндетті' });
    }

    // Видеоның бар екенін тексеру
    const videoCheck = await db.query('SELECT id FROM videos WHERE id = ?', [video_id]);
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Видео табылмады' });
    }

    const insertResult = await db.query(
      'INSERT INTO comments (user_id, video_id, text) VALUES (?, ?, ?)',
      [req.user.id, video_id, text]
    );

    // Пайдаланушы ақпаратын қосу
    const commentWithUser = await db.query(
      `SELECT c.*, u.name as user_name, u.role as user_role, u.avatar_url 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [insertResult.lastID]
    );

    res.status(201).json(commentWithUser.rows[0]);
  } catch (error) {
    console.error('Комментарий қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Комментарий жою
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;

    // Комментарийдің иесін тексеру
    const commentCheck = await db.query('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий табылмады' });
    }
    if (commentCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: 'Комментарий сәтті жойылды' });
  } catch (error) {
    console.error('Комментарий жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

