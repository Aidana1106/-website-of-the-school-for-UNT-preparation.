/**image.png
 * Простой скрипт для создания тестовых тестов
 * Запуск: node create-test-data.js
 */

 const db = require('./config/database');

async function createTestData() {
  try {
    console.log('=== СОЗДАНИЕ ТЕСТОВЫХ ТЕСТОВ ===\n');
    
    // 1. Найти или создать учителя
    let teacherResult = await db.query('SELECT id FROM users WHERE role = ? LIMIT 1', ['teacher']);
    let teacherId;
    
    if (teacherResult.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('teacher123', 10);
      const insertResult = await db.query(
        'INSERT INTO users (name, email, password_hash, role, approved) VALUES (?, ?, ?, ?, ?)',
        ['Тестовый учитель', 'teacher@test.com', passwordHash, 'teacher', 1]
      );
      teacherId = insertResult.lastID;
      console.log('✅ Создан учитель ID:', teacherId);
    } else {
      teacherId = teacherResult.rows[0].id;
      console.log('✅ Используется учитель ID:', teacherId);
    }
    
    // 2. Удалить все старые тестовые тесты
    console.log('\nОчистка старых тестов...');
    const oldTests = await db.query("SELECT id FROM tests WHERE title LIKE 'Тестовый%'");
    for (const test of oldTests.rows) {
      await db.query('DELETE FROM test_questions WHERE test_id = ?', [test.id]);
      await db.query('DELETE FROM test_results WHERE test_id = ?', [test.id]);
      await db.query('DELETE FROM tests WHERE id = ?', [test.id]);
    }
    console.log('✅ Старые тесты удалены');
    
    // 3. Создать простой тест по Математике
    console.log('\n📐 Создание теста по Математике...');
    const mathTest = await db.query(
      `INSERT INTO tests (title, description, subject, teacher_id, time_limit, passing_score, is_main_test, total_questions, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Тестовый главный тест по Математике', 'Простой тест по математике', 'mathematics', teacherId, 30, 60, 1, 2, 1]
    );
    const mathTestId = mathTest.lastID;
    
    // Вопросы для математики
    await db.query(
      `INSERT INTO test_questions (test_id, question_text, question_type, options, correct_answer, points, question_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [mathTestId, 'Сколько будет 2 + 2?', 'single_choice', '["3","4","5","6"]', '1', 1, 0]
    );
    await db.query(
      `INSERT INTO test_questions (test_id, question_text, question_type, options, correct_answer, points, question_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [mathTestId, 'Чему равно 5 × 3?', 'single_choice', '["10","15","20","25"]', '1', 1, 1]
    );
    console.log('✅ Тест по математике создан (ID:', mathTestId + ', 2 вопроса)');
    
    // 4. Создать простой тест по Информатике
    console.log('\n💻 Создание теста по Информатике...');
    const infoTest = await db.query(
      `INSERT INTO tests (title, description, subject, teacher_id, time_limit, passing_score, is_main_test, total_questions, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Тестовый главный тест по Информатике', 'Простой тест по информатике', 'informatics', teacherId, 30, 60, 1, 2, 1]
    );
    const infoTestId = infoTest.lastID;
    
    // Вопросы для информатики
    await db.query(
      `INSERT INTO test_questions (test_id, question_text, question_type, options, correct_answer, points, question_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [infoTestId, 'Сколько байт в килобайте?', 'single_choice', '["1000","1024","2048","4096"]', '1', 1, 0]
    );
    await db.query(
      `INSERT INTO test_questions (test_id, question_text, question_type, options, correct_answer, points, question_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [infoTestId, 'Что такое байт?', 'single_choice', '["4 бита","8 бит","16 бит","32 бита"]', '1', 1, 1]
    );
    console.log('✅ Тест по информатике создан (ID:', infoTestId + ', 2 вопроса)');
    
    // 5. Проверить созданные тесты
    console.log('\n=== ПРОВЕРКА ===');
    const allTests = await db.query('SELECT id, title, subject, total_questions FROM tests WHERE is_main_test = 1');
    console.log('Всего главных тестов:', allTests.rows.length);
    allTests.rows.forEach(test => {
      console.log(`  - ${test.title} (${test.subject}, ${test.total_questions} вопросов)`);
    });
    
    console.log('\n✅ ГОТОВО! Тесты созданы успешно.');
    console.log('\n📝 Что дальше:');
    console.log('   1. Убедитесь, что у ученика выбраны предметы в админ-панели');
    console.log('   2. Обновите страницу в браузере');
    console.log('   3. Тесты должны появиться на вкладке "Тесты"');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestData();
