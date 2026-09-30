/**
 * Скрипт для создания главного ЕНТ теста
 * Email учителя: doshasoft@hotmail.com
 * Запуск: node create-ent-test.js
 */

const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function createENTTest() {
  try {
    console.log('=== СОЗДАНИЕ ГЛАВНОГО ЕНТ ТЕСТА ===\n');
    
    const teacherEmail = 'doshasoft@hotmail.com';
    const teacherPassword = '123456';
    const teacherName = 'Асанали';
    
    // 1. Найти или создать учителя
    let teacherResult = await db.query('SELECT id FROM users WHERE email = ?', [teacherEmail]);
    let teacherId;
    
    if (teacherResult.rows.length === 0) {
      const passwordHash = await bcrypt.hash(teacherPassword, 10);
      const insertResult = await db.query(
        'INSERT INTO users (name, email, password_hash, role, approved) VALUES (?, ?, ?, ?, ?)',
        [teacherName, teacherEmail, passwordHash, 'teacher', 1]
      );
      teacherId = insertResult.lastID;
      console.log(`✅ Создан учитель: ${teacherName} (ID: ${teacherId})`);
    } else {
      teacherId = teacherResult.rows[0].id;
      console.log(`✅ Найден учитель: ${teacherName} (ID: ${teacherId})`);
    }
    
    // 2. Проверить, существует ли уже ЕНТ тест
    const existingTest = await db.query(
      'SELECT id FROM tests WHERE subject = ? AND is_main_test = 1',
      ['ent']
    );
    
    if (existingTest.rows.length > 0) {
      console.log(`⚠️ ЕНТ тест уже существует (ID: ${existingTest.rows[0].id})`);
      console.log('Удалите старый тест или обновите его вручную.');
      process.exit(0);
    }
    
    // 3. Создать ЕНТ тест
    console.log('\n📝 Создание главного ЕНТ теста...');
    
    const testInsert = await db.query(
      `INSERT INTO tests (title, description, subject, teacher_id, time_limit, passing_score, is_main_test, total_questions, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'ҰБТ - Ұлттық Біріңғай Тестілеу',
        'Толыққанды ҰБТ тесті: Математикалық сауаттылық, Оқу сауаттылығы, Қазақстан тарихы, Математика, Информатика',
        'ent',
        teacherId,
        240, // 4 часа (240 минут)
        50,  // 50% проходной балл
        1,   // Главный тест
        0,   // Вопросов пока нет (добавите позже)
        1    // Активен
      ]
    );
    
    const testId = testInsert.lastID;
    console.log(`✅ ЕНТ тест создан (ID: ${testId})`);
    console.log(`\n📋 Параметры теста:`);
    console.log(`   - Название: ҰБТ-Ұлттық Біріңғай Тестілеу`);
    console.log(`   - Время: 240 минут (4 часа)`);
    console.log(`   - Проходной балл: 50%`);
    console.log(`   - Вопросов: 0 (добавьте позже)`);
    
    console.log('\n✅ ГОТОВО! ЕНТ тест создан.');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Добавьте вопросы через скрипт или админ-панель');
    console.log('   2. Обновите total_questions после добавления вопросов');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createENTTest();

