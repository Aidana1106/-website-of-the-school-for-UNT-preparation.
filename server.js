const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статикалық файлдар (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');
const progressRoutes = require('./routes/progress');
const commentRoutes = require('./routes/comments');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const telegramRoutes = require('./routes/telegram');
// Загрузка модуля тестов
let testRoutes;
try {
  testRoutes = require('./routes/tests');
  console.log('✅ Модуль routes/tests.js загружен успешно');
} catch (error) {
  console.error('❌ Ошибка загрузки routes/tests.js:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  console.error('Сервер продолжит работу без модуля тестов');
  // Создаем пустой роутер, чтобы не ломать сервер
  const express = require('express');
  testRoutes = express.Router();
  // Добавляем заглушку для маршрута
  testRoutes.get('*', (req, res) => {
    res.status(503).json({ error: 'Модуль тестов недоступен' });
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/tests', testRoutes);

// Frontend статикалық файлдар (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Барлық маршруттарды frontend-ке бағыттау (SPA үшін)
// Только для не-API запросов и только для GET запросов
app.get('*', (req, res) => {
  // API маршруттарын өткізіп жіберу - если запрос к API, возвращаем 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint табылмады' });
  }
  
  // HTML файлдарын табу
  const indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

// Для всех остальных методов (PUT, POST, DELETE) к API - возвращаем 404 если роут не найден
app.use('/api/*', (req, res, next) => {
  // Этот middleware сработает только если ни один роут не обработал запрос
  // Но на самом деле это не должно сработать, так как роуты уже обработаны выше
  // Это просто fallback
  if (req.method !== 'GET' && req.path.startsWith('/api/')) {
    console.log('Необработанный API запрос:', req.method, req.path);
  }
  next();
});

// Серверді іске қосу
app.listen(PORT, () => {
  console.log(`Сервер ${PORT} портында жұмыс істеп тұр`);
  console.log(`http://localhost:${PORT}`);
});

