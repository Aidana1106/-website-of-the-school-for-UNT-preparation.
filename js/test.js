/**
 * ENT-Bilim - Test Page JavaScript
 * JavaScript для страницы прохождения теста
 * 
 * Этот файл содержит логику для:
 * - Загрузки данных теста с сервера
 * - Отображения вопросов теста
 * - Отслеживания ответов пользователя
 * - Отправки результатов на сервер
 * - Отображения результатов теста
 */

// API_BASE_URL уже определен в auth.js (который загружается раньше)
// Не объявляем его здесь повторно, чтобы избежать ошибки "already declared"

// Глобальные переменные
let currentTest = null;           // Данные текущего теста
let currentQuestions = [];        // Вопросы теста
let userAnswers = [];             // Ответы пользователя
let testResultId = null;          // ID результата теста
let startTime = null;             // Время начала теста
let timerInterval = null;         // Интервал таймера
let currentQuestionIndex = 0;     // Текущий вопрос

/**
 * Загрузка теста при открытии страницы
 */
async function loadTest() {
  const container = document.getElementById('testContent');
  
  try {
    // Авторизация тексеру
    const isAuthenticated = await requireAuth();
    if (!isAuthenticated) {
      return;
    }
    
    // URL-ден ID алу
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('id');
    
    if (!testId) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Тест табылмады</h3>
          <p>Тест ID көрсетілмеген.</p>
          <a href="dashboard.html" class="btn btn-primary" style="margin-top: 24px;">Жеке кабинетке оралу</a>
        </div>
      `;
      return;
    }
    
    // Тестті жүктеу
    const token = getToken();
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
    const response = await fetch(`${apiUrl}/api/tests/${testId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Тестті жүктеу қатесі';
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          console.error('Ошибка парсинга JSON:', e);
        }
      } else {
        const errorText = await response.text();
        console.error('Сервер вернул HTML вместо JSON:', errorText.substring(0, 200));
        errorMessage = `Сервер қатесі (${response.status})`;
      }
      
      throw new Error(errorMessage);
    }
    
    const testData = await response.json();
    currentTest = testData;
    currentQuestions = testData.questions || [];
    
    // Проверка наличия вопросов
    if (!currentQuestions || currentQuestions.length === 0) {
      throw new Error('Тестте сұрақтар жоқ');
    }
    
    console.log(`✅ Загружено вопросов: ${currentQuestions.length}`);
    
    // Инициализировать массив ответов
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    // Начать прохождение теста ПЕРЕД отображением
    try {
      await startTest(testId);
      
      // Проверить, что testResultId установлен после startTest
      if (!testResultId) {
        console.error('testResultId не установлен после startTest. Текущее значение:', testResultId);
        throw new Error('Тестті бастау мүмкін болмады: result_id жоқ');
      }
      
      console.log('✅ Тест успешно начат, resultId:', testResultId);
    } catch (startError) {
      // Если тест уже завершен, показать результаты
      if (startError.isCompleted && startError.result) {
        console.log('Тест уже завершен, показываем результаты');
        showTestResult({ result: startError.result });
        return; // Не вызывать displayTest()
      }
      
      console.error('Ошибка при старте теста:', startError);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Қате орын алды</h3>
          <p>${startError.message || 'Тестті бастау мүмкін болмады'}</p>
          <a href="dashboard.html" class="btn btn-primary" style="margin-top: 24px;">Жеке кабинетке оралу</a>
        </div>
      `;
      return;
    }
    
    // Отобразить тест только после успешного старта (и если тест не завершен)
    displayTest();
  } catch (error) {
    console.error('Тестті жүктеу қатесі:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>${error.message || 'Тестті жүктеу мүмкін болмады. Кейінірек қайталаңыз.'}</p>
        <a href="dashboard.html" class="btn btn-primary" style="margin-top: 24px;">Жеке кабинетке оралу</a>
      </div>
    `;
  }
}

/**
 * Начать прохождение теста
 */
