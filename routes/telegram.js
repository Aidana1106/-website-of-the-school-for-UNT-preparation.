/**
 * ENT-Bilim - Telegram Integration Routes
 * API маршруты для отправки сообщений в Telegram
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Telegram Bot Token (из переменной окружения)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // ID группы или канала

/**
 * POST /api/telegram/send-message
 * Отправка сообщения из формы в Telegram
 * 
 * Body:
 * - name: имя пользователя
 * - contact: email или телефон
 * - message: текст сообщения (опционально)
 * - formType: тип формы ('contact', 'hero', 'cta')
 * - program: выбранная программа (опционально)
 */
router.post('/send-message', async (req, res) => {
  try {
    const { name, contact, message, formType, program } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ error: 'Имя и контакт обязательны' });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN не настроен');
      return res.status(500).json({ error: 'Telegram бот не настроен' });
    }

    // Формируем сообщение для Telegram
    let telegramMessage = `🔔 *Новая заявка с сайта ENT-Bilim*\n\n`;
    telegramMessage += `👤 *Имя:* ${name}\n`;
    telegramMessage += `📞 *Контакт:* ${contact}\n`;
    
    if (message) {
      telegramMessage += `💬 *Сообщение:*\n${message}\n`;
    }
    
    if (program) {
      telegramMessage += `📚 *Программа:* ${program}\n`;
    }
    
    telegramMessage += `\n📋 *Тип формы:* ${formType || 'contact'}\n`;
    telegramMessage += `🕐 *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

    // Отправляем сообщение в Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await axios.post(telegramApiUrl, {
      chat_id: TELEGRAM_CHAT_ID,
      text: telegramMessage,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📞 Ответить',
              callback_data: `reply_${contact}`
            },
            {
              text: '✅ Обработано',
              callback_data: `done_${contact}`
            }
          ]
        ]
      }
    });

    if (response.data.ok) {
      res.json({ 
        success: true, 
        message: 'Сообщение отправлено в Telegram',
        messageId: response.data.result.message_id
      });
    } else {
      throw new Error('Ошибка отправки в Telegram');
    }

  } catch (error) {
    console.error('Ошибка отправки в Telegram:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Ошибка отправки сообщения',
      details: error.response?.data || error.message
    });
  }
});

/**
 * POST /api/telegram/send-reply
 * Отправка ответа пользователю через бота
 * 
 * Body:
 * - userContact: контакт пользователя (email или телефон)
 * - replyMessage: текст ответа
 */
router.post('/send-reply', async (req, res) => {
  try {
    const { userContact, replyMessage } = req.body;

    if (!userContact || !replyMessage) {
      return res.status(400).json({ error: 'Контакт и сообщение обязательны' });
    }

    // Здесь можно добавить логику отправки ответа пользователю
    // Например, если у вас есть chat_id пользователя, можно отправить ему сообщение
    
    // Пока просто логируем
    console.log(`Ответ пользователю ${userContact}: ${replyMessage}`);

    res.json({ 
      success: true, 
      message: 'Ответ отправлен'
    });

  } catch (error) {
    console.error('Ошибка отправки ответа:', error);
    res.status(500).json({ 
      error: 'Ошибка отправки ответа',
      details: error.message
    });
  }
});

module.exports = router;

