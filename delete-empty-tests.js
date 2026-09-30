/**
 * Скрипт для удаления тестов без вопросов
 * Запуск: node delete-empty-tests.js
 */

const db = require('./config/database');

async function deleteEmptyTests() {
  try {
    console.log('=== УДАЛЕНИЕ ТЕСТОВ БЕЗ ВОПРОСОВ ===\n');
    
    // 1. Найти все тесты
    const allTests = await db.query(
      `SELECT t.id, t.title, t.subject, t.is_main_test, t.total_questions,
              COUNT(tq.id) as actual_questions_count
       FROM tests t
       LEFT JOIN test_questions tq ON t.id = tq.test_id
       GROUP BY t.id
       ORDER BY t.id`,
      []
    );
    
    console.log(`📊 Всего тестов в базе: ${allTests.rows.length}\n`);
    
    // 2. Найти тесты без вопросов (проверяем только actual_questions_count)
    const emptyTests = allTests.rows.filter(test => {
      const actualCount = test.actual_questions_count || 0;
      // Удаляем тесты, у которых реально нет вопросов в базе
      return actualCount === 0;
    });
    
    if (emptyTests.length === 0) {
      console.log('✅ Тестов без вопросов не найдено.');
      process.exit(0);
    }
    
    console.log(`⚠️ Найдено тестов без вопросов: ${emptyTests.length}\n`);
    console.log('Список тестов для удаления:');
    emptyTests.forEach((test, index) => {
      const actualCount = test.actual_questions_count || 0;
      const totalQuestions = test.total_questions || 0;
      console.log(`   ${index + 1}. ID: ${test.id}, Название: "${test.title}", Предмет: ${test.subject}, Главный: ${test.is_main_test}`);
      console.log(`      Вопросов в БД: ${actualCount}, total_questions: ${totalQuestions}`);
    });
    
    console.log('\n🗑️ Удаление тестов...\n');
    
    // 3. Удалить тесты без вопросов
    let deletedCount = 0;
    for (const test of emptyTests) {
      try {
        // Сначала удалить связанные записи (если есть)
        await db.query('DELETE FROM test_results WHERE test_id = ?', [test.id]);
        await db.query('DELETE FROM test_questions WHERE test_id = ?', [test.id]);
        
        // Затем удалить сам тест
        await db.query('DELETE FROM tests WHERE id = ?', [test.id]);
        
        console.log(`✅ Удален тест ID: ${test.id} - "${test.title}"`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Ошибка при удалении теста ID ${test.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ ГОТОВО! Удалено тестов: ${deletedCount}`);
    
    // 4. Показать оставшиеся тесты
    const remainingTests = await db.query(
      `SELECT t.id, t.title, t.subject, t.is_main_test, t.total_questions,
              COUNT(tq.id) as actual_questions_count
       FROM tests t
       LEFT JOIN test_questions tq ON t.id = tq.test_id
       GROUP BY t.id
       ORDER BY t.id`,
      []
    );
    
    console.log(`\n📊 Оставшихся тестов: ${remainingTests.rows.length}`);
    console.log('\nСписок оставшихся тестов:');
    remainingTests.rows.forEach((test, index) => {
      const actualCount = test.actual_questions_count || 0;
      const totalQuestions = test.total_questions || 0;
      console.log(`   ${index + 1}. ID: ${test.id}, "${test.title}" (${test.subject}), Вопросов: ${actualCount}/${totalQuestions}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deleteEmptyTests();