async function startTest(testId) {
  try {
    const token = getToken();
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
    const response = await fetch(`${apiUrl}/api/tests/${testId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Тестті бастау қатесі';
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          console.error('Ошибка парсинга JSON ошибки:', e);
        }
      } else {
        const errorText = await response.text();
        console.error('Сервер вернул не JSON:', errorText.substring(0, 200));
        errorMessage = `Сервер қатесі (${response.status})`;
      }
      
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    let result;
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const responseText = await response.text();
      console.error('Сервер вернул не JSON:', responseText.substring(0, 200));
      throw new Error('Сервер қатесі: дұрыс емес формат');
    }
    
    console.log('Ответ startTest от сервера:', result);
    console.log('Тип результата:', typeof result);
    console.log('Ключи результата:', Object.keys(result || {}));
    console.log('Полный JSON ответа:', JSON.stringify(result, null, 2));
    
    // Проверить наличие result_id в ответе (может быть result_id или resultId)
    // ВАЖНО: result_id может быть в result.result_id или в result.result.id
    const resultId = result.result_id || result.resultId || result.id || 
                     (result.result && result.result.id) || 
                     (result.result && result.result.result_id);
    
    console.log('Извлеченный resultId:', resultId, 'из полей:', {
      'result.result_id': result.result_id,
      'result.resultId': result.resultId,
      'result.id': result.id,
      'result.result.id': result.result?.id,
      'result.result.result_id': result.result?.result_id
    });
    
    if (!resultId || resultId === null || resultId === undefined || resultId === 0) {
      console.error('result_id не найден в ответе. Полный ответ:', JSON.stringify(result, null, 2));
      throw new Error('Тестті бастау мүмкін болмады: result_id жоқ. Сервер қатесі.');
    }
    
    // Установить testResultId ПЕРЕД проверкой already_completed
    testResultId = parseInt(resultId); // Убедиться, что это число
    
    // Если тест уже пройден, показать результаты и остановить выполнение
    if (result.already_completed && result.result) {
      console.log('Тест уже пройден, показываем результаты. resultId:', testResultId);
      // Проверить структуру результата
      if (result.result && typeof result.result === 'object') {
        // Выбросить специальную ошибку, чтобы loadTest() не вызывал displayTest()
        const completedError = new Error('TEST_ALREADY_COMPLETED');
        completedError.isCompleted = true;
        completedError.result = result.result;
        throw completedError;
      } else {
        console.error('Неверная структура результата:', result);
        throw new Error('Нәтижелерді көрсету мүмкін болмады');
      }
    }
    
    // Если тест не пройден, продолжаем нормально
    // Использовать сохраненное время начала, если есть, иначе текущее время
    if (result.started_at) {
      startTime = new Date(result.started_at);
      console.log('Используем сохраненное время начала:', startTime.toISOString());
    } else {
      startTime = new Date();
    }
    
    // Загрузить сохраненные ответы, если тест был начат ранее
    if (result.saved_answers && typeof result.saved_answers === 'object') {
      console.log('Загружаем сохраненные ответы:', result.saved_answers);
      // Преобразовать объект ответов в массив
      Object.keys(result.saved_answers).forEach(key => {
        const questionIndex = parseInt(key);
        if (!isNaN(questionIndex) && questionIndex >= 0 && questionIndex < userAnswers.length) {
          userAnswers[questionIndex] = result.saved_answers[key];
        }
      });
      console.log('Сохраненные ответы загружены в userAnswers:', userAnswers);
    }
    
    console.log('✅ Тест успешно начат:', {
      testId: testId,
      resultId: testResultId,
      resultIdType: typeof testResultId,
      questionsCount: currentQuestions.length,
      startTime: startTime.toISOString(),
      already_completed: result.already_completed || false,
      hasSavedAnswers: !!(result.saved_answers && Object.keys(result.saved_answers).length > 0)
    });
    
    // Сохранить данные для запуска таймера после displayTest()
    window.pendingTimerData = null;
    // Проверить time_limit - он может быть числом или строкой
    const timeLimit = currentTest ? (parseInt(currentTest.time_limit) || 0) : 0;
    console.log('Проверка time_limit:', { timeLimit, raw: currentTest?.time_limit, type: typeof currentTest?.time_limit });
    
    if (currentTest && timeLimit > 0) {
      // Если тест был начат ранее, вычислить оставшееся время
      let timeRemaining = timeLimit * 60; // секунды
      if (result.started_at && startTime) {
        const elapsed = Math.floor((new Date() - startTime) / 1000); // секунды
        timeRemaining = Math.max(0, timeRemaining - elapsed);
        console.log('Вычислено оставшееся время:', timeRemaining, 'секунд');
      }
      window.pendingTimerData = {
        timeRemaining: timeRemaining,
        timeLimit: timeLimit
      };
      console.log('Данные таймера подготовлены:', window.pendingTimerData);
    } else {
      console.log('Таймер не будет запущен:', {
        hasCurrentTest: !!currentTest,
        timeLimit: timeLimit,
        rawTimeLimit: currentTest?.time_limit
      });
    }
  } catch (error) {
    console.error('Тестті бастау қатесі:', error);
    throw error;
  }
}

/**
 * Запустить таймер обратного отсчета
 */
function startTimer(totalSeconds) {
  // Очистить предыдущий таймер, если он был запущен
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  if (!totalSeconds || totalSeconds <= 0) {
    console.warn('Таймер не запущен: неверное время', totalSeconds);
    return;
  }
  
  let remainingSeconds = totalSeconds;
  console.log('Таймер запущен с', remainingSeconds, 'секундами');
  
  const updateTimer = () => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timerElement = document.getElementById('testTimer');
    
    if (timerElement) {
      timerElement.textContent = `⏱ ${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Изменить цвет при малом времени
      if (remainingSeconds <= 60) {
        timerElement.className = 'test-timer danger';
      } else if (remainingSeconds <= 300) {
        timerElement.className = 'test-timer warning';
      } else {
        timerElement.className = 'test-timer';
      }
    }
    
    if (remainingSeconds <= 0) {
      console.log('Время вышло, автоматическая отправка теста');
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      submitTest(true); // Автоматически отправить тест
      return;
    }
    
    remainingSeconds--;
  };
  
  // Обновить сразу
  updateTimer();
  // Запустить интервал
  timerInterval = setInterval(updateTimer, 1000);
  console.log('Таймер интервал установлен:', timerInterval);
}

/**
 * Отображение теста на странице
 */
function displayTest() {
  const container = document.getElementById('testContent');
  
  const subjectClass = currentTest.subject === 'mathematics' ? 'math' : currentTest.subject === 'informatics' ? 'informatics' : 'ent';
  const subjectText = currentTest.subject === 'mathematics' ? 'Математика' : currentTest.subject === 'informatics' ? 'Информатика' : 'ЕНТ';
  
  let html = `
    <div class="test-header">
      <h1>${escapeHtml(currentTest.title)}</h1>
      <div class="test-meta">
        <span class="test-subject ${subjectClass}">${subjectText}</span>
        ${currentTest.time_limit ? `<div class="test-timer" id="testTimer">⏱ ${currentTest.time_limit}:00</div>` : ''}
        <span style="color: var(--text-secondary); font-size: 0.875rem;">${currentTest.total_questions} сұрақ</span>
      </div>
    </div>
    
    <div class="test-progress">
      <div class="test-progress-bar">
        <div class="test-progress-fill" id="progressFill" style="width: 0%"></div>
      </div>
      <div class="test-progress-text">
        <span>Сұрақ <span id="currentQuestionNum">1</span> / ${currentQuestions.length}</span>
        <span>Жауап берілді: <span id="answeredCount">0</span> / ${currentQuestions.length}</span>
      </div>
    </div>
    
    <div class="test-content" id="testQuestions">
  `;
  
  // Отобразить все вопросы
  currentQuestions.forEach((question, index) => {
    if (!question || !question.question_type) {
      console.warn(`Пропущен вопрос с индексом ${index}:`, question);
      return;
    }
    html += renderQuestion(question, index);
  });
  
  html += `
    </div>
    
    <div class="test-navigation">
      <div class="test-actions">
        <button class="btn btn-secondary" onclick="previousQuestion()" id="prevBtn" style="display: none;">← Алдыңғы</button>
        <button class="btn btn-secondary" onclick="nextQuestion()" id="nextBtn">Келесі →</button>
      </div>
      <button class="btn btn-primary" onclick="submitTest()" id="submitBtn">Тестті аяқтау</button>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Показать первый вопрос
  showQuestion(0);
  updateProgress();
  
  // Запустить таймер ПОСЛЕ создания DOM элементов
  if (window.pendingTimerData) {
    console.log('Запуск таймера после создания DOM:', window.pendingTimerData);
    startTimer(window.pendingTimerData.timeRemaining);
    window.pendingTimerData = null; // Очистить
  }
}

/**
 * Отображение одного вопроса
 */
function renderQuestion(question, index) {
  const questionType = question.question_type;
  const options = question.options || [];
  
  let optionsHtml = '';
  
  if (questionType === 'single_choice') {
    optionsHtml = options.map((option, optIndex) => `
      <div class="option-item" onclick="selectSingleAnswer(${index}, ${optIndex})" id="option-${index}-${optIndex}">
        <div class="option-checkbox"></div>
        <div class="option-text">${escapeHtml(option)}</div>
      </div>
    `).join('');
  } else if (questionType === 'multiple_choice') {
    optionsHtml = options.map((option, optIndex) => `
      <div class="option-item multiple" onclick="toggleMultipleAnswer(${index}, ${optIndex})" id="option-${index}-${optIndex}">
        <div class="option-checkbox"></div>
        <div class="option-text">${escapeHtml(option)}</div>
      </div>
    `).join('');
  }
  
  return `
    <div class="question-card" id="question-${index}" style="display: none;">
      <div class="question-header">
        <span class="question-number">Сұрақ ${index + 1}</span>
      </div>
      <div class="question-text">${escapeHtml(question.question_text)}</div>
      <div class="question-options">
        ${optionsHtml}
      </div>
    </div>
  `;
}

/**
 * Показать конкретный вопрос
 */
function showQuestion(index) {
  // Проверка валидности индекса
  if (index < 0 || index >= currentQuestions.length || !currentQuestions[index]) {
    console.warn(`showQuestion: неверный индекс ${index}, всего вопросов: ${currentQuestions.length}`);
    return;
  }
  
  // Скрыть все вопросы
  document.querySelectorAll('.question-card').forEach(card => {
    card.style.display = 'none';
  });
  
  // Показать текущий вопрос
  const questionCard = document.getElementById(`question-${index}`);
  if (questionCard) {
    questionCard.style.display = 'block';
  }
  
  // Обновить кнопки навигации
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn) {
    prevBtn.style.display = index === 0 ? 'none' : 'block';
  }
  
  if (nextBtn) {
    nextBtn.style.display = index === currentQuestions.length - 1 ? 'none' : 'block';
  }
  
  // Обновить номер вопроса
  const currentQuestionNum = document.getElementById('currentQuestionNum');
  if (currentQuestionNum) {
    currentQuestionNum.textContent = index + 1;
  }
  
  // Восстановить выбранные ответы
  restoreAnswers(index);
  
  currentQuestionIndex = index;
}

/**
 * Восстановить выбранные ответы для вопроса
 */
function restoreAnswers(questionIndex) {
  const answer = userAnswers[questionIndex];
  const question = currentQuestions[questionIndex];
  
  if (answer === null || !question) return;
  
  if (question.question_type === 'single_choice') {
    // Снять все выделения
    document.querySelectorAll(`#question-${questionIndex} .option-item`).forEach(item => {
      item.classList.remove('selected');
    });
    // Выделить выбранный ответ
    const optionItem = document.getElementById(`option-${questionIndex}-${answer}`);
    if (optionItem) {
      optionItem.classList.add('selected');
    }
  } else if (question.question_type === 'multiple_choice') {
    // Снять все выделения
    document.querySelectorAll(`#question-${questionIndex} .option-item`).forEach(item => {
      item.classList.remove('selected');
    });
    // Выделить выбранные ответы
    if (Array.isArray(answer)) {
      answer.forEach(optIndex => {
        const optionItem = document.getElementById(`option-${questionIndex}-${optIndex}`);
        if (optionItem) {
          optionItem.classList.add('selected');
        }
      });
    }
  }
}

