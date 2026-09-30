/**
 * Скрипт для экспорта базы данных в JSON файл
 * Создает файл database-export.json со всеми данными
 */

const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function exportDatabase() {
    try {
        console.log('=== Экспорт базы данных ENT-Bilim ===\n');
        
        const exportData = {
            exportDate: new Date().toISOString(),
            tables: {}
        };
        
        // Получить список всех таблиц
        const tablesResult = await db.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );
        
        const tables = tablesResult.rows.map(row => row.name);
        console.log('Найдено таблиц:', tables.length);
        
        // Экспортировать каждую таблицу
        for (const table of tables) {
            console.log(`Экспорт таблицы: ${table}...`);
            const dataResult = await db.query(`SELECT * FROM ${table}`);
            exportData.tables[table] = dataResult.rows;
            console.log(`  - Экспортировано записей: ${dataResult.rows.length}`);
        }
        
        // Сохранить в JSON файл
        const exportPath = path.join(__dirname, 'database-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
        
        console.log(`\n✓ Экспорт завершен!`);
        console.log(`Файл сохранен: ${exportPath}`);
        console.log(`Размер файла: ${(fs.statSync(exportPath).size / 1024).toFixed(2)} KB`);
        
    } catch (error) {
        console.error('Ошибка при экспорте базы данных:', error);
    } finally {
        process.exit();
    }
}

exportDatabase();

