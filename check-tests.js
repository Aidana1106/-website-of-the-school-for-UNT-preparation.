/**
 * Скрипт для проверки тестов в базе данных
 * Запуск: node check-tests.js
 */

const db = require('./config/database');

async function checkTests() {
  try {
    console.log('=== ПРОВЕРКА БАЗЫ ДАННЫХ ===\n');
    
    // 0. Проверить структуру таблицы tests
    console.log('🔍 ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ:');
    const tableInfo = await db.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='tests'",
      []
    );
    if (tableInfo.rows.length > 0) {
      const sql = tableInfo.rows[0].sql;
      if (sql.includes("'ent'")) {
        console.log('✅ Таблица tests поддерживает subject = "ent"\n');
      } else {
        console.log('❌ Таблица tests НЕ поддерживает subject = "ent"');
        console.log('⚠️ Нужно запустить миграцию: node migrate-ent-subject.js\n');
      }
    }
    
    // 0.1. Проверить ЕНТ тест отдельно
    console.log('🎯 ПРОВЕРКА ЕНТ ТЕСТА:');
    try {
      const entTests = await db.query("SELECT * FROM tests WHERE subject = 'ent'", []);
      if (entTests.rows.length === 0) {
        console.log('❌ ЕНТ тест не найден!');
        console.log('   Запустите: node create-ent-test.js\n');
      } else {
        entTests.rows.forEach((test, index) => {
          console.log(`\n✅ ЕНТ тест найден (${index + 1}):`);
          console.log(`   ID: ${test.id}`);
          console.log(`   Название: ${test.title}`);
          console.log(`   Предмет: ${test.subject}`);
          console.log(`   Главный тест: ${test.is_main_test ? 'Да' : 'Нет'}`);
          console.log(`   Активен: ${test.is_active ? 'Да' : 'Нет'}`);
          console.log(`   Вопросов: ${test.total_questions}`);
          console.log(`   Время: ${test.time_limit} минут`);
        });
        console.log('');
      }
    } catch (error) {
      console.log(`❌ Ошибка при проверке ЕНТ теста: ${error.message}`);
      console.log('   Возможно, таблица не поддерживает subject = "ent"\n');
    }
    
    // 1. Проверить таблицу tests
    console.log('📋 ВСЕ ТЕСТЫ:');
    const tests = await db.query('SELECT * FROM tests ORDER BY id');
    console.log(`Всего тестов: ${tests.rows.length}`);
    
    if (tests.rows.length === 0) {
      console.log('❌ Тестов нет в базе данных!\n');
    } else {
      tests.rows.forEach((test, index) => {
        console.log(`\n${index + 1}. Тест ID: ${test.id}`);
        console.log(`   Название: ${test.title}`);
        console.log(`   Предмет: ${test.subject}`);
        console.log(`   Главный тест: ${test.is_main_test ? 'Да' : 'Нет'}`);
        console.log(`   Активен: ${test.is_active ? 'Да' : 'Нет'}`);
        console.log(`   Вопросов: ${test.total_questions}`);
        console.log(`   Учитель ID: ${test.teacher_id}`);
        console.log(`   Создан: ${test.created_at}`);
      });
    }
    
    // 2. Проверить таблицу test_questions
    console.log('\n\n❓ ВОПРОСЫ:');
    const questions = await db.query('SELECT * FROM test_questions ORDER BY test_id, question_order');
    console.log(`Всего вопросов: ${questions.rows.length}`);
    
    if (questions.rows.length === 0) {
      console.log('❌ Вопросов нет в базе данных!\n');
    } else {
      // Группируем по тестам
      const questionsByTest = {};
      questions.rows.forEach(q => {
        if (!questionsByTest[q.test_id]) {
          questionsByTest[q.test_id] = [];
        }
        questionsByTest[q.test_id].push(q);
      });
      
      Object.keys(questionsByTest).forEach(testId => {
        console.log(`\nТест ID ${testId} (${questionsByTest[testId].length} вопросов):`);
        questionsByTest[testId].forEach((q, idx) => {
          console.log(`  ${idx + 1}. ${q.question_text}`);
          console.log(`     Тип: ${q.question_type}`);
          console.log(`     Порядок: ${q.question_order}`);
        });
      });
    }
    
    // 3. Проверить таблицу test_results
    console.log('\n\n📊 РЕЗУЛЬТАТЫ:');
    const results = await db.query('SELECT * FROM test_results ORDER BY id');
    console.log(`Всего результатов: ${results.rows.length}`);
    if (results.rows.length > 0) {
      results.rows.forEach((r, index) => {
        console.log(`\n${index + 1}. Результат ID: ${r.id}`);
        console.log(`   Тест ID: ${r.test_id}`);
        console.log(`   Ученик ID: ${r.student_id}`);
        console.log(`   Баллы: ${r.score}/${r.total_score} (${r.percentage}%)`);
        console.log(`   Прошел: ${r.passed ? 'Да' : 'Нет'}`);
      });
    }
    
    // 4. Проверить учителей
    console.log('\n\n👨‍🏫 УЧИТЕЛЯ:');
    const teachers = await db.query('SELECT id, name, email, role FROM users WHERE role = ?', ['teacher']);
    console.log(`Всего учителей: ${teachers.rows.length}`);
    teachers.rows.forEach((t, index) => {
      console.log(`${index + 1}. ID: ${t.id}, Имя: ${t.name}, Email: ${t.email}`);
    });
    
    // 5. Проверить учеников и их subjects
    console.log('\n\n👨‍🎓 УЧЕНИКИ:');
    const students = await db.query('SELECT id, name, email, subjects FROM users WHERE role = ?', ['student']);
    console.log(`Всего учеников: ${students.rows.length}`);
    students.rows.forEach((s, index) => {
      console.log(`${index + 1}. ID: ${s.id}, Имя: ${s.name}`);
      console.log(`   Subjects: ${s.subjects || 'НЕ ВЫБРАНЫ'}`);
    });
    
    console.log('\n\n=== ИТОГИ ===');
    console.log(`✅ Тестов: ${tests.rows.length}`);
    console.log(`✅ Вопросов: ${questions.rows.length}`);
    console.log(`✅ Результатов: ${results.rows.length}`);
    console.log(`✅ Учителей: ${teachers.rows.length}`);
    console.log(`✅ Учеников: ${students.rows.length}`);
    
    if (tests.rows.length === 0) {
      console.log('\n⚠️ ВНИМАНИЕ: Тестов нет! Запустите create-test.bat для создания тестов.');
    }
    
    if (questions.rows.length === 0 && tests.rows.length > 0) {
      console.log('\n⚠️ ВНИМАНИЕ: У тестов нет вопросов!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkTests();