/**
 * Выбрать один ответ (single choice)
 */
function selectSingleAnswer(questionIndex, optionIndex) {
  console.log('Выбран ответ:', { questionIndex, optionIndex });
  userAnswers[questionIndex] = optionIndex;
  
  // Обновить визуальное выделение
  document.querySelectorAll(`#question-${questionIndex} .option-item`).forEach(item => {
    item.classList.remove('selected');
  });
  
  const optionItem = document.getElementById(`option-${questionIndex}-${optionIndex}`);
  if (optionItem) {
    optionItem.classList.add('selected');
  }
  
  updateProgress();
  
  // Автосохранение ответов (debounce)
  debouncedSaveAnswers();
}

/**
 * Переключить ответ (multiple choice)
 */
function toggleMultipleAnswer(questionIndex, optionIndex) {
  const question = currentQuestions[questionIndex];
  
  if (!Array.isArray(userAnswers[questionIndex])) {
    userAnswers[questionIndex] = [];
  }
  
  const answerArray = userAnswers[questionIndex];
  const index = answerArray.indexOf(optionIndex);
  
  if (index > -1) {
    // Убрать из выбранных
    answerArray.splice(index, 1);
    document.getElementById(`option-${questionIndex}-${optionIndex}`).classList.remove('selected');
  } else {
    // Добавить в выбранные
    answerArray.push(optionIndex);
    document.getElementById(`option-${questionIndex}-${optionIndex}`).classList.add('selected');
  }
  
  updateProgress();
  
  // Автосохранение ответов (debounce)
  debouncedSaveAnswers();
}

