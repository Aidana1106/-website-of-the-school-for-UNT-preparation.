const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole, requireApprovedTeacher } = require('../middleware/auth');

const router = express.Router();

// Оқушының тапсырма жіберулерін алу
router.get('/my', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, a.title as assignment_title 
       FROM submissions s 
       JOIN assignments a ON s.assignment_id = a.id 
       WHERE s.student_id = ? 
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Жіберулерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Барлық жіберулерді алу (мұғалім үшін, одобренный)
router.get('/all', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, a.title as assignment_title, u.name as student_name 
       FROM submissions s 
       JOIN assignments a ON s.assignment_id = a.id 
       JOIN users u ON s.student_id = u.id 
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Жіберулерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Тапсырма бойынша жіберулерді алу
router.get('/assignment/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const result = await db.query(
      `SELECT s.*, u.name as student_name 
       FROM submissions s 
       JOIN users u ON s.student_id = u.id 
       WHERE s.assignment_id = ? 
       ORDER BY s.created_at DESC`,
      [assignmentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Жіберулерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Тапсырма жіберу (оқушы)
router.post('/', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { assignment_id, answer_text, file_url } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ error: 'Тапсырма ID міндетті' });
    }

    // Тапсырманың бар екенін тексеру
    const assignmentCheck = await db.query('SELECT id FROM assignments WHERE id = ?', [assignment_id]);
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тапсырма табылмады' });
    }

    // Жіберу бар ма, тексеру
    const existing = await db.query(
      'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
      [assignment_id, req.user.id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Жаңарту
      await db.query(
        'UPDATE submissions SET answer_text = ?, file_url = ? WHERE id = ?',
        [answer_text || '', file_url || null, existing.rows[0].id]
      );
      result = await db.query('SELECT * FROM submissions WHERE id = ?', [existing.rows[0].id]);
    } else {
      // Жаңа жіберу
      const insertResult = await db.query(
        'INSERT INTO submissions (assignment_id, student_id, answer_text, file_url) VALUES (?, ?, ?, ?)',
        [assignment_id, req.user.id, answer_text || '', file_url || null]
      );
      result = await db.query('SELECT * FROM submissions WHERE id = ?', [insertResult.lastID]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Тапсырма жіберу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Баға және комментарий беру (мұғалім, одобренный)
router.put('/:id/grade', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { grade, teacher_comment } = req.body;

    await db.query(
      'UPDATE submissions SET grade = ?, teacher_comment = ? WHERE id = ?',
      [grade, teacher_comment || '', submissionId]
    );

    const result = await db.query('SELECT * FROM submissions WHERE id = ?', [submissionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Жіберу табылмады' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Баға беру қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

