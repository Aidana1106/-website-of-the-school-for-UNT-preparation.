/**
 * Простой скрипт для просмотра данных из базы данных
 * Запуск: node view-db.js
 */

const db = require('./config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function showMenu() {
  console.log('\n=== ПРОСМОТР БАЗЫ ДАННЫХ ===\n');
  console.log('1. Показать всех пользователей');
  console.log('2. Показать все тесты');
  console.log('3. Показать все вопросы тестов');
  console.log('4. Показать результаты тестов');
  console.log('5. Показать видео-уроки');
  console.log('6. Показать задания');
  console.log('7. Выполнить свой SQL запрос');
  console.log('0. Выход\n');
  
  rl.question('Выберите действие (0-7): ', async (answer) => {
    switch(answer) {
      case '1':
        await showUsers();
        break;
      case '2':
        await showTests();
        break;
      case '3':
        await showQuestions();
        break;
      case '4':
        await showResults();
        break;
      case '5':
        await showVideos();
        break;
      case '6':
        await showAssignments();
        break;
      case '7':
        rl.question('Введите SQL запрос: ', async (sql) => {
          await executeSQL(sql);
        });
        return;
      case '0':
        console.log('Выход...');
        db.close();
        rl.close();
        process.exit(0);
        return;
      default:
        console.log('Неверный выбор!');
    }
    setTimeout(() => showMenu(), 1000);
  });
}

async function showUsers() {
  console.log('\n=== ПОЛЬЗОВАТЕЛИ ===\n');
  try {
    const result = await db.query('SELECT id, name, email, role, approved, paid, subjects FROM users ORDER BY id');
    if (result.rows.length === 0) {
      console.log('Пользователей нет');
    } else {
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`  Имя: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Роль: ${user.role}`);
        console.log(`  Одобрен: ${user.approved ? 'Да' : 'Нет'}`);
        console.log(`  Оплачено: ${user.paid ? 'Да' : 'Нет'}`);
        console.log(`  Предметы: ${user.subjects || 'Не выбраны'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function showTests() {
  console.log('\n=== ТЕСТЫ ===\n');
  try {
    const result = await db.query(`
      SELECT t.*, u.name as teacher_name 
      FROM tests t 
      LEFT JOIN users u ON t.teacher_id = u.id 
      ORDER BY t.id
    `);
    if (result.rows.length === 0) {
      console.log('Тестов нет');
    } else {
      result.rows.forEach(test => {
        console.log(`ID: ${test.id}`);
        console.log(`  Название: ${test.title}`);
        console.log(`  Описание: ${test.description || 'Нет'}`);
        console.log(`  Предмет: ${test.subject}`);
        console.log(`  Учитель: ${test.teacher_name} (ID: ${test.teacher_id})`);
        console.log(`  Время: ${test.time_limit} минут`);
        console.log(`  Вопросов: ${test.total_questions}`);
        console.log(`  Проходной балл: ${test.passing_score}%`);
        console.log(`  Главный тест: ${test.is_main_test ? 'Да' : 'Нет'}`);
        console.log(`  Активен: ${test.is_active ? 'Да' : 'Нет'}`);
        console.log(`  Создан: ${test.created_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function showQuestions() {
  console.log('\n=== ВОПРОСЫ ТЕСТОВ ===\n');
  try {
    const result = await db.query(`
      SELECT q.*, t.title as test_title 
      FROM test_questions q 
      LEFT JOIN tests t ON q.test_id = t.id 
      ORDER BY q.test_id, q.question_order
    `);
    if (result.rows.length === 0) {
      console.log('Вопросов нет');
    } else {
      result.rows.forEach(q => {
        console.log(`ID: ${q.id} | Тест: ${q.test_title} (ID: ${q.test_id})`);
        console.log(`  Вопрос: ${q.question_text}`);
        console.log(`  Тип: ${q.question_type}`);
        console.log(`  Варианты: ${q.options}`);
        console.log(`  Правильный ответ: ${q.correct_answer}`);
        console.log(`  Баллы: ${q.points}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function showResults() {
  console.log('\n=== РЕЗУЛЬТАТЫ ТЕСТОВ ===\n');
  try {
    const result = await db.query(`
      SELECT r.*, t.title as test_title, u.name as student_name 
      FROM test_results r 
      LEFT JOIN tests t ON r.test_id = t.id 
      LEFT JOIN users u ON r.student_id = u.id 
      ORDER BY r.id DESC
      LIMIT 20
    `);
    if (result.rows.length === 0) {
      console.log('Результатов нет');
    } else {
      result.rows.forEach(r => {
        console.log(`ID: ${r.id}`);
        console.log(`  Тест: ${r.test_title} (ID: ${r.test_id})`);
        console.log(`  Студент: ${r.student_name} (ID: ${r.student_id})`);
        console.log(`  Баллы: ${r.score}/${r.total_score} (${r.percentage}%)`);
        console.log(`  Прошел: ${r.passed ? 'Да' : 'Нет'}`);
        console.log(`  Время: ${r.time_spent} секунд`);
        console.log(`  Начало: ${r.started_at || 'Нет'}`);
        console.log(`  Завершен: ${r.completed_at || 'Нет'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function showVideos() {
  console.log('\n=== ВИДЕО-УРОКИ ===\n');
  try {
    const result = await db.query(`
      SELECT v.*, u.name as teacher_name 
      FROM videos v 
      LEFT JOIN users u ON v.teacher_id = u.id 
      ORDER BY v.id
    `);
    if (result.rows.length === 0) {
      console.log('Видео нет');
    } else {
      result.rows.forEach(v => {
        console.log(`ID: ${v.id}`);
        console.log(`  Название: ${v.title}`);
        console.log(`  Описание: ${v.description || 'Нет'}`);
        console.log(`  Предмет: ${v.subject}`);
        console.log(`  Учитель: ${v.teacher_name} (ID: ${v.teacher_id})`);
        console.log(`  YouTube: ${v.youtube_url}`);
        console.log(`  Создан: ${v.created_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function showAssignments() {
  console.log('\n=== ЗАДАНИЯ ===\n');
  try {
    const result = await db.query(`
      SELECT a.*, u.name as teacher_name 
      FROM assignments a 
      LEFT JOIN users u ON a.teacher_id = u.id 
      ORDER BY a.id
    `);
    if (result.rows.length === 0) {
      console.log('Заданий нет');
    } else {
      result.rows.forEach(a => {
        console.log(`ID: ${a.id}`);
        console.log(`  Название: ${a.title}`);
        console.log(`  Описание: ${a.description || 'Нет'}`);
        console.log(`  Предмет: ${a.subject}`);
        console.log(`  Учитель: ${a.teacher_name} (ID: ${a.teacher_id})`);
        console.log(`  Дедлайн: ${a.deadline || 'Нет'}`);
        console.log(`  Создан: ${a.created_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function executeSQL(sql) {
  console.log('\n=== РЕЗУЛЬТАТ SQL ЗАПРОСА ===\n');
  try {
    const result = await db.query(sql);
    if (result.rows.length === 0) {
      console.log('Запрос выполнен, но данных нет');
      if (result.lastID) {
        console.log(`Последний ID: ${result.lastID}`);
      }
      if (result.changes !== undefined) {
        console.log(`Изменено строк: ${result.changes}`);
      }
    } else {
      console.log(JSON.stringify(result.rows, null, 2));
    }
  } catch (error) {
    console.error('Ошибка SQL:', error.message);
  }
}

// Запуск
showMenu();

