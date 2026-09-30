const db = require('./config/database');

async function migrateENTSubject() {
  try {
    console.log('=== МИГРАЦИЯ: Добавление subject "ent" в таблицу tests ===\n');
    
    // Проверяем, существует ли уже 'ent' в таблице
    const testCheck = await db.query("SELECT COUNT(*) as count FROM tests WHERE subject = 'ent'");
    if (testCheck.rows[0].count > 0) {
      console.log('⚠️ В таблице уже есть тесты с subject = "ent"');
      console.log('Проверяем структуру таблицы...');
    }
    
    // Создаем новую таблицу с расширенным CHECK constraint
    console.log('📝 Создание новой таблицы tests с поддержкой "ent"...');
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
    
    // Копируем данные из старой таблицы
    console.log('📋 Копирование данных из старой таблицы...');
    await db.query(`
      INSERT INTO tests_new 
      SELECT * FROM tests
    `);
    
    // Удаляем старую таблицу
    console.log('🗑️ Удаление старой таблицы...');
    await db.query('DROP TABLE tests');
    
    // Переименовываем новую таблицу
    console.log('🔄 Переименование новой таблицы...');
    await db.query('ALTER TABLE tests_new RENAME TO tests');
    
    // Восстанавливаем индексы
    console.log('📊 Восстановление индексов...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_tests_teacher ON tests(teacher_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_tests_main ON tests(is_main_test)');
    
    console.log('\n✅ Миграция завершена успешно!');
    console.log('✅ Теперь можно создавать тесты с subject = "ent"');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateENTSubject();

