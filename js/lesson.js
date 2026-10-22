/**
 * ENT-Bilim - Lesson Page JavaScript
 * JavaScript для страницы просмотра видео-урока
 * 
 * Этот файл содержит логику для:
 * - Загрузки данных урока с сервера
 * - Отображения видео из YouTube
 * - Отслеживания прогресса просмотра
 * - Сохранения прогресса на сервер
 */

// Глобальные переменные
let currentLesson = null;  // Данные текущего урока
let videoPlayer = null;    // Ссылка на iframe с YouTube видео

/**
 * Загрузка урока при открытии страницы
 * 
 * Процесс:
 * 1. Проверяет авторизацию пользователя
 * 2. Извлекает ID урока из URL параметров (?id=123)
 * 3. Загружает данные урока с сервера через API
 * 4. Отображает урок на странице
 * 5. Начинает отслеживание прогресса просмотра
 * 
 * Если урок не найден или произошла ошибка, показывает сообщение об ошибке
 */
async function loadLesson() {
  const container = document.getElementById('lessonContent');
  
  try {
    // Авторизация тексеру (асинхронная)
    const isAuthenticated = await requireAuth();
    if (!isAuthenticated) {
      return;
    }
    
    // URL-ден ID алу
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');
    
    if (!lessonId) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Сабақ табылмады</h3>
          <p>Сабақ ID көрсетілмеген.</p>
          <a href="dashboard.html" class="btn btn-primary" style="margin-top: 24px;">Жеке кабинетке оралу</a>
        </div>
      `;
      return;
    }
    
    // Сабақты жүктеу
    const lesson = await getVideo(lessonId);
    currentLesson = lesson;
    
    displayLesson(lesson);
    
    // Видео прогрессін бастау
    startProgressTracking(lessonId);
  } catch (error) {
    console.error('Сабақты жүктеу қатесі:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Сабақты жүктеу мүмкін болмады. Кейінірек қайталаңыз.</p>
        <a href="dashboard.html" class="btn btn-primary" style="margin-top: 24px;">Жеке кабинетке оралу</a>
      </div>
    `;
  }
}

/**
 * Отображение урока на странице
 * Создает HTML разметку для урока:
 * - Заголовок урока
 * - Мета-информация (предмет, учитель)
 * - YouTube iframe для воспроизведения видео
 * - Описание урока
 * 
 * @param {object} lesson - Объект с данными урока (title, description, youtube_url, subject, teacher_name)
 */
function displayLesson(lesson) {
  const container = document.getElementById('lessonContent');
  
  const subjectClass = lesson.subject === 'mathematics' ? 'math' : 'informatics';
  const subjectText = lesson.subject === 'mathematics' ? 'Математика' : 'Информатика';
  
  // YouTube URL-ді embed форматына түрлендіру
  const youtubeUrl = convertToEmbedUrl(lesson.youtube_url);
  
  container.innerHTML = `
    <div class="lesson-header">
      <h1>${escapeHtml(lesson.title)}</h1>
      <div class="lesson-meta">
        <span class="lesson-subject ${subjectClass}">${subjectText}</span>
        <span class="lesson-teacher">Мұғалім: ${escapeHtml(lesson.teacher_name || 'Белгісіз')}</span>
      </div>
    </div>
    
    <div class="video-wrapper">
      <iframe 
        id="lessonVideo"
        src="${youtubeUrl}" 
        title="${escapeHtml(lesson.title)}"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen>
      </iframe>
    </div>
    
    <div class="lesson-description">
      <h2>Сабақ туралы</h2>
      <p>${escapeHtml(lesson.description || 'Сипаттама жоқ')}</p>
    </div>
  `;
  
  // Видео плеерді алу
  videoPlayer = document.getElementById('lessonVideo');
}

/**
 * Преобразование YouTube URL в формат embed
 * Поддерживает различные форматы YouTube ссылок:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID (уже в формате embed)
 * - Просто VIDEO_ID (11 символов)
 * 
 * @param {string} url - YouTube URL в любом формате
 * @returns {string} URL в формате embed для iframe
 */
function convertToEmbedUrl(url) {
  if (!url) return '';
  
  // Егер embed форматында болса
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Егер watch форматында болса
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  
  // Егер youtu.be форматында болса
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }
  
  // Егер ID ғана болса
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return `https://www.youtube.com/embed/${url}`;
  }
  
  return url;
}

/**
 * Отслеживание прогресса просмотра видео
 * 
 * ВАЖНО: YouTube iframe API не позволяет отслеживать прогресс из-за CORS ограничений
 * Поэтому используется упрощенный метод:
 * - Каждые 30 секунд отправляется обновление прогресса на сервер
 * - При закрытии страницы отправляется финальное обновление
 * 
 * @param {number} lessonId - ID урока для отслеживания прогресса
 */
let progressInterval = null;  // Интервал для периодического обновления прогресса
let lastProgressUpdate = 0;    // Последнее количество просмотренных секунд

function startProgressTracking(lessonId) {
  // YouTube iframe API арқылы прогресс бақылау мүмкін емес (CORS)
  // Сондықтан біз қарапайым уақыт бақылауын қолданамыз
  
  // Әр 30 секунд сайын прогресс жаңарту
  progressInterval = setInterval(async () => {
    try {
      // Видео қосылған деп есептейміз
      const watchedSeconds = lastProgressUpdate + 30;
      lastProgressUpdate = watchedSeconds;
      
      await updateProgress(lessonId, watchedSeconds, false);
    } catch (error) {
      console.error('Прогресс жаңарту қатесі:', error);
    }
  }, 30000);
  
  // Беттен шығу кезінде прогресс жаңарту
  window.addEventListener('beforeunload', async () => {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    try {
      await updateProgress(lessonId, lastProgressUpdate, true);
    } catch (error) {
      console.error('Прогресс сақтау қатесі:', error);
    }
  });
}

/**
 * Экранирование HTML для защиты от XSS атак
 * Преобразует специальные символы HTML в безопасные сущности
 * 
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Инициализация страницы урока
 * Вызывается при загрузке DOM
 * Загружает урок и начинает отслеживание прогресса
 */
document.addEventListener('DOMContentLoaded', function() {
  loadLesson();
});

