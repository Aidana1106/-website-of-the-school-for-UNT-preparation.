/**
 * ENT-Bilim - Database Configuration
 * Конфигурация базы данных SQLite
 * 
 * Этот файл:
 * - Подключается к базе данных SQLite
 * - Создает все необходимые таблицы при первом запуске
 * - Выполняет миграции для добавления новых полей
 * - Предоставляет Promise-based API для работы с БД
 * - Создает начального админа, если его нет
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Путь к файлу базы данных (из переменной окружения или по умолчанию)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

/**
 * Подключение к базе данных SQLite
 * При успешном подключении:
 * 1. Включает поддержку внешних ключей (PRAGMA foreign_keys = ON)
 * 2. Инициализирует базу данных (создает таблицы, если их нет)
 */
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Деректер базасына қосылу қатесі:', err.message);
    process.exit(-1);
  }
  console.log('SQLite деректер базасына қосылды');
  
  // Foreign key constraint-терді іске қосу
  db.run('PRAGMA foreign_keys = ON');
  
  // Деректер базасын инициализациялау (егер кестелер жоқ болса)
  initializeDatabase();
});

/**
 * Обертка для SQLite запросов в Promise
 * Преобразует callback-based API SQLite в Promise-based API
 * 
 * Для SELECT запросов возвращает { rows: [...] }
 * Для INSERT/UPDATE/DELETE возвращает { rows: [], lastID: ..., changes: ... }
 * 
 * @param {string} sql - SQL запрос
 * @param {Array} params - Параметры для запроса
 * @returns {Promise<object>} Результат запроса
 */
db.query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ rows: [], lastID: this.lastID, changes: this.changes });
      });
    }
  });
};

/**
 * Инициализация базы данных
 * Создает все необходимые таблицы, если их нет:
 * 
 * 1. users - пользователи (ученики, учителя, админы)
 *    - id, name, email, password_hash, role, avatar_url
 *    - approved (одобрен ли пользователь)
 *    - paid (оплатил ли ученик)
 *    - subjects (JSON массив выбранных предметов для учеников)
 *    - created_at
 * 
 * 2. videos - видео-уроки
 *    - id, title, description, youtube_url, teacher_id, subject, created_at
 * 
 * 3. assignments - задания
 *    - id, title, description, file_url, teacher_id, video_id, subject, deadline, created_at
 * 
 * 4. submissions - выполненные задания учеников
 *    - id, assignment_id, student_id, answer_text, file_url, grade, teacher_comment, created_at
 * 
 * 5. progress - прогресс учеников по видео
 *    - id, student_id, video_id, watched_seconds, completed, updated_at
 * 
 * 6. comments - комментарии к видео
 *    - id, video_id, user_id, text, created_at
 * 
 * После создания таблиц:
 * - Выполняет миграции для добавления новых полей (approved, paid, video_id, subjects)
 * - Создает начального админа, если его нет
 */
