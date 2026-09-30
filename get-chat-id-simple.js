/**
 * ПРОСТОЙ способ получить Chat ID
 * 
 * ИНСТРУКЦИЯ:
 * 1. Отправьте ЛЮБОЕ сообщение в группу (где добавлен бот @ent_bilim_support_bot)
 * 2. Запустите: node get-chat-id-simple.js
 * 3. Скопируйте Chat ID из вывода
 */

const axios = require('axios');

// Токен вашего бота
const BOT_TOKEN = '8268785420:AAHulwutqa9iwQRSPw5zohsT3IUcJmOZKi0';

async function getChatId() {
    try {
        console.log('🔍 Получение Chat ID...\n');
        console.log('Убедитесь, что вы отправили сообщение в группу!\n');
        
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
        console.log('Запрос к:', url.replace(BOT_TOKEN, 'TOKEN_HIDDEN'));
        
        const response = await axios.get(url, {
            timeout: 10000
        });
        
        if (!response.data.ok) {
            console.error('❌ Ошибка API:', response.data);
            return;
        }
        
        const updates = response.data.result;
        
        if (updates.length === 0) {
            console.log('⚠️  НЕ НАЙДЕНО ОБНОВЛЕНИЙ!\n');
            console.log('📝 Что делать:');
            console.log('1. Откройте Telegram');
            console.log('2. Откройте группу "Ent-bilim" (где добавлен бот)');
            console.log('3. Отправьте ЛЮБОЕ сообщение в группу (например: "тест")');
            console.log('4. Подождите 2-3 секунды');
            console.log('5. Запустите этот скрипт снова: node get-chat-id-simple.js\n');
            return;
        }
        
        console.log(`✅ Найдено обновлений: ${updates.length}\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Ищем последнее сообщение из группы
        let foundChat = null;
        
        for (let i = updates.length - 1; i >= 0; i--) {
            const update = updates[i];
            if (update.message && update.message.chat) {
                const chat = update.message.chat;
                
                // Показываем информацию о чате
                console.log(`\n📱 Чат найден:`);
                console.log(`   Название: ${chat.title || chat.first_name || 'Личный чат'}`);
                console.log(`   Тип: ${chat.type}`);
                console.log(`   Chat ID: ${chat.id}`);
                
                if (chat.type === 'group' || chat.type === 'supergroup') {
                    foundChat = chat;
                    console.log(`\n✅ ЭТО ГРУППА - используйте этот Chat ID!`);
                    break;
                }
            }
        }
        
        if (!foundChat) {
            // Показываем все найденные чаты
            console.log('\n📋 Все найденные чаты:');
            const chatIds = new Map();
            
            updates.forEach(update => {
                if (update.message && update.message.chat) {
                    const chat = update.message.chat;
                    if (!chatIds.has(chat.id)) {
                        chatIds.set(chat.id, chat);
                    }
                }
            });
            
            chatIds.forEach((chat, id) => {
                console.log(`\n   Chat ID: ${id}`);
                console.log(`   Название: ${chat.title || chat.first_name || 'Личный чат'}`);
                console.log(`   Тип: ${chat.type}`);
            });
            
            console.log('\n💡 Если вы используете группу, убедитесь что:');
            console.log('   - Бот добавлен в группу');
            console.log('   - Вы отправили сообщение В ГРУППУ (не боту лично)');
        } else {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n🎯 ВАШ Chat ID:');
            console.log(`   ${foundChat.id}`);
            console.log('\n📝 Добавьте в файл .env:');
            console.log(`   TELEGRAM_CHAT_ID=${foundChat.id}`);
            console.log('\n✅ Готово! Теперь перезапустите сервер: npm start\n');
        }
        
    } catch (error) {
        console.error('\n❌ ОШИБКА:\n');
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.error('   Проблема с интернет-соединением');
            console.error('   Проверьте подключение к интернету\n');
        } else if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ:', error.response.data);
            
            if (error.response.status === 401) {
                console.error('\n   ⚠️  Неверный токен бота!');
            } else if (error.response.status === 404) {
                console.error('\n   ⚠️  Бот не найден! Проверьте токен.');
            }
        } else {
            console.error('   ', error.message);
        }
        
        console.error('\n');
    }
}

getChatId();

