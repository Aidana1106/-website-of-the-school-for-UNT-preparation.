/**
 * Скрипт для проверки ЕНТ теста
 * Запуск: node check-ent-test.js
 */

const db = require('./config/database');

async function checkENTTest() {
  try {
    console.log('=== ПРОВЕРКА ЕНТ ТЕСТА ===\n');
    
    // Проверить структуру таблицы
    console.log('1. Проверка структуры таблицы tests...');
    const tableInfo = await db.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='tests'",
      []
    );
    
    if (tableInfo.rows.length > 0) {
      const sql = tableInfo.rows[0].sql;
      if (sql.includes("'ent'")) {
        console.log('   ✅ Таблица tests поддерживает subject = "ent"');
      } else {
        console.log('   ❌ Таблица tests НЕ поддерживает subject = "ent"');
        console.log('   ⚠️ Нужно запустить миграцию: node migrate-ent-subject.js');
      }
    }
    
    // Проверить, существует ли тест
    console.log('\n2. Поиск ЕНТ теста...');
    const entTest = await db.query(
      "SELECT * FROM tests WHERE subject = 'ent'",
      []
    );
    
    if (entTest.rows.length === 0) {
      console.log('   ❌ ЕНТ тест не найден!');
      console.log('\n   📝 Что нужно сделать:');
      console.log('      1. Запустите миграцию: node migrate-ent-subject.js');
      console.log('      2. Создайте тест: node create-ent-test.js');
      console.log('      3. Добавьте вопросы: node add-ent-questions.js');
      
      // Проверить все тесты
      const allTests = await db.query('SELECT id, title, subject, is_main_test, is_active FROM tests LIMIT 10', []);
      console.log('\n   📋 Последние 10 тестов в базе:');
      allTests.rows.forEach(t => {
        console.log(`      - ID: ${t.id}, "${t.title}", subject: ${t.subject}, main: ${t.is_main_test}, active: ${t.is_active}`);
      });
      
      process.exit(1);
    }
    
    const test = entTest.rows[0];
    console.log('   ✅ ЕНТ тест найден:');
    console.log(`      ID: ${test.id}`);
    console.log(`      Название: ${test.title}`);
    console.log(`      Предмет: ${test.subject}`);
    console.log(`      Время: ${test.time_limit} минут`);
    console.log(`      Проходной балл: ${test.passing_score}%`);
    console.log(`      Главный тест: ${test.is_main_test ? 'Да' : 'Нет'}`);
    console.log(`      Активен: ${test.is_active ? 'Да' : 'Нет'}`);
    console.log(`      Вопросов в тесте: ${test.total_questions}`);
    
    // Проверить вопросы
    console.log('\n3. Проверка вопросов...');
    const questions = await db.query(
      'SELECT COUNT(*) as count FROM test_questions WHERE test_id = ?',
      [test.id]
    );
    
    console.log(`   Вопросов в базе: ${questions.rows[0].count}`);
    
    if (questions.rows[0].count === 0) {
      console.log('   ⚠️ В тесте нет вопросов!');
      console.log('   Запустите: node add-ent-questions.js');
    } else {
      console.log('   ✅ Вопросы добавлены');
    }
    
    // Проверить, что тест будет виден ученику
    console.log('\n4. Проверка видимости для учеников...');
    if (test.is_main_test === 1 && test.is_active === 1) {
      console.log('   ✅ Тест должен быть виден ученикам (is_main_test=1, is_active=1)');
    } else {
      console.log('   ⚠️ Тест может быть не виден ученикам!');
      console.log(`      is_main_test: ${test.is_main_test}, is_active: ${test.is_active}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkENTTest();