function initializeDatabase() {
  // Кестелерді тікелей құру
  const createTables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
      avatar_url TEXT,
      approved INTEGER DEFAULT 0,
      paid INTEGER DEFAULT 0,
      subjects TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      youtube_url TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      subject TEXT NOT NULL CHECK (subject IN ('informatics', 'mathematics')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      teacher_id INTEGER NOT NULL,
      video_id INTEGER,
      subject TEXT NOT NULL CHECK (subject IN ('informatics', 'mathematics')),
      deadline DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      answer_text TEXT,
      file_url TEXT,
      grade INTEGER,
      teacher_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(assignment_id, student_id)
    )`,
    `CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      watched_seconds INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      UNIQUE(student_id, video_id)
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL CHECK (subject IN ('informatics', 'mathematics')),
      teacher_id INTEGER NOT NULL,
      video_id INTEGER,
      time_limit INTEGER,
      total_questions INTEGER DEFAULT 0,
      passing_score INTEGER,
      is_active INTEGER DEFAULT 1,
      is_main_test INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS test_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'text')),
      options TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      points INTEGER DEFAULT 1,
      question_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      answers TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      passed INTEGER DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(test_id, student_id)
    )`
  ];

  // Индекстерді құру
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_videos_teacher ON videos(teacher_id)',
    'CREATE INDEX IF NOT EXISTS idx_videos_subject ON videos(subject)',
    'CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id)',
    'CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject)',
    'CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)',
    'CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_video ON progress(video_id)',
    'CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id)',
    'CREATE INDEX IF NOT EXISTS idx_tests_teacher ON tests(teacher_id)',
    'CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject)',
    'CREATE INDEX IF NOT EXISTS idx_tests_main ON tests(is_main_test)',
    'CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id)',
    'CREATE INDEX IF NOT EXISTS idx_test_results_student ON test_results(student_id)',
    'CREATE INDEX IF NOT EXISTS idx_test_results_test ON test_results(test_id)'
  ];

  // Ретімен орындау
  let tableIndex = 0;
  let indexIndex = 0;

  function createNextTable() {
    if (tableIndex >= createTables.length) {
      // Барлық кестелер құрылды, индекстерді құру
      createNextIndex();
      return;
    }

    const sql = createTables[tableIndex];
    db.run(sql, (err) => {
      if (err) {
        console.error(`Кесте құру қатесі (${tableIndex + 1}):`, err.message);
      }
      tableIndex++;
      createNextTable();
    });
  }

  function createNextIndex() {
    if (indexIndex >= createIndexes.length) {
      console.log('Деректер базасы схемасы сәтті құрылды');
      // Миграция: добавить поле subjects для учеников
      migrateSubjects();
      return;
    }

    const sql = createIndexes[indexIndex];
    db.run(sql, (err) => {
      if (err) {
        // Индекстер үшін "already exists" қатесі қалыпты
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.error(`Индекс құру қатесі (${indexIndex + 1}):`, err.message);
        }
      }
      indexIndex++;
      createNextIndex();
    });
  }

  createNextTable();
  
  // Миграция: егер subject өрісі жоқ болса, қосу
  migrateDatabase();
}

// Миграция функциясы
function migrateDatabase() {
  // videos кестесіне subject өрісін қосу (егер жоқ болса)
  db.run(`ALTER TABLE videos ADD COLUMN subject TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Өріс бар болса, қате емес
    } else {
      // Жаңа қосылған өріске дефолт мән беру
      db.run(`UPDATE videos SET subject = 'mathematics' WHERE subject IS NULL`, () => {});
    }
  });
  
  // assignments кестесіне subject өрісін қосу (егер жоқ болса)
  db.run(`ALTER TABLE assignments ADD COLUMN subject TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Өріс бар болса, қате емес
    } else {
      // Жаңа қосылған өріске дефолт мән беру
      db.run(`UPDATE assignments SET subject = 'mathematics' WHERE subject IS NULL`, () => {});
    }
  });
  
  // users кестесіне approved және paid өрістерін қосу
  db.run(`ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Өріс бар болса, қате емес
    } else {
      // Админдерді автоматты түрде бекіту
      db.run(`UPDATE users SET approved = 1 WHERE role = 'admin'`, () => {});
    }
  });
  
  db.run(`ALTER TABLE users ADD COLUMN paid INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Өріс бар болса, қате емес
    }
  });
  
  // assignments кестесіне video_id өрісін қосу
  db.run(`ALTER TABLE assignments ADD COLUMN video_id INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Өріс бар болса, қате емес
    }
  });
  
  // Индекстерді қосу (егер жоқ болса)
  db.run('CREATE INDEX IF NOT EXISTS idx_videos_subject ON videos(subject)', () => {});
  db.run('CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject)', () => {});
  db.run('CREATE INDEX IF NOT EXISTS idx_assignments_video ON assignments(video_id)', () => {});
  
  // Миграция для таблиц тестов
  migrateTests();
}

// Миграция для таблиц тестов
function migrateTests() {
  // Создаем таблицы тестов, если их нет (через ALTER не работает для новых таблиц)
  // Они уже созданы в createTables, но на всякий случай проверяем
  db.run(`CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL CHECK (subject IN ('informatics', 'mathematics')),
    teacher_id INTEGER NOT NULL,
    video_id INTEGER,
    time_limit INTEGER,
    total_questions INTEGER DEFAULT 0,
    passing_score INTEGER,
    is_active INTEGER DEFAULT 1,
    is_main_test INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL
  )`, () => {});
  
  db.run(`CREATE TABLE IF NOT EXISTS test_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'text')),
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    question_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
  )`, () => {});
  
  db.run(`CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    answers TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    percentage REAL DEFAULT 0,
    passed INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(test_id, student_id)
  )`, () => {});
}

// Миграция для добавления поля subjects
function migrateSubjects() {
  db.run(`ALTER TABLE users ADD COLUMN subjects TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Поле уже существует или другая ошибка
      if (!err.message.includes('duplicate column')) {
        console.error('Миграция subjects қатесі:', err.message);
      }
    } else {
      console.log('Поле subjects қосылды');
      // НЕ устанавливаем subjects по умолчанию - ученик должен выбрать при регистрации
      // subjects остаются NULL до тех пор, пока ученик или админ не выберут предметы
    }
  });
}

module.exports = db;

