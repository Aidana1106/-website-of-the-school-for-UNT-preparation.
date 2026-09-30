/**
 * Скрипт для удаления всех тестов из базы данных
 * Запуск: node delete-tests.js
 */

const db = require('./config/database');

async function deleteTests() {
  try {
    console.log('=== УДАЛЕНИЕ ТЕСТОВ ===\n');
    
    // 1. Удалить все результаты
    const results = await db.query('SELECT COUNT(*) as count FROM test_results');
    const resultsCount = results.rows[0].count;
    await db.query('DELETE FROM test_results');
    console.log(`✅ Удалено результатов: ${resultsCount}`);
    
    // 2. Удалить все вопросы
    const questions = await db.query('SELECT COUNT(*) as count FROM test_questions');
    const questionsCount = questions.rows[0].count;
    await db.query('DELETE FROM test_questions');
    console.log(`✅ Удалено вопросов: ${questionsCount}`);
    
    // 3. Удалить все тесты
    const tests = await db.query('SELECT COUNT(*) as count FROM tests');
    const testsCount = tests.rows[0].count;
    await db.query('DELETE FROM tests');
    console.log(`✅ Удалено тестов: ${testsCount}`);
    
    console.log('\n✅ Все тесты успешно удалены из базы данных!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deleteTests();