// Debounce функция для автосохранения ответов
let saveAnswersTimeout = null;
function debouncedSaveAnswers() {
  if (saveAnswersTimeout) {
    clearTimeout(saveAnswersTimeout);
  }
  saveAnswersTimeout = setTimeout(() => {
    saveAnswersToServer();
  }, 2000); // Сохранять через 2 секунды после последнего изменения
}

/**
 * Автосохранение ответов на сервер
 */
async function saveAnswersToServer() {
  if (!testResultId || !currentTest || !userAnswers) {
    console.log('Автосохранение пропущено:', { testResultId, hasCurrentTest: !!currentTest, hasUserAnswers: !!userAnswers });
    return;
  }
  
  try {
    const token = getToken();
    if (!token) return;
    
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
    
    // Преобразовать массив ответов в объект для сохранения
    const answersObject = {};
    userAnswers.forEach((answer, index) => {
      if (answer !== null && answer !== undefined) {
        answersObject[index] = answer;
      }
    });
    
    console.log('Автосохранение ответов:', { testResultId, answersCount: Object.keys(answersObject).length });
    
    const response = await fetch(`${apiUrl}/api/tests/${currentTest.id}/save-answers`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        result_id: testResultId,
        answers: answersObject
      })
    });
    
    if (response.ok) {
      console.log('Ответы успешно сохранены');
    } else {
      console.error('Ошибка автосохранения ответов:', response.status);
    }
  } catch (error) {
    console.error('Ошибка автосохранения ответов:', error);
  }
}

