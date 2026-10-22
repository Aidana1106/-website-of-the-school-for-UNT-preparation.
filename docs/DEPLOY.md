# 🚀 Руководство по деплою ENT-Bilim

Это руководство поможет вам развернуть сайт ENT-Bilim на различных хостинг-платформах.

---

## 📦 Подготовка к деплою

### Чек-лист перед публикацией:

- [ ] ✅ Все изображения добавлены и оптимизированы
- [ ] ✅ Favicon добавлен
- [ ] ✅ Формы настроены и работают
- [ ] ✅ Все ссылки проверены
- [ ] ✅ Протестировано на разных устройствах
- [ ] ✅ Google Analytics настроен (опционально)
- [ ] ✅ Meta-теги заполнены корректно
- [ ] ✅ robots.txt и sitemap.xml созданы

---

## 🌐 Варианты хостинга

### 1️⃣ Netlify (Рекомендуется для статики)

**Преимущества:** Бесплатный, быстрый, CI/CD, формы из коробки, SSL

#### Шаги:

1. **Зарегистрируйтесь на** [Netlify](https://www.netlify.com/)

2. **Способ A: Через Git**
   ```bash
   # Инициализируйте Git репозиторий
   git init
   git add .
   git commit -m "Initial commit"
   
   # Создайте репозиторий на GitHub
   # Подключите Netlify к GitHub
   ```

3. **Способ B: Drag & Drop**
   - Перетащите папку проекта на netlify.com
   - Готово!

4. **Настройка форм (Netlify Forms)**
   ```html
   <!-- Добавьте в формы атрибут data-netlify="true" -->
   <form data-netlify="true" name="consultation">
       <!-- поля формы -->
   </form>
   ```

5. **Настройка домена**
   - Site settings → Domain management
   - Добавьте свой домен (ent-bilim.kz)

---

### 2️⃣ Vercel

**Преимущества:** Быстрый, бесплатный SSL, оптимизация изображений

#### Шаги:

1. Установите Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Разверните проект:
   ```bash
   vercel
   ```

3. Следуйте инструкциям в терминале

4. Готово! URL будет предоставлен автоматически

---

### 3️⃣ GitHub Pages

**Преимущества:** Бесплатный, интеграция с GitHub

#### Шаги:

1. Создайте репозиторий на GitHub

2. Загрузите файлы:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/ent-bilim.git
   git push -u origin main
   ```

3. Включите GitHub Pages:
   - Settings → Pages
   - Source: main branch / root
   - Save

4. Сайт будет доступен: `https://username.github.io/ent-bilim/`

---

### 4️⃣ Хостинг провайдер (Shared Hosting)

**Примеры:** Beget, TimeWeb, HostKZ, Хостинг.kz

#### Шаги:

1. **Подключитесь по FTP/SFTP**
   - Используйте FileZilla, Cyberduck или WinSCP

2. **Загрузите файлы**
   ```
   /public_html/
   ├── index.html
   ├── css/
   ├── js/
   └── images/
   ```

3. **Настройте домен**
   - Привяжите домен через панель хостинга

4. **SSL сертификат**
   - Активируйте Let's Encrypt в панели

---

### 5️⃣ Cloudflare Pages

**Преимущества:** CDN, быстрый, бесплатный SSL

#### Шаги:

1. Зарегистрируйтесь на [Cloudflare Pages](https://pages.cloudflare.com/)

2. Подключите Git репозиторий

3. Настройки билда:
   - Build command: (пусто)
   - Build output directory: `/`

4. Deploy

---

## 🔧 Backend интеграция

### Вариант 1: Serverless Functions (Netlify/Vercel)

#### Netlify Functions:

1. Создайте папку `netlify/functions/`

2. Создайте `submit-form.js`:
   ```javascript
   exports.handler = async (event, context) => {
       const data = JSON.parse(event.body);
       
       // Отправка email через SendGrid, Mailgun и т.д.
       
       return {
           statusCode: 200,
           body: JSON.stringify({ success: true })
       };
   };
   ```

3. Обновите `js/script.js`:
   ```javascript
   fetch('/.netlify/functions/submit-form', {
       method: 'POST',
       body: JSON.stringify(formData)
   });
   ```

### Вариант 2: Node.js Backend

#### Простой Express сервер:

```javascript
// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/submit', async (req, res) => {
    const { name, phone, email } = req.body;
    
    // Email отправка
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-app-password'
        }
    });
    
    await transporter.sendMail({
        from: email,
        to: 'info@ent-bilim.kz',
        subject: 'Новая заявка с сайта',
        text: `Имя: ${name}\nТелефон: ${phone}\nEmail: ${email}`
    });
    
    res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

#### Деплой на Heroku:

```bash
# Создайте Procfile
echo "web: node server.js" > Procfile

# Деплой
heroku create ent-bilim-api
git push heroku main
```

### Вариант 3: PHP Backend

```php
<?php
// api/submit.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'];
    $phone = $_POST['phone'];
    $email = $_POST['email'];
    
    $to = 'info@ent-bilim.kz';
    $subject = 'Новая заявка с сайта';
    $message = "Имя: $name\nТелефон: $phone\nEmail: $email";
    $headers = "From: $email";
    
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
}
?>
```

---

## 📧 Настройка Email сервисов

### SendGrid

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
    to: 'info@ent-bilim.kz',
    from: 'noreply@ent-bilim.kz',
    subject: 'Новая заявка',
    text: `Имя: ${name}\nТелефон: ${phone}`
};

await sgMail.send(msg);
```

### Mailgun

```javascript
const mailgun = require('mailgun-js')({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: 'ent-bilim.kz'
});

await mailgun.messages().send({
    from: 'ENT-Bilim <noreply@ent-bilim.kz>',
    to: 'info@ent-bilim.kz',
    subject: 'Новая заявка',
    text: `Имя: ${name}\nТелефон: ${phone}`
});
```

---

## 🔒 SSL сертификат

### Let's Encrypt (бесплатный)

#### На cPanel/Plesk:
1. Зайдите в панель управления
2. Найдите "SSL/TLS" или "Let's Encrypt"
3. Выберите домен и активируйте

#### Вручную (Certbot):
```bash
sudo apt install certbot
sudo certbot --nginx -d ent-bilim.kz -d www.ent-bilim.kz
```

---

## 📊 Аналитика

### Google Analytics

```html
<!-- Добавьте перед </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Yandex Metrika

```html
<!-- Добавьте перед </head> -->
<script type="text/javascript" >
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(XXXXXXX, "init", {clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
</script>
```

---

## 🎯 Оптимизация

### 1. Минификация

```bash
# CSS
npx clean-css-cli -o css/style.min.css css/style.css

# JavaScript
npx terser js/script.js -o js/script.min.js -c -m
```

### 2. Оптимизация изображений

```bash
# Установите ImageMagick
# Конвертируйте в WebP
for file in images/**/*.{jpg,png}; do
    cwebp -q 80 "$file" -o "${file%.*}.webp"
done
```

### 3. Кеширование (.htaccess для Apache)

```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript
</IfModule>
```

---

## 🔍 SEO после деплоя

### 1. Создайте robots.txt

```
User-agent: *
Allow: /
Sitemap: https://ent-bilim.kz/sitemap.xml
```

### 2. Создайте sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ent-bilim.kz/</loc>
    <lastmod>2025-01-01</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 3. Регистрация в поисковых системах

- **Google Search Console**: https://search.google.com/search-console
- **Yandex Webmaster**: https://webmaster.yandex.ru/

---

## 📱 Тестирование после деплоя

### Инструменты:

1. **Google PageSpeed Insights**: https://pagespeed.web.dev/
2. **GTmetrix**: https://gtmetrix.com/
3. **Lighthouse** (в Chrome DevTools)
4. **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly

### Чек-лист:

- [ ] Сайт открывается по HTTPS
- [ ] Все изображения загружаются
- [ ] Формы работают
- [ ] Переключение языков работает
- [ ] Мобильная версия корректна
- [ ] Скорость загрузки < 3 сек
- [ ] Нет ошибок в консоли

---

## 🆘 Решение проблем

### Формы не отправляются

✅ Проверьте CORS настройки  
✅ Проверьте URL API  
✅ Проверьте console.log в браузере

### Стили не применяются

✅ Проверьте пути к файлам  
✅ Очистите кеш браузера (Ctrl+Shift+R)  
✅ Проверьте .htaccess файл

### Изображения не загружаются

✅ Проверьте регистр имен файлов (case-sensitive)  
✅ Проверьте права доступа (chmod 644)

---

## 📞 Поддержка

Если возникли вопросы:
- 📧 Email: info@ent-bilim.kz
- 💬 Telegram: @ent_bilim

---

**Успешного деплоя! 🚀**

