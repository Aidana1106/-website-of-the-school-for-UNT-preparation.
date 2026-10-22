const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Upload директориясын құру
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer конфигурациясы
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Файл жүктеу
router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл жүктелмеді' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      message: 'Файл сәтті жүктелді',
      file_url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Файл жүктеу қатесі:', error);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;

