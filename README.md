# ENT-Bilim — Математика және Информатика бойынша ҰБТ-ға дайындалу платформасы

Онлайн платформа Математика және Информатика пәндері бойынша ҰБТ-ға дайындалуға арналған.

## Технологиялар

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Authentication**: JWT

## Орнату

### 1. Бәдепкілерді орнату

```bash
npm install
```

### 2. Орталық айнымалыларды орнату

`.env` файлын құрыңыз (егер жоқ болса):

```env
PORT=3000
DB_PATH=./database.sqlite
JWT_SECRET=ent-bilim-secret-key-change-this-in-production-2025
UPLOAD_DIR=./uploads
```

### 3. Серверді іске қосу

```bash
npm start
```

Немесе дамыту режимінде:

```bash
npm run dev
```

Сервер `http://localhost:3000` адресінде жұмыс істейді.

## Пайдалану

### Тіркелу

1. Браузерде `http://localhost:3000` ашыңыз
2. "Тіркелу" батырмасын басыңыз
3. Оқушы рөлін таңдап, тіркеліңіз

### Оқушы мүмкіндіктері

- Видео сабақтарды көру (Математика және Информатика)
- Өз прогрессін көру
- Сабақтарды аяқтау деп белгілеу
- Жеке кабинетте сабақтарды фильтрлеу

### Мұғалім мүмкіндіктері

- YouTube видеолар қосу
- Тапсырмалар қосу және басқару
- Оқушылардың прогрессін бақылау
- Тапсырмаларды тексеру және баға беру

## Файл құрылымы

```
.
├── config/
│   └── database.js          # Деректер базасы конфигурациясы
├── middleware/
│   └── auth.js              # JWT аутентификация
├── routes/
│   ├── auth.js              # Авторизация маршруттары
│   ├── videos.js            # Видео маршруттары
│   ├── assignments.js       # Тапсырма маршруттары
│   ├── submissions.js       # Жіберу маршруттары
│   ├── progress.js          # Прогресс маршруттары
│   ├── comments.js          # Комментарий маршруттары
│   └── upload.js            # Файл жүктеу маршруттары
├── uploads/                 # Жүктелген файлдар
├── css/                     # CSS стильдері
├── js/                      # JavaScript файлдары
│   ├── script.js            # Негізгі скрипт
│   ├── translations.js      # Аудармалар
│   ├── auth.js              # Авторизация
│   ├── dashboard.js         # Жеке кабинет
│   └── lesson.js            # Сабақ беті
├── index.html               # Басты бет
├── login.html               # Кіру беті
├── register.html            # Тіркелу беті
├── dashboard.html           # Жеке кабинет
├── lesson.html              # Сабақ беті
├── contacts.html            # Байланыс
├── trial-lesson.html        # Сынақ сабақ
├── server.js                # Express сервер
├── package.json             # NPM пакеттері
└── README.md                # Бұл файл
```

## API Эндпоинттер

### Авторизация
- `POST /api/auth/register` - Тіркелу
- `POST /api/auth/login` - Кіру
- `GET /api/auth/profile` - Профиль алу

### Видеолар
- `GET /api/videos` - Барлық видеоларды алу (subject параметрімен фильтрлеу)
- `GET /api/videos/:id` - Бір видеоны алу
- `POST /api/videos` - Видео қосу (мұғалім)
- `PUT /api/videos/:id` - Видеоны жаңарту (мұғалім)
- `DELETE /api/videos/:id` - Видеоны жою (мұғалім)

### Прогресс
- `GET /api/progress/my` - Менің прогрессім
- `POST /api/progress` - Прогресс жаңарту

## Ескертулер

- JWT_SECRET-ті production ортасында өзгертіңіз
- Файл жүктеу лимиті: 10MB
- YouTube URL-дер embed форматында немесе стандартты форматта болуы керек
- Деректер базасы автоматты түрде құрылады

## Фото
<img width="1915" height="1046" alt="Снимок экрана 2026-09-30 225750" src="https://github.com/user-attachments/assets/b1823962-90d2-4c2f-bd3e-836d88b51baf" />
<img width="1919" height="1039" alt="Снимок экрана 2026-09-30 225801" src="https://github.com/user-attachments/assets/bf7041f2-ba4b-4584-bd49-8dd197c7a23b" />
<img width="1916" height="1034" alt="Снимок экрана 2026-09-30 225815" src="https://github.com/user-attachments/assets/288afde6-aa9d-4792-821e-ecae818ca282" />
<img width="1919" height="1036" alt="Снимок экрана 2026-09-30 225829" src="https://github.com/user-attachments/assets/3d842796-48c0-4682-b2d6-f025876d592c" />
<img width="1919" height="1020" alt="Снимок экрана 2026-09-30 225855" src="https://github.com/user-attachments/assets/6d93bad6-e838-4e9a-a8ec-922cd76bccc6" />