/**
 * Следующий вопрос
 */
function nextQuestion() {
  if (currentQuestionIndex < currentQuestions.length - 1) {
    showQuestion(currentQuestionIndex + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Предыдущий вопрос
 */
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    showQuestion(currentQuestionIndex - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Обновить прогресс-бар
 */
function updateProgress() {
  const answeredCount = userAnswers.filter(a => a !== null && (Array.isArray(a) ? a.length > 0 : true)).length;
  const progressPercent = (answeredCount / currentQuestions.length) * 100;
  
  const progressFill = document.getElementById('progressFill');
  const answeredCountEl = document.getElementById('answeredCount');
  
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }
  
  if (answeredCountEl) {
    answeredCountEl.textContent = answeredCount;
  }
}

/**
 * Отправить тест
 */
async function submitTest(isAutoSubmit = false) {
  if (!isAutoSubmit) {
    const unansweredCount = userAnswers.filter(a => a === null || (Array.isArray(a) && a.length === 0)).length;
    
    if (unansweredCount > 0) {
      const confirmMessage = `Сізде ${unansweredCount} сұраққа жауап берілмеген. Тестті аяқтағыңыз келе ме?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }
  }
  
  try {
    // Проверить, что testResultId установлен
    if (!testResultId) {
      console.error('testResultId не установлен, попытка начать тест заново...');
      console.log('Текущее состояние:', {
        currentTest: currentTest ? { id: currentTest.id, title: currentTest.title } : null,
        testResultId,
        userAnswersLength: userAnswers ? userAnswers.length : 0
      });
      
      // Попробовать начать тест заново
      try {
        if (!currentTest || !currentTest.id) {
          throw new Error('Тест не загружен');
        }
        await startTest(currentTest.id);
        
        // Проверить еще раз после повторного запуска
        if (!testResultId) {
          throw new Error('result_id не получен от сервера');
        }
        
        console.log('Тест успешно перезапущен, новый resultId:', testResultId);
      } catch (startError) {
        console.error('Ошибка при повторном запуске теста:', startError);
        alert('Қате: Тест басталмаған. Бетті жаңартып, қайталаңыз.\n\nДетали: ' + startError.message);
        return;
      }
    }
    
    // Проверить, что ответы собраны
    if (!userAnswers || userAnswers.length === 0) {
      alert('Қате: Жауаптар жинақталмаған');
      return;
    }
    
    // Остановить таймер
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Вычислить время прохождения
    const timeSpent = startTime ? Math.floor((new Date() - startTime) / 1000) : 0;
    
    // Убедиться, что userAnswers - это массив
    const answersToSend = Array.isArray(userAnswers) ? userAnswers : [];
    
    // Подсчитать количество отвеченных вопросов
    const answeredCount = answersToSend.filter(a => a !== null && a !== undefined && (Array.isArray(a) ? a.length > 0 : true)).length;
    
    console.log('Отправка теста:', {
      testId: currentTest.id,
      resultId: testResultId,
      totalQuestions: currentQuestions.length,
      answersCount: answersToSend.length,
      answeredCount: answeredCount,
      unansweredCount: answersToSend.length - answeredCount,
      answers: answersToSend,
      timeSpent,
      userAnswersFull: userAnswers
    });
    
    // Финальная проверка перед отправкой
    if (!testResultId) {
      throw new Error('Тест басталмаған. Бетті жаңартып, қайталаңыз.');
    }
    
    if (!answersToSend || answersToSend.length === 0) {
      console.error('Ошибка: массив ответов пуст:', {
        userAnswers,
        answersToSend,
        currentQuestionsLength: currentQuestions.length
      });
      throw new Error('Жауаптар жинақталмаған');
    }
    
    // Проверить, что количество ответов соответствует количеству вопросов
    if (answersToSend.length !== currentQuestions.length) {
      console.warn('Предупреждение: количество ответов не совпадает с количеством вопросов:', {
        answersLength: answersToSend.length,
        questionsLength: currentQuestions.length
      });
    }
    
    const token = getToken();
    if (!token) {
      throw new Error('Авторизация қажет');
    }
    
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
    const response = await fetch(`${apiUrl}/api/tests/${currentTest.id}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        answers: answersToSend,
        time_spent: timeSpent,
        result_id: testResultId
      })
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Тестті жіберу қатесі';
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          console.error('Ошибка парсинга JSON ошибки:', e);
        }
      } else {
        const errorText = await response.text();
        console.error('Сервер вернул не JSON:', errorText.substring(0, 200));
        errorMessage = `Сервер қатесі (${response.status})`;
      }
      
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    let result;
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const responseText = await response.text();
      console.error('Сервер вернул не JSON:', responseText.substring(0, 200));
      throw new Error('Сервер қатесі: дұрыс емес формат');
    }
    
    showTestResult(result);
  } catch (error) {
    console.error('Тестті жіберу қатесі:', error);
    alert('Қате: ' + error.message);
  }
}

