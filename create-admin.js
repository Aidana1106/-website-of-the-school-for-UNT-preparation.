const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        // Проверяем, есть ли админ
        const adminCheck = await db.query('SELECT id FROM users WHERE email = ?', ['alabastaflow@gmail.com']);
        
        if (adminCheck.rows.length > 0) {
            console.log('Админ аккаунт бар');
            return;
        }
        
        // Создаем админа
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['Администратор', 'alabastaflow@gmail.com', passwordHash, 'admin']
        );
        
        console.log('Админ аккаунт құрылды:');
        console.log('Email: alabastaflow@gmail.com');
        console.log('Пароль: admin123');
    } catch (error) {
        console.error('Қате:', error);
    } finally {
        process.exit();
    }
}

createAdmin();



