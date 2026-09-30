/**
 * Скрипт для диагностики и исправления проблемы с ЕНТ тестом
 * Запуск: node fix-ent-test.js
 */

const db = require('./config/database');

async function fixENTTest() {
  try {
    console.log('=== ДИАГНОСТИКА И ИСПРАВЛЕНИЕ ЕНТ ТЕСТА ===\n');
    
    // ШАГ 1: Проверить структуру таблицы
    console.log('ШАГ 1: Проверка структуры таблицы tests...');
    const tableInfo = await db.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='tests'",
      []
    );
    
    if (tableInfo.rows.length === 0) {
      console.log('❌ Таблица tests не найдена!');
      process.exit(1);
    }
    
    const sql = tableInfo.rows[0].sql;
    const supportsENT = sql.includes("'ent'");
    
    if (!supportsENT) {
      console.log('❌ Таблица НЕ поддерживает subject = "ent"');
      console.log('⚠️ Нужно выполнить миграцию!');
      console.log('\n📝 Выполняю миграцию...');
      
      // Выполнить миграцию
      await db.query(`
        CREATE TABLE IF NOT EXISTS tests_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          subject TEXT NOT NULL CHECK (subject IN ('informatics', 'mathematics', 'ent')),
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
        )
      `);
      
      await db.query(`
        INSERT INTO tests_new 
        SELECT * FROM tests
      `);
      
      await db.query('DROP TABLE tests');
      await db.query('ALTER TABLE tests_new RENAME TO tests');
      
      // Восстановить индексы
      await db.query('CREATE INDEX IF NOT EXISTS idx_tests_teacher ON tests(teacher_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_tests_main ON tests(is_main_test)');
      
      console.log('✅ Миграция выполнена успешно!');
    } else {
      console.log('✅ Таблица поддерживает subject = "ent"');
    }
    
    // ШАГ 2: Проверить существование теста
    console.log('\nШАГ 2: Проверка существования ЕНТ теста...');
    const existingTest = await db.query(
      "SELECT * FROM tests WHERE subject = 'ent'",
      []
    );
    
    if (existingTest.rows.length === 0) {
      console.log('❌ ЕНТ тест не найден!');
      console.log('📝 Создаю ЕНТ тест...');
      
      // Найти или создать учителя
      const teacherEmail = 'doshasoft@hotmail.com';
      let teacherResult = await db.query('SELECT id FROM users WHERE email = ?', [teacherEmail]);
      let teacherId;
      
      if (teacherResult.rows.length === 0) {
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash('123456', 10);
        const insertResult = await db.query(
          'INSERT INTO users (name, email, password_hash, role, approved) VALUES (?, ?, ?, ?, ?)',
          ['Асанали', teacherEmail, passwordHash, 'teacher', 1]
        );
        teacherId = insertResult.lastID;
        console.log(`✅ Создан учитель (ID: ${teacherId})`);
      } else {
        teacherId = teacherResult.rows[0].id;
        console.log(`✅ Найден учитель (ID: ${teacherId})`);
      }
      
      // Создать тест
      const testInsert = await db.query(
        `INSERT INTO tests (title, description, subject, teacher_id, time_limit, passing_score, is_main_test, total_questions, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ҰБТ-Ұлттық Біріңғай Тестілеу',
          'Толыққанды ЕНТ тест: математикалық сауаттылық, оқу сауаттылығы, Қазақстан тарихы, Математика, Информатика',
          'ent',
          teacherId,
          240,
          50,
          1,
          0,
          1
        ]
      );
      
      console.log(`✅ ЕНТ тест создан (ID: ${testInsert.lastID})`);
    } else {
      const test = existingTest.rows[0];
      console.log(`✅ ЕНТ тест найден (ID: ${test.id})`);
      console.log(`   Название: ${test.title}`);
      console.log(`   is_main_test: ${test.is_main_test}`);
      console.log(`   is_active: ${test.is_active}`);
      
      // Проверить и исправить параметры
      if (test.is_main_test !== 1 || test.is_active !== 1) {
        console.log('\n⚠️ Тест не настроен правильно! Исправляю...');
        await db.query(
          'UPDATE tests SET is_main_test = 1, is_active = 1 WHERE id = ?',
          [test.id]
        );
        console.log('✅ Параметры исправлены');
      }
    }
    
    // ШАГ 3: Проверить вопросы
    console.log('\nШАГ 3: Проверка вопросов...');
    const entTest = await db.query("SELECT id FROM tests WHERE subject = 'ent' LIMIT 1", []);
    if (entTest.rows.length > 0) {
      const questions = await db.query(
        'SELECT COUNT(*) as count FROM test_questions WHERE test_id = ?',
        [entTest.rows[0].id]
      );
      console.log(`   Вопросов в тесте: ${questions.rows[0].count}`);
      
      if (questions.rows[0].count === 0) {
        console.log('⚠️ В тесте нет вопросов. Запустите: node add-ent-questions.js');
      }
    }
    
    // ШАГ 4: Финальная проверка
    console.log('\nШАГ 4: Финальная проверка...');
    const finalCheck = await db.query(
      "SELECT id, title, subject, is_main_test, is_active, total_questions FROM tests WHERE subject = 'ent' AND is_main_test = 1 AND is_active = 1",
      []
    );
    
    if (finalCheck.rows.length > 0) {
      console.log('✅ ЕНТ тест готов и должен быть виден ученикам!');
      console.log(`   ID: ${finalCheck.rows[0].id}`);
      console.log(`   Название: ${finalCheck.rows[0].title}`);
      console.log(`   Вопросов: ${finalCheck.rows[0].total_questions}`);
    } else {
      console.log('❌ ЕНТ тест не проходит финальную проверку!');
    }
    
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('\n📝 Что дальше:');
    console.log('   1. Перезапустите сервер');
    console.log('   2. Обновите страницу в браузере (Ctrl+F5)');
    console.log('   3. ЕНТ тест должен появиться у всех учеников');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixENTTest();