/**
 * Показать результаты теста
 */
function showTestResult(result) {
  const container = document.getElementById('testContent');
  
  // Проверить структуру результата
  if (!result || !result.result) {
    console.error('Неверная структура результата:', result);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Нәтижелерді көрсету мүмкін болмады</p>
        <a href="dashboard.html" class="btn btn-primary" style="margin-top: 24px;">Жеке кабинетке оралу</a>
      </div>
    `;
    return;
  }
  
  const resultData = result.result;
  const percentage = resultData.percentage ? Math.round(resultData.percentage) : 0;
  const passed = resultData.passed === 1;
  const score = resultData.score || 0;
  const totalScore = resultData.total_score || 0;
  
  let html = `
    <div class="test-result">
      <h1>${escapeHtml(currentTest.title)}</h1>
      <div class="result-score">${percentage}%</div>
      <div class="${passed ? 'result-passed' : 'result-failed'}">
        ${passed ? '✅ Тест сәтті аяқталды!' : '❌ Тест аяқталмады'}
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">
        Сіз ${score} балл жинадыңыз (${totalScore} баллдан)
      </p>
      
      <div class="result-details">
        <h3 style="margin-bottom: 24px; color: var(--text-primary);">Жауаптарды талдау</h3>
  `;
  
  // Показать детали по каждому вопросу
  if (result.questions) {
    result.questions.forEach((q, index) => {
      const isCorrect = q.is_correct;
      html += `
        <div class="result-question ${isCorrect ? 'correct' : 'incorrect'}">
          <div style="font-weight: 600; margin-bottom: 8px;">
            Сұрақ ${index + 1}: ${escapeHtml(currentQuestions[index].question_text)}
          </div>
          <div style="margin-top: 8px; font-size: 0.875rem;">
            <div><strong>Сіздің жауабыңыз:</strong> ${formatAnswer(q.user_answer, currentQuestions[index])}</div>
            <div><strong>Дұрыс жауап:</strong> ${formatAnswer(q.correct_answer, currentQuestions[index])}</div>
          </div>
        </div>
      `;
    });
  }
  
  html += `
      </div>
      
      <div style="margin-top: 32px;">
        <a href="dashboard.html" class="btn btn-primary">Жеке кабинетке оралу</a>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Форматировать ответ для отображения
 */
function formatAnswer(answer, question) {
  if (answer === null || answer === undefined) {
    return 'Жауап берілмеген';
  }
  
  if (Array.isArray(answer)) {
    if (answer.length === 0) {
      return 'Жауап берілмеген';
    }
    const options = question.options || [];
    return answer.map(index => options[index] || `Вариант ${index + 1}`).join(', ');
  }
  
  const options = question.options || [];
  return options[answer] || `Вариант ${answer + 1}`;
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Глобальные функции для вызова из HTML
window.selectSingleAnswer = selectSingleAnswer;
window.toggleMultipleAnswer = toggleMultipleAnswer;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.submitTest = submitTest;

/**
 * Инициализация страницы теста
 */
document.addEventListener('DOMContentLoaded', function() {
  loadTest();
});

