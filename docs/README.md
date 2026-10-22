# ENT-Bilim — Онлайн-платформа для подготовки к ЕНТ

![ENT-Bilim](https://img.shields.io/badge/ENT--Bilim-Online%20Platform-6366f1?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-8b5cf6?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge)

**ENT-Bilim** — современная онлайн-платформа для подготовки к ЕНТ (Единому Национальному Тестированию) по всему Казахстану.

🌐 **Двуязычный сайт**: Русский 🇷🇺 | Казахский 🇰🇿

---

## 📋 Содержание

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Технологии](#технологии)
- [Структура проекта](#структура-проекта)
- [Установка и запуск](#установка-и-запуск)
- [Секции сайта](#секции-сайта)
- [Настройка](#настройка)
- [Интеграция с Backend](#интеграция-с-backend)
- [Адаптивность](#адаптивность)
- [SEO](#seo)
- [Браузерная поддержка](#браузерная-поддержка)

---

## 🎯 О проекте

ENT-Bilim — это полноценный лендинг для платформы онлайн-подготовки к ЕНТ, созданный по аналогии с современными образовательными платформами (референс: GeekBrains.kz).

### Цели проекта:
- Предоставить удобный интерфейс для ознакомления с курсами подготовки к ЕНТ
- Обеспечить двуязычную поддержку (русский/казахский)
- Создать доверительную атмосферу через отзывы и статистику
- Упростить процесс записи на курсы через формы обратной связи

---

## ✨ Возможности

### 🌍 Многоязычность
- Переключение между русским и казахским языками в один клик
- Автоматический перевод всего контента
- Сохранение выбранного языка

### 🎨 Современный дизайн
- Профессиональные градиенты и анимации
- Плавные переходы между секциями
- Адаптивный дизайн для всех устройств (320px - 1920px)
- Использование современных UI/UX практик

### 📱 Адаптивность
- **Mobile First** подход
- Оптимизация для смартфонов (320px+)
- Планшеты (768px+)
- Десктоп (1024px+)
- Большие экраны (1440px+)

### 🎭 Интерактивность
- Анимация при скролле (AOS)
- Слайдер отзывов (Swiper)
- Анимированные счетчики статистики
- Валидация форм
- Маска для ввода телефона
- Плавная прокрутка к секциям

### 📝 Формы
- Форма в Hero-секции
- Форма консультации в CTA-секции
- Валидация полей
- Автоматическая маска телефона (+7)
- Уведомления об успешной отправке

---

## 🛠 Технологии

### Frontend
- **HTML5** — семантическая разметка
- **CSS3** — современные стили, Grid, Flexbox, анимации
- **JavaScript (ES6+)** — интерактивность и функциональность

### Библиотеки
- **[AOS](https://michalsnik.github.io/aos/)** 2.3.1 — анимация при скролле
- **[Swiper](https://swiperjs.com/)** 11.x — слайдер отзывов
- **[Google Fonts](https://fonts.google.com/)** — шрифт Inter

### Рекомендуемый Backend (опционально)
- **Node.js** + Express
- **PHP** + Laravel/Slim
- **Python** + Flask/FastAPI
- Интеграция с:
  - Email сервисами (SendGrid, Mailgun)
  - CRM системами
  - Базами данных (MySQL, PostgreSQL, MongoDB)

---

## 📁 Структура проекта

```
пробный/
│
├── index.html              # Главная страница
│
├── css/
│   └── style.css           # Основные стили (все в одном файле)
│
├── js/
│   ├── script.js           # Основной JavaScript
│   └── translations.js     # Файл переводов (RU/KZ)
│
├── images/                 # Папка для изображений (создать вручную)
│   ├── hero/
│   ├── programs/
│   ├── testimonials/
│   └── logos/
│
└── README.md               # Документация проекта
```

---

## 🚀 Установка и запуск

### Вариант 1: Простой запуск (статика)

1. **Скачайте проект**
   ```bash
   # Клонируйте репозиторий или скачайте ZIP
   ```

2. **Откройте файл**
   - Откройте `index.html` напрямую в браузере
   - Или используйте Live Server в VS Code

### Вариант 2: С локальным сервером

#### Используя Python:
```bash
# Python 3
python -m http.server 8000

# Откройте: http://localhost:8000
```

#### Используя Node.js:
```bash
# Установите http-server глобально
npm install -g http-server

# Запустите сервер
http-server -p 8000

# Откройте: http://localhost:8000
```

#### Используя PHP:
```bash
php -S localhost:8000

# Откройте: http://localhost:8000
```

### Вариант 3: VS Code Live Server

1. Установите расширение **Live Server**
2. Кликните правой кнопкой на `index.html`
3. Выберите **"Open with Live Server"**

---

## 📄 Секции сайта

### 1️⃣ Header (Шапка)
- Логотип ENT-Bilim
- Навигационное меню
- Переключатель языков (RU/KZ)
- Мобильное меню (бургер)

### 2️⃣ Hero Section (Герой-блок)
- Заголовок и подзаголовок
- Промо-баннер (скидки)
- CTA-кнопки
- Форма записи
- Статистика (ученики, успешность, прирост баллов)

### 3️⃣ Programs (Программы)
- Карточки курсов:
  - Полная подготовка к ЕНТ
  - Ускоренный курс
  - Математика и История Казахстана

### 4️⃣ Testimonials (Отзывы)
- Слайдер с отзывами учеников
- Фото, имена, университеты
- Баллы ЕНТ
- Рейтинг (звезды)

### 6️⃣ Advantages (Преимущества)
- Поддержка и наставники
- Дистанционное обучение
- Результаты
- Статистика в цифрах

### 7️⃣ Why ENT? (Почему ЕНТ?)
- Мотивационная секция
- Грантовое образование
- Престижные вузы
- Будущая карьера

### 8️⃣ Test (Профориентация)
- Предложение пройти тест
- Яркий призыв к действию

### 9️⃣ Universities (Партнеры)
- Логотипы университетов
- КазНУ, КБТУ, ЕНУ, КазНМУ и др.

### 🔟 CTA Section (Призыв к действию)
- Финальное предложение
- Форма консультации
- Перечень преимуществ

### 1️⃣1️⃣ Footer (Подвал)
- О нас
- Курсы
- Контакты
- Социальные сети
- Копирайт

### ➕ Дополнительно
- Кнопка "Scroll to Top"
- Уведомления (notifications)

---

## ⚙️ Настройка

### Добавление изображений

В HTML файле есть комментарии с метками, куда нужно вставить изображения:

```html
<!-- [PHOTO_1_HERO] — hero banner photo background -->
<!-- [PHOTO_2_PROGRAMS_1] — image for full preparation program -->
<!-- [PHOTO_4_TESTIMONIAL_1] — student photo -->
<!-- [LOGO_PLACEHOLDERS] — University logos -->
```

#### Пример добавления изображения:
```html
<!-- ДО -->
<div class="hero-image-placeholder">
    <span class="image-icon">👨‍🎓👩‍🎓</span>
</div>

<!-- ПОСЛЕ -->
<div class="hero-image-wrapper">
    <img src="images/hero/student.jpg" alt="Студент готовится к ЕНТ">
</div>
```

### Изменение цветов

В файле `css/style.css` найдите секцию `:root` и измените переменные:

```css
:root {
    --primary-color: #6366f1;      /* Основной цвет */
    --secondary-color: #8b5cf6;    /* Вторичный цвет */
    --accent-color: #ec4899;       /* Акцентный цвет */
    /* ... */
}
```

### Добавление нового языка

1. Откройте `js/translations.js`
2. Добавьте новый объект языка:

```javascript
const translations = {
    ru: { /* ... */ },
    kz: { /* ... */ },
    en: {  // Новый язык
        hero_title: "Prepare for UNT online...",
        // ...
    }
};
```

3. Добавьте кнопку в header:

```html
<button class="lang-btn" data-lang="en">EN</button>
```

---

## 🔌 Интеграция с Backend

### Обработка форм

В файле `js/script.js` найдите функцию `handleFormSubmit`:

```javascript
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    
    // Замените этот блок на реальный API запрос
    fetch('/api/submit-form', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Спасибо! Мы свяжемся с вами.', 'success');
    })
    .catch(error => {
        showNotification('Ошибка отправки', 'error');
    });
}
```

### Пример Node.js Backend (Express)

```javascript
const express = require('express');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/submit-form', async (req, res) => {
    const { name, phone, email, program } = req.body;
    
    // Отправка email
    const transporter = nodemailer.createTransport({ /* config */ });
    
    await transporter.sendMail({
        from: 'info@ent-bilim.kz',
        to: 'admin@ent-bilim.kz',
        subject: 'Новая заявка',
        text: `Имя: ${name}\nТелефон: ${phone}\nEmail: ${email}\nПрограмма: ${program}`
    });
    
    res.json({ success: true });
});

app.listen(3000);
```

### Альтернативы (без backend)

- **Formspree**: https://formspree.io/
- **Netlify Forms**: https://www.netlify.com/products/forms/
- **EmailJS**: https://www.emailjs.com/
- **Web3Forms**: https://web3forms.com/

---

## 📱 Адаптивность

Сайт оптимизирован для следующих разрешений:

| Устройство | Ширина | Особенности |
|------------|--------|-------------|
| **Mobile S** | 320px+ | Одна колонка, упрощенная навигация |
| **Mobile L** | 425px+ | Оптимизированные карточки |
| **Tablet** | 768px+ | Две колонки, улучшенные формы |
| **Laptop** | 1024px+ | Полная навигация, три колонки |
| **Desktop** | 1440px+ | Максимальная ширина контейнера |

### Тестирование адаптивности

1. Откройте DevTools (F12)
2. Нажмите Toggle Device Toolbar (Ctrl+Shift+M)
3. Выберите различные устройства

---

## 🔍 SEO

### Уже реализовано:

✅ Семантические теги HTML5  
✅ Meta теги (description, keywords)  
✅ Open Graph теги  
✅ Alt теги для изображений (заглушки)  
✅ Корректная структура заголовков (h1-h6)  
✅ Читаемые URL (якорные ссылки)  

### Рекомендации:

1. **Добавьте robots.txt:**
```
User-agent: *
Allow: /
Sitemap: https://ent-bilim.kz/sitemap.xml
```

2. **Создайте sitemap.xml**

3. **Добавьте schema.org разметку:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "ENT-Bilim",
  "description": "Онлайн-платформа для подготовки к ЕНТ",
  "url": "https://ent-bilim.kz"
}
</script>
```

4. **Google Analytics / Yandex Metrika**

---

## 🌐 Браузерная поддержка

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  
✅ Opera 76+  

**Мобильные браузеры:**  
✅ iOS Safari 14+  
✅ Chrome Mobile  
✅ Samsung Internet  

---

## 📝 Чек-лист перед запуском

- [ ] Заменить все placeholder изображения на реальные
- [ ] Добавить favicon
- [ ] Настроить формы (API или сервис)
- [ ] Проверить все ссылки
- [ ] Протестировать на разных устройствах
- [ ] Добавить Google Analytics
- [ ] Настроить SSL сертификат (HTTPS)
- [ ] Проверить скорость загрузки (PageSpeed Insights)
- [ ] Добавить политику конфиденциальности
- [ ] Настроить robots.txt и sitemap.xml

---

## 🎨 Дизайн система

### Цветовая палитра:
- **Primary**: #6366f1 (Индиго)
- **Secondary**: #8b5cf6 (Фиолетовый)
- **Accent**: #ec4899 (Розовый)
- **Success**: #10b981 (Зеленый)
- **Text**: #1f2937 (Темно-серый)

### Типографика:
- **Шрифт**: Inter
- **Размеры**: от 12px до 60px
- **Веса**: 300, 400, 500, 600, 700, 800, 900

### Отступы:
- **XS**: 8px
- **SM**: 12px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **2XL**: 48px

---

## 🚀 Оптимизация производительности

### Уже реализовано:
- Минимальное количество внешних библиотек
- CSS в одном файле
- Оптимизированные анимации (CSS transforms)
- Lazy loading для анимаций (AOS)

### Рекомендации:
1. Минифицировать CSS и JS перед продакшеном
2. Оптимизировать изображения (WebP формат)
3. Использовать CDN для статики
4. Включить кеширование
5. Использовать Gzip сжатие

---

## 📞 Контакты и поддержка

**Разработчик:** ENT-Bilim Team  
**Email:** info@ent-bilim.kz  
**Telegram:** @ent_bilim  

---

## 📄 Лицензия

MIT License — свободное использование и модификация.

---

## 🎉 Благодарности

- **GeekBrains.kz** — за вдохновение дизайном
- **AOS** — за красивые анимации
- **Swiper** — за функциональный слайдер
- **Inter Font** — за отличную типографику

---

**Made with ❤️ for students of Kazakhstan**

🇰🇿 **ENT-Bilim** — твой путь к успеху начинается здесь!

