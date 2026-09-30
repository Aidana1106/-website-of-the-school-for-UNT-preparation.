/**
 * Скрипт для обновления названия и описания ЕНТ теста на казахский язык
 * Запуск: node update-ent-test-kz.js
 */

const db = require('./config/database');

async function updateENTTestKZ() {
  try {
    console.log('=== ОБНОВЛЕНИЕ ЕНТ ТЕСТА НА КАЗАХСКИЙ ЯЗЫК ===\n');
    
    // Найти ЕНТ тест
    const entTest = await db.query(
      "SELECT id, title, description FROM tests WHERE subject = 'ent' AND is_main_test = 1 LIMIT 1",
      []
    );
    
    if (entTest.rows.length === 0) {
      console.log('❌ ЕНТ тест не найден!');
      process.exit(1);
    }
    
    const test = entTest.rows[0];
    console.log(`📋 Найден тест (ID: ${test.id}):`);
    console.log(`   Текущее название: ${test.title}`);
    console.log(`   Текущее описание: ${test.description}`);
    
    // Обновить на казахский язык
    const newTitle = 'ҰБТ - Ұлттық Біріңғай Тестілеу';
    const newDescription = 'Толыққанды ҰБТ тесті: Математикалық сауаттылық, Оқу сауаттылығы, Қазақстан тарихы, Математика, Информатика';
    
    await db.query(
      'UPDATE tests SET title = ?, description = ? WHERE id = ?',
      [newTitle, newDescription, test.id]
    );
    
    console.log('\n✅ Тест обновлен на казахский язык:');
    console.log(`   Новое название: ${newTitle}`);
    console.log(`   Новое описание: ${newDescription}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateENTTestKZ();

