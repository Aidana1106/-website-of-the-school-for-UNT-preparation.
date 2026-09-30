const db = require('./config/database');

async function migrateFullAdmin() {
    try {
        console.log('Миграция базы данных для полноценной админ-панели...');
        
        // Добавить поля в users
        try {
            await db.query('ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 1');
            console.log('✓ Добавлено поле approved в users');
        } catch (e) {
            if (!e.message.includes('duplicate column')) console.log('Поле approved уже существует');
        }
        
        try {
            await db.query('ALTER TABLE users ADD COLUMN paid INTEGER DEFAULT 0');
            console.log('✓ Добавлено поле paid в users');
        } catch (e) {
            if (!e.message.includes('duplicate column')) console.log('Поле paid уже существует');
        }
        
        // Добавить video_id в assignments
        try {
            await db.query('ALTER TABLE assignments ADD COLUMN video_id INTEGER');
            console.log('✓ Добавлено поле video_id в assignments');
        } catch (e) {
            if (!e.message.includes('duplicate column')) console.log('Поле video_id уже существует');
        }
        
        // Обновить существующих пользователей - админ уже одобрен
        await db.query('UPDATE users SET approved = 1 WHERE role = "admin"');
        
        console.log('Миграция завершена успешно!');
    } catch (error) {
        console.error('Миграция қатесі:', error);
    } finally {
        process.exit();
    }
}

migrateFullAdmin();



