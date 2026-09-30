/**
 * Тестовый скрипт для проверки отправки сообщения в Telegram
 */

const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function testTelegram() {
    try {
        console.log('🧪 Тестирование отправки сообщения в Telegram...\n');
        
        if (!BOT_TOKEN) {
            console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env');
            return;
        }
        
        if (!CHAT_ID) {
            console.error('❌ TELEGRAM_CHAT_ID не найден в .env');
            return;
        }
        
        console.log('✅ Токен бота:', BOT_TOKEN.substring(0, 20) + '...');
        console.log('✅ Chat ID:', CHAT_ID);
        console.log('\n📤 Отправка тестового сообщения...\n');
        
        const message = `🧪 *Тестовое сообщение*\n\nЭто тестовое сообщение для проверки интеграции Telegram бота.\n\nЕсли вы видите это сообщение, значит всё настроено правильно! ✅`;
        
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await axios.post(url, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        
        if (response.data.ok) {
            console.log('✅ Сообщение успешно отправлено!');
            console.log('📱 Проверьте вашу Telegram группу "Ent-bilim"');
            console.log('\n🎉 Интеграция работает! Теперь все заявки с сайта будут приходить в Telegram.\n');
        } else {
            console.error('❌ Ошибка отправки:', response.data);
        }
        
    } catch (error) {
        console.error('\n❌ ОШИБКА:\n');
        
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Ответ:', JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 400) {
                console.error('\n⚠️  Возможные причины:');
                console.error('   - Неверный Chat ID');
                console.error('   - Бот не добавлен в группу');
                console.error('   - Неверный формат сообщения');
            } else if (error.response.status === 401) {
                console.error('\n⚠️  Неверный токен бота!');
            } else if (error.response.status === 403) {
                console.error('\n⚠️  Бот заблокирован или не имеет доступа к группе!');
                console.error('   Убедитесь, что бот добавлен в группу и не заблокирован.');
            }
        } else {
            console.error('Ошибка:', error.message);
        }
    }
}

testTelegram();

