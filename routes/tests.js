const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole, requireApprovedTeacher } = require('../middleware/auth');

const router = express.Router();

// Получить список доступных тестов (для учеников - фильтр по subjects)
router.get('/', authenticateToken, async (req, res) => {
  try {
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
    
    let query = `SELECT t.*, u.name as teacher_name,
                 (SELECT COUNT(*) FROM test_results tr WHERE tr.test_id = t.id AND tr.student_id = ?) as attempts,
                 (SELECT MAX(tr.percentage) FROM test_results tr WHERE tr.test_id = t.id AND tr.student_id = ?) as best_score
                 FROM tests t 
                 JOIN users u ON t.teacher_id = u.id`;
    const params = [req.user.id, req.user.id];
    const conditions = [];
    
    // Для студентов: фильтровать по их subjects и показывать только главные тесты
    // + показывать ЕНТ тесты всем ученикам
    if (user.role === 'student') {
      if (userSubjects && userSubjects.length > 0) {
        const placeholders = userSubjects.map(() => '?').join(',');
        // Показывать тесты по выбранным предметам ИЛИ ЕНТ тесты
        conditions.push(`(t.subject IN (${placeholders}) OR t.subject = 'ent')`);
        params.push(...userSubjects);
        conditions.push('t.is_main_test = 1');
        conditions.push('t.is_active = 1');
      } else {
        // Если у студента нет subjects, показываем только ЕНТ тесты
        conditions.push("t.subject = 'ent'");
        conditions.push('t.is_main_test = 1');
        conditions.push('t.is_active = 1');
      }
    }
    // Для учителей: показывать только их тесты
    else if (user.role === 'teacher') {
      conditions.push('t.teacher_id = ?');
      params.push(req.user.id);
    }
    // Для админов: показывать все тесты (без фильтров)
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY t.created_at DESC`;
    
    // Логирование для отладки ЕНТ теста
    if (user.role === 'student') {
      console.log('🔍 Запрос тестов для ученика:', {
        userId: req.user.id,
        userSubjects: userSubjects,
        query: query,
        params: params
      });
    }
    
    const result = await db.query(query, params);
    
    // Логирование результатов
    if (user.role === 'student') {
      console.log('📋 Результаты запроса:', {
        totalTests: result.rows.length,
        entTests: result.rows.filter(t => t.subject === 'ent').length,
        subjects: [...new Set(result.rows.map(t => t.subject))]
      });
    }
    
    // Парсинг JSON полей
    const tests = result.rows.map(test => ({
      ...test,
      attempts: test.attempts || 0,
      best_score: test.best_score || null
    }));
    
    res.json(tests);
  } catch (error) {
    console.error('Тесттерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить результаты ученика (должен быть ПЕРЕД /:id)
router.get('/my-results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const results = await db.query(
      `SELECT tr.*, t.title as test_title, t.subject, u.name as teacher_name
       FROM test_results tr
       JOIN tests t ON tr.test_id = t.id
       JOIN users u ON t.teacher_id = u.id
       WHERE tr.student_id = ?
       ORDER BY tr.completed_at DESC`,
      [userId]
    );
    
    const formattedResults = results.rows.map(r => ({
      ...r,
      answers: JSON.parse(r.answers || '[]')
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Нәтижелерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ВАЖНО: Специфичные маршруты должны быть ПЕРЕД общими
// Получить результаты теста (для учителя)
router.get('/:id/results', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const testId = req.params.id;
    const userId = req.user.id;
    
    // Проверка, что тест существует и получение информации о нем
    const testCheck = await db.query('SELECT teacher_id, is_main_test FROM tests WHERE id = ?', [testId]);
    if (testCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тест табылмады' });
    }
    
    const test = testCheck.rows[0];
    
    // Для главных тестов (is_main_test = 1) - любой учитель может видеть результаты
    // Для обычных тестов - только создатель теста или админ
    if (test.is_main_test !== 1 && test.teacher_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    
    // Получить все результаты теста
    const results = await db.query(
      `SELECT tr.*, u.name as student_name, u.email as student_email
       FROM test_results tr
       JOIN users u ON tr.student_id = u.id
       WHERE tr.test_id = ?
       ORDER BY tr.completed_at DESC, tr.created_at DESC`,
      [testId]
    );
    
    // Форматировать результаты
    const formattedResults = results.rows.map(r => ({
      ...r,
      answers: JSON.parse(r.answers || '{}')
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Нәтижелерді алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Получить один тест с вопросами
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const testId = req.params.id;
    
    // Получить информацию о пользователе
    const userResult = await db.query(
      'SELECT role, subjects FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пайдаланушы табылмады' });
    }
    
    const user = userResult.rows[0];
    let userSubjects = null;
    
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
    
    // Получить тест
    const testResult = await db.query(
      `SELECT t.*, u.name as teacher_name 
       FROM tests t 
       JOIN users u ON t.teacher_id = u.id 
       WHERE t.id = ?`,
      [testId]
    );
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тест табылмады' });
    }
    
    const test = testResult.rows[0];
    
    // Для учителей: разрешаем доступ к их собственным тестам для редактирования
    if (user.role === 'teacher' && test.teacher_id === req.user.id) {
      // Учитель может получить доступ к своему тесту для редактирования
      // Продолжаем без дополнительных проверок
    }
    // Для студентов: проверяем доступ
    else if (user.role === 'student') {
      // ЕНТ тесты доступны всем ученикам
      if (test.subject === 'ent') {
        if (!test.is_main_test || !test.is_active) {
          return res.status(403).json({ error: 'Бұл тест қолжетімсіз' });
        }
        // Продолжаем без проверки subjects
      } else {
        // Для обычных тестов проверяем subjects
        if (!userSubjects || userSubjects.length === 0) {
          return res.status(403).json({ error: 'Сізге бұл тестке қол жеткізуге рұқсат жоқ. Пәндер таңдалмаған.' });
        }
        if (!userSubjects.includes(test.subject)) {
          return res.status(403).json({ error: 'Сізге бұл тестке қол жеткізуге рұқсат жоқ. Бұл пән сіздің таңдаған пәндеріңізге жатпайды.' });
        }
        if (!test.is_main_test || !test.is_active) {
          return res.status(403).json({ error: 'Бұл тест қолжетімсіз' });
        }
      }
    }
    // Для других ролей (например, админ) - разрешаем доступ
    
    // Получить вопросы теста
    const questionsResult = await db.query(
      'SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_order ASC',
      [testId]
    );
    
    // Парсинг JSON полей
    const questions = questionsResult.rows.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      correct_answer: JSON.parse(q.correct_answer)
    }));
    
    // Для студентов: не показываем правильные ответы
    if (user.role === 'student') {
      questions.forEach(q => {
        delete q.correct_answer;
      });
    }
    
    res.json({
      ...test,
      questions: questions
    });
  } catch (error) {
    console.error('Тест алу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Начать прохождение теста
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const testId = req.params.id;
    const userId = req.user.id;
    
    // Проверка, что пользователь - студент
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'student') {
      return res.status(403).json({ error: 'Тек оқушылар тестті бастай алады' });
    }
    
    // Проверка существования теста
    const testResult = await db.query('SELECT * FROM tests WHERE id = ?', [testId]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тест табылмады' });
    }
    
    // Проверка, есть ли уже результат
    const existingResult = await db.query(
      'SELECT * FROM test_results WHERE test_id = ? AND student_id = ?',
      [testId, userId]
    );
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      
      // Если тест уже завершен (completed_at не null)
      if (existing.completed_at) {
        // Если тест завершен с нулевым результатом и пустыми ответами, удалить и начать новый
        const answers = existing.answers ? JSON.parse(existing.answers) : {};
        const hasAnswers = Object.keys(answers).length > 0 && Object.values(answers).some(a => a !== null && a !== undefined);
        
        if (existing.score === 0 && !hasAnswers) {
          console.log('Тест завершен с нулевым результатом и пустыми ответами, удаляем и начинаем новый');
          await db.query('DELETE FROM test_results WHERE id = ?', [existing.id]);
          // Продолжить выполнение, чтобы создать новую запись ниже
        } else {
          // Тест завершен нормально, показать результаты
          return res.json({
            result_id: existing.id,
            already_completed: true,
            result: existing
          });
        }
      }
      
      // Если тест начат, но не завершен - возвращаем result_id для продолжения
      console.log('Тест начат, но не завершен. Продолжаем с result_id:', existing.id);
      
      // Парсим сохраненные ответы, если они есть
      let savedAnswers = {};
      try {
        if (existing.answers && existing.answers !== '{}') {
          savedAnswers = JSON.parse(existing.answers);
        }
      } catch (e) {
        console.error('Ошибка парсинга сохраненных ответов:', e);
        savedAnswers = {};
      }
      
      return res.json({
        result_id: existing.id,
        already_completed: false,
        started_at: existing.started_at,
        saved_answers: savedAnswers
      });
    }
    
    // Создать новую запись о начале теста
    const insertResult = await db.query(
      `INSERT INTO test_results (test_id, student_id, answers, started_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [testId, userId, JSON.stringify({})]
    );
    
    const resultId = insertResult.lastID;
    console.log('Создан test_result с ID:', resultId, 'для теста:', testId, 'ученика:', userId);
    console.log('insertResult полный объект:', JSON.stringify(insertResult, null, 2));
    
    if (!resultId || resultId === 0 || resultId === null || resultId === undefined) {
      console.error('Ошибка: lastID не получен после INSERT:', insertResult);
      // Попробовать получить ID другим способом
      const checkResult = await db.query(
        'SELECT id FROM test_results WHERE test_id = ? AND student_id = ? ORDER BY id DESC LIMIT 1',
        [testId, userId]
      );
      
      if (checkResult.rows.length > 0) {
        const alternativeId = checkResult.rows[0].id;
        console.log('Получен альтернативный ID из SELECT:', alternativeId);
        const responseData = {
          result_id: alternativeId,
          started_at: new Date().toISOString()
        };
        console.log('Отправка ответа startTest (альтернативный ID):', JSON.stringify(responseData, null, 2));
        return res.json(responseData);
      }
      
      return res.status(500).json({ error: 'Тестті бастау мүмкін болмады: result_id құрылмады' });
    }
    
    const responseData = {
      result_id: resultId,
      started_at: new Date().toISOString()
    };
    
    console.log('Отправка ответа startTest:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('Тестті бастау қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Отправить ответы и получить результат
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const testId = req.params.id;
    const userId = req.user.id;
    const { answers, time_spent, result_id } = req.body;
    
    if (!answers || !result_id) {
      return res.status(400).json({ error: 'Жауаптар және result_id міндетті' });
    }
    
    // Проверка, что пользователь - студент
    const userResult = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'student') {
      return res.status(403).json({ error: 'Тек оқушылар тестті жібере алады' });
    }
    
    // Получить тест и вопросы
    const testResult = await db.query('SELECT * FROM tests WHERE id = ?', [testId]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тест табылмады' });
    }
    
    const questionsResult = await db.query(
      'SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_order ASC',
      [testId]
    );
    
    // Проверить результат
    const resultCheck = await db.query(
      'SELECT * FROM test_results WHERE id = ? AND test_id = ? AND student_id = ?',
      [result_id, testId, userId]
    );
    
    if (resultCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Нәтиже табылмады' });
    }
    
    // Проверить, не завершен ли уже тест
    const existingResult = resultCheck.rows[0];
    if (existingResult.completed_at) {
      // Если тест завершен с нулевым результатом и пустыми ответами, позволить начать новый
      const answers = existingResult.answers ? JSON.parse(existingResult.answers) : {};
      const hasAnswers = Object.keys(answers).length > 0 && Object.values(answers).some(a => a !== null);
      
      if (existingResult.score === 0 && !hasAnswers) {
        console.log('Тест завершен с нулевым результатом и пустыми ответами, удаляем старую запись');
        // Удалить старую запись и создать новую
        await db.query('DELETE FROM test_results WHERE id = ?', [result_id]);
        // Продолжить выполнение, чтобы создать новую запись ниже
      } else {
        return res.json({
          message: 'Тест бұрыннан аяқталған',
          result: existingResult
        });
      }
    }
    
    // Проверить ответы и посчитать баллы
    let totalScore = 0;
    let earnedScore = 0;
    const questions = questionsResult.rows.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      correct_answer: JSON.parse(q.correct_answer)
    }));
    
    questions.forEach((question, index) => {
      totalScore += question.points;
      const userAnswer = answers[index];
      const correctAnswer = question.correct_answer;
      
      let isCorrect = false;
      
      if (question.question_type === 'single_choice') {
        isCorrect = userAnswer === correctAnswer;
      } else if (question.question_type === 'multiple_choice') {
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          isCorrect = JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());
        }
      } else if (question.question_type === 'text') {
        // Для текстовых ответов простое сравнение (можно улучшить)
        isCorrect = String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
      }
      
      if (isCorrect) {
        earnedScore += question.points;
      }
    });
    
    const percentage = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
    const passed = testResult.rows[0].passing_score 
      ? percentage >= testResult.rows[0].passing_score 
      : percentage >= 60; // По умолчанию 60%
    
    // Обновить результат
    await db.query(
      `UPDATE test_results 
       SET answers = ?, score = ?, total_score = ?, percentage = ?, passed = ?, 
           time_spent = ?, completed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [JSON.stringify(answers), earnedScore, totalScore, percentage, passed ? 1 : 0, time_spent || 0, result_id]
    );
    
    // Получить обновленный результат
    const finalResult = await db.query('SELECT * FROM test_results WHERE id = ?', [result_id]);
    
    // Логирование для отладки
    console.log('Тест отправлен:', {
      testId,
      userId,
      result_id,
      answersCount: answers.length,
      answers: answers,
      earnedScore,
      totalScore,
      percentage,
      passed
    });
    
    res.json({
      message: 'Тест сәтті аяқталды',
      result: {
        ...finalResult.rows[0],
        answers: JSON.parse(finalResult.rows[0].answers)
      },
      questions: questions.map((q, index) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        user_answer: answers[index],
        correct_answer: q.correct_answer,
        is_correct: (() => {
          if (q.question_type === 'single_choice') {
            return answers[index] === q.correct_answer;
          } else if (q.question_type === 'multiple_choice') {
            if (Array.isArray(answers[index]) && Array.isArray(q.correct_answer)) {
              return JSON.stringify(answers[index].sort()) === JSON.stringify(q.correct_answer.sort());
            }
            return false;
          } else {
            return String(answers[index]).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
          }
        })()
      }))
    });
  } catch (error) {
    console.error('Тестті жіберу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Автосохранение ответов во время прохождения теста
router.put('/:id/save-answers', authenticateToken, async (req, res) => {
  try {
    const testId = req.params.id;
    const userId = req.user.id;
    const { result_id, answers } = req.body;
    
    if (!result_id || !answers) {
      return res.status(400).json({ error: 'result_id және answers міндетті' });
    }
    
    // Проверка, что результат принадлежит пользователю
    const resultCheck = await db.query(
      'SELECT * FROM test_results WHERE id = ? AND test_id = ? AND student_id = ?',
      [result_id, testId, userId]
    );
    
    if (resultCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Нәтиже табылмады' });
    }
    
    // Проверить, не завершен ли уже тест
    if (resultCheck.rows[0].completed_at) {
      return res.json({ message: 'Тест бұрыннан аяқталған' });
    }
    
    // Сохранить ответы
    await db.query(
      'UPDATE test_results SET answers = ? WHERE id = ?',
      [JSON.stringify(answers), result_id]
    );
    
    res.json({ message: 'Жауаптар сақталды' });
  } catch (error) {
    console.error('Жауаптарды сақтау қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// ========== МАРШРУТЫ ДЛЯ УЧИТЕЛЕЙ ==========

// Создать тест (только учитель)
router.post('/', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const { title, description, subject, time_limit, passing_score, is_main_test, questions } = req.body;
    
    if (!title || !subject || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Атауы, пән және кемінде бір сұрақ міндетті' });
    }
    
    if (!['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }
    
    // Создать тест
    const is_active = req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : 1;
    const testInsert = await db.query(
      `INSERT INTO tests (title, description, subject, teacher_id, time_limit, passing_score, is_main_test, is_active, total_questions) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || '', subject, req.user.id, time_limit || null, passing_score || null, is_main_test ? 1 : 0, is_active, questions.length]
    );
    
    const testId = testInsert.lastID;
    
    // Добавить вопросы
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        `INSERT INTO test_questions (test_id, question_text, question_type, options, correct_answer, points, question_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          testId,
          q.question_text,
          q.question_type,
          JSON.stringify(q.options),
          JSON.stringify(q.correct_answer),
          q.points || 1,
          i
        ]
      );
    }
    
    // Получить созданный тест
    const testResult = await db.query(
      `SELECT t.*, u.name as teacher_name 
       FROM tests t 
       JOIN users u ON t.teacher_id = u.id 
       WHERE t.id = ?`,
      [testId]
    );
    
    res.status(201).json(testResult.rows[0]);
  } catch (error) {
    console.error('Тест қосу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// Обновить тест (только учитель)
router.put('/:id', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    console.log('PUT /api/tests/:id вызван', {
      testId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      body: req.body
    });
    
    const testId = req.params.id;
    const { title, description, subject, time_limit, passing_score, is_main_test, is_active, questions } = req.body;
    
    if (!testId) {
      return res.status(400).json({ error: 'Тест ID көрсетілмеген' });
    }
    
    // Проверить, что тест принадлежит учителю
    const testCheck = await db.query('SELECT teacher_id FROM tests WHERE id = ?', [testId]);
    if (testCheck.rows.length === 0) {
      console.log('Тест не найден:', testId);
      return res.status(404).json({ error: 'Тест табылмады' });
    }
    
    if (testCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'admin') {
      console.log('Нет доступа к тесту:', { testTeacherId: testCheck.rows[0].teacher_id, userId: req.user.id });
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    
    if (!title || !subject) {
      return res.status(400).json({ error: 'Атауы және пән міндетті' });
    }
    
    if (!['informatics', 'mathematics'].includes(subject)) {
      return res.status(400).json({ error: 'Пән "informatics" немесе "mathematics" болуы керек' });
    }
    
    console.log('Обновление теста:', { testId, title, subject, time_limit, passing_score });
    
    // Обновить тест
    // ВАЖНО: Сохраняем is_main_test и is_active из запроса, если они переданы
    // Если не переданы, сохраняем текущие значения из базы
    const currentTest = await db.query('SELECT is_main_test, is_active FROM tests WHERE id = ?', [testId]);
    const finalIsMainTest = is_main_test !== undefined ? (is_main_test ? 1 : 0) : (currentTest.rows[0]?.is_main_test || 0);
    const finalIsActive = is_active !== undefined ? (is_active ? 1 : 0) : (currentTest.rows[0]?.is_active !== undefined ? currentTest.rows[0].is_active : 1);
    
    await db.query(
      `UPDATE tests 
       SET title = ?, description = ?, subject = ?, time_limit = ?, passing_score = ?, 
           is_main_test = ?, is_active = ?, total_questions = ?
       WHERE id = ?`,
      [
        title,
        description || '',
        subject,
        time_limit || null,
        passing_score || null,
        finalIsMainTest,
        finalIsActive,
        questions && Array.isArray(questions) ? questions.length : 0,
        testId
      ]
    );
    
    console.log('Тест обновлен с параметрами:', {
      testId,
      is_main_test: finalIsMainTest,
      is_active: finalIsActive,
      time_limit,
      passing_score
    });
    
    // Удалить старые вопросы
    await db.query('DELETE FROM test_questions WHERE test_id = ?', [testId]);
    
    // Добавить новые вопросы
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await db.query(
          `INSERT INTO test_questions (test_id, question_text, question_type, options, correct_answer, points, question_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            testId,
            q.question_text,
            q.question_type,
            JSON.stringify(q.options),
            JSON.stringify(q.correct_answer),
            q.points || 1,
            i
          ]
        );
      }
    }
    
    // Получить обновленный тест
    const testResult = await db.query(
      `SELECT t.*, u.name as teacher_name 
       FROM tests t 
       JOIN users u ON t.teacher_id = u.id 
       WHERE t.id = ?`,
      [testId]
    );
    
    console.log('Тест успешно обновлен:', testResult.rows[0]);
    res.json(testResult.rows[0]);
  } catch (error) {
    console.error('Тестті жаңарту қатесі:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Сервер қатесі: ' + error.message });
  }
});

// Удалить тест (только учитель)
router.delete('/:id', authenticateToken, requireRole(['teacher']), requireApprovedTeacher, async (req, res) => {
  try {
    const testId = req.params.id;
    
    // Проверить, что тест принадлежит учителю
    const testCheck = await db.query('SELECT teacher_id FROM tests WHERE id = ?', [testId]);
    if (testCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тест табылмады' });
    }
    
    if (testCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    
    // Удалить тест (вопросы и результаты удалятся каскадно)
    await db.query('DELETE FROM tests WHERE id = ?', [testId]);
    
    res.json({ message: 'Тест сәтті жойылды' });
  } catch (error) {
    console.error('Тестті жою қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

