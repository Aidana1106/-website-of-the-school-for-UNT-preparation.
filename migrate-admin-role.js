const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function migrateAdminRole() {
    try {
        console.log('Миграция базы данных для поддержки роли admin...');
        
        // Создаем временную таблицу с новым CHECK constraint
        await db.query(`
            CREATE TABLE IF NOT EXISTS users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
                avatar_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Копируем данные из старой таблицы
        await db.query(`
            INSERT INTO users_new (id, name, email, password_hash, role, avatar_url, created_at)
            SELECT id, name, email, password_hash, role, avatar_url, created_at
            FROM users
        `);
        
        // Удаляем старую таблицу
        await db.query('DROP TABLE users');
        
        // Переименовываем новую таблицу
        await db.query('ALTER TABLE users_new RENAME TO users');
        
        console.log('Миграция завершена успешно!');
        
        // Проверяем, есть ли админ
        const adminCheck = await db.query('SELECT id FROM users WHERE email = ?', ['alabastaflow@gmail.com']);
        
        if (adminCheck.rows.length > 0) {
            console.log('Админ аккаунт уже существует');
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
        console.error('Миграция қатесі:', error);
    } finally {
        process.exit();
    }
}

migrateAdminRole();



