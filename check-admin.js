const db = require('./config/database');

async function checkAdmin() {
  try {
    const result = await db.query('SELECT id, name, email, role FROM users WHERE role = ?', ['admin']);
    
    console.log('\n=== АДМИНЫ В БАЗЕ ДАННЫХ ===\n');
    
    if (result.rows.length === 0) {
      console.log('Админов нет!');
      console.log('\nДля создания админа запустите: node create-admin.js');
    } else {
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`  Имя: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

checkAdmin();

