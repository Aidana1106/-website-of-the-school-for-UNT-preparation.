/**
 * Скрипт для получения Chat ID Telegram группы или чата
 * 
 * Инструкция:
 * 1. Добавьте бота @ent_bilim_support_bot в группу (или начните с ним чат)
 * 2. Отправьте любое сообщение боту или в группу
 * 3. Запустите этот скрипт: node get-chat-id.js
 * 4. Скопируйте Chat ID и добавьте в .env файл
 */

const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env файле');
    process.exit(1);
}

async function getChatId() {
    try {
        console.log('🔍 Получение обновлений от Telegram бота...\n');
        
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        
        if (!response.data.ok) {
            throw new Error('Ошибка API Telegram');
        }
        
        const updates = response.data.result;
        
        if (updates.length === 0) {
            console.log('⚠️  Не найдено обновлений.');
            console.log('\n📝 Инструкция:');
            console.log('1. Откройте Telegram');
            console.log('2. Найдите бота: @ent_bilim_support_bot');
            console.log('3. Отправьте боту любое сообщение (например: /start)');
            console.log('4. Запустите этот скрипт снова\n');
            return;
        }
        
        console.log('✅ Найдено обновлений:', updates.length, '\n');
        
        // Получаем уникальные Chat ID
        const chatIds = new Map();
        
        updates.forEach((update, index) => {
            if (update.message) {
                const chat = update.message.chat;
                const chatId = chat.id;
                const chatType = chat.type; // 'private', 'group', 'supergroup', 'channel'
                const chatTitle = chat.title || chat.first_name || 'Личный чат';
                
                if (!chatIds.has(chatId)) {
                    chatIds.set(chatId, {
                        id: chatId,
                        type: chatType,
                        title: chatTitle,
                        username: chat.username || 'нет username'
                    });
                }
            }
        });
        
        if (chatIds.size === 0) {
            console.log('⚠️  Не найдено сообщений с Chat ID');
            return;
        }
        
        console.log('📋 Найденные Chat ID:\n');
        chatIds.forEach((chat, chatId) => {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Название: ${chat.title}`);
            console.log(`Тип: ${chat.type}`);
            console.log(`Chat ID: ${chatId}`);
            console.log(`Username: ${chat.username}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        });
        
        // Рекомендация
        const recommendedChat = Array.from(chatIds.values())[0];
        console.log('💡 Рекомендация:');
        console.log(`   Используйте Chat ID: ${recommendedChat.id}`);
        console.log(`   Добавьте в .env файл:`);
        console.log(`   TELEGRAM_CHAT_ID=${recommendedChat.id}\n`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('\n⚠️  Неверный токен бота. Проверьте TELEGRAM_BOT_TOKEN в .env файле');
        }
    }
}

getChatId();

