/**
 * Скрипт для просмотра содержимого базы данных SQLite
 * Показывает все таблицы и их содержимое
 */

const db = require('./config/database');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function viewDatabase() {
    try {
        console.log('=== Просмотр базы данных ENT-Bilim ===\n');
        
        // Получить список всех таблиц
        const tablesResult = await db.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );
        
        const tables = tablesResult.rows.map(row => row.name);
        console.log('Найденные таблицы:', tables.join(', '), '\n');
        
        // Показать содержимое каждой таблицы
        for (const table of tables) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`ТАБЛИЦА: ${table.toUpperCase()}`);
            console.log('='.repeat(50));
            
            // Получить структуру таблицы
            const structureResult = await db.query(`PRAGMA table_info(${table})`);
            const columns = structureResult.rows.map(col => col.name);
            console.log('Колонки:', columns.join(', '));
            
            // Получить количество записей
            const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
            const count = countResult.rows[0].count;
            console.log(`Количество записей: ${count}\n`);
            
            if (count > 0) {
                // Получить все данные (ограничим до 100 записей для больших таблиц)
                const limit = count > 100 ? 100 : count;
                const dataResult = await db.query(`SELECT * FROM ${table} LIMIT ${limit}`);
                
                if (dataResult.rows.length > 0) {
                    console.log('Данные:');
                    console.log(JSON.stringify(dataResult.rows, null, 2));
                    
                    if (count > 100) {
                        console.log(`\n... и еще ${count - 100} записей (показаны первые 100)`);
                    }
                }
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('Просмотр завершен');
        
    } catch (error) {
        console.error('Ошибка при просмотре базы данных:', error);
    } finally {
        process.exit();
    }
}

viewDatabase();

