/**
 * ENT-Bilim - Dashboard JavaScript
 * Личный кабинет для учеников и учителей
 * 
 * Этот файл содержит всю логику для работы личного кабинета:
 * - Загрузка и отображение видео-уроков
 * - Загрузка и отображение заданий
 * - Отслеживание прогресса ученика
 * - Панель управления для учителей (создание видео, заданий, оценка работ)
 */

// API_BASE_URL уже определен в auth.js (который загружается раньше)
// Не объявляем его здесь повторно, чтобы избежать ошибки "already declared"

// ВАЖНО: switchTab должна быть доступна глобально ДО загрузки HTML
// Объявляем простую заглушку сразу, полная версия будет ниже после инициализации переменных
window.switchTab = function switchTab(tabName) {
  console.log('switchTab вызвана:', tabName);
  // Базовая функциональность для предотвращения ошибок
  try {
    // Установить currentTab если он определен
    if (typeof currentTab !== 'undefined') {
      currentTab = tabName;
    } else if (typeof window.currentTab !== 'undefined') {
      window.currentTab = tabName;
    }
    
    // Боковая панель кнопки жаңарту
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      }
    });
    
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
      tab.classList.remove('active');
    });
    
    // Показать нужную вкладку
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
      tabElement.style.display = 'block';
      tabElement.classList.add('active');
    }
    
    // Проверить роль пользователя
    const user = getUser();
    const isTeacher = user && user.role === 'teacher';
    
    // Для вкладок учителя загрузить данные (если функции доступны)
    if (isTeacher) {
      // Учители не должны иметь доступ к вкладке "Тесттер" (только "Менің тесттер")
      if (tabName === 'tests') {
        console.warn('Учители не имеют доступа к вкладке "Тесттер"');
        return;
      }
      
      if (tabName === 'my-videos' && typeof loadMyVideos === 'function') {
        loadMyVideos();
      } else if (tabName === 'my-assignments' && typeof loadMyAssignments === 'function') {
        loadMyAssignments();
      } else if (tabName === 'my-tests' && typeof loadMyTests === 'function') {
        loadMyTests();
      } else if (tabName === 'submissions' && typeof loadSubmissions === 'function') {
        loadSubmissions();
      } else if (tabName === 'teacher-stats' && typeof loadTeacherStats === 'function') {
        loadTeacherStats();
      }
    } else {
      // Для учеников
      if (tabName === 'tests' && typeof loadTests === 'function') {
        loadTests();
      } else if (typeof displayCurrentTab === 'function') {
        // Для других вкладок ученика использовать оригинальную логику
        displayCurrentTab();
      }
    }
  } catch (e) {
    console.error('Ошибка в switchTab:', e);
  }
};

// Глобальные переменные для хранения данных
let allLessons = [];          // Массив всех доступных видео-уроков
let allAssignments = [];      // Массив всех доступных заданий
let mySubmissions = [];       // Массив выполненных заданий текущего пользователя
let currentFilter = 'all';    // Текущий фильтр для отображения уроков (all, mathematics, informatics)
let userProgress = [];        // Прогресс пользователя по урокам
let currentTab = 'videos';    // Текущая активная вкладка (videos, assignments, progress)

// Переменные для учителя
let teacherVideos = [];       // Видео, созданные текущим учителем
let teacherAssignments = [];  // Задания, созданные текущим учителем
let teacherSubmissions = [];  // Работы учеников по заданиям учителя

/**
 * Загрузка всех уроков, заданий и данных для личного кабинета
 * Эта функция вызывается при загрузке страницы и определяет, какой интерфейс показывать:
 * - Для ученика: список видео, заданий и прогресс
 * - Для учителя: панель управления с возможностью создания контента
 */
async function loadLessons() {
  const container = document.getElementById('lessonsContainer');
  
  try {
    // Проверка авторизации пользователя (асинхронная функция из auth.js)
    const isAuthenticated = await requireAuth();
    if (!isAuthenticated) {
      // Если пользователь не авторизован, функция requireAuth() перенаправит на страницу входа
      return;
    }
    
    // Получаем данные пользователя из localStorage
    let user = getUser();
    if (user) {
      // ВАЖНО: Всегда получаем свежие данные с сервера, чтобы subjects были актуальными
      // Используем getProfile, который делает запрос к /api/auth/profile
      try {
        const profileData = await getProfile();
        console.log('=== ПРОФИЛЬ ПОЛУЧЕН С СЕРВЕРА ===');
        console.log('Полный профиль:', profileData);
        console.log('Subjects в профиле:', profileData?.subjects);
        console.log('Тип subjects:', typeof profileData?.subjects);
        console.log('Subjects массив?', Array.isArray(profileData?.subjects));
        
        if (profileData && typeof profileData === 'object') {
          user = profileData;
          setUser(profileData);
          console.log('✅ Данные пользователя обновлены в localStorage');
          console.log('✅ Subjects в localStorage:', getUser()?.subjects);
        } else {
          console.error('❌ Профиль не получен или неверный формат');
        }
      } catch (error) {
        console.error('❌ Ошибка при получении профиля:', error);
        // Fallback: пробуем через validateToken
        try {
          const tokenData = await validateToken();
          if (tokenData && typeof tokenData === 'object') {
            user = tokenData;
            setUser(tokenData);
            console.log('✅ Данные получены через validateToken, subjects:', tokenData.subjects);
          }
        } catch (tokenError) {
          console.error('❌ Ошибка при получении данных через validateToken:', tokenError);
        }
      }
      
      const userNameHeader = document.getElementById('userNameHeader');
      const userName = document.getElementById('userName');
      if (userNameHeader) userNameHeader.textContent = user.name;
      if (userName) userName.textContent = user.name;
      
      // Проверка на вход от админа
      const isAdminImpersonation = localStorage.getItem('isAdminImpersonation') === 'true';
      if (isAdminImpersonation) {
        // Показать кнопку возврата в админ панель
        const returnToAdminBtn = document.getElementById('returnToAdminBtn');
        if (returnToAdminBtn) {
          returnToAdminBtn.style.display = 'block';
        }
      }
      
      // Егер мұғалім болса, басқа интерфейс көрсету
      if (user.role === 'teacher') {
        console.log('Загрузка панели учителя...');
        await loadTeacherDashboard();
        return;
      }
    }
    
    console.log('Загрузка данных для ученика...');
    
    // Сабақтарды, прогресс, тапсырмалар және жіберулерді жүктеу
    try {
      const [lessons, progress, assignments, submissions, tests, testResults] = await Promise.all([
        getVideos().catch(() => []),
        getProgress().catch(() => []),
        getAssignments().catch(() => []),
        getMySubmissions().catch(() => []),
        getTests().catch(() => []),
        getMyTestResults().catch(() => [])
      ]);
      
      // Получить выбранные предметы ученика (используем обновленные данные из переменной user)
      const currentUser = user || getUser(); // Используем обновленного пользователя
      
      // Улучшенная обработка subjects: обрабатываем null, пустые массивы и невалидные значения
      let userSubjects = null;
      
      console.log('Обработка subjects для пользователя:', {
        hasUser: !!currentUser,
        hasSubjects: !!currentUser?.subjects,
        subjectsValue: currentUser?.subjects,
        subjectsType: typeof currentUser?.subjects,
        isArray: Array.isArray(currentUser?.subjects),
        userRole: currentUser?.role
      });
      
      if (currentUser && currentUser.subjects !== undefined && currentUser.subjects !== null) {
        if (Array.isArray(currentUser.subjects)) {
          // Если subjects уже массив
          if (currentUser.subjects.length > 0) {
            userSubjects = currentUser.subjects;
            console.log('Subjects из массива:', userSubjects);
          } else {
            console.warn('Subjects - пустой массив');
          }
        } else if (typeof currentUser.subjects === 'string') {
          // Если subjects - строка, пытаемся распарсить JSON
          try {
            const parsed = JSON.parse(currentUser.subjects);
            if (Array.isArray(parsed) && parsed.length > 0) {
              userSubjects = parsed;
              console.log('Subjects распарсены из строки:', userSubjects);
            } else {
              console.warn('Subjects распарсены, но не массив или пустой:', parsed);
            }
          } catch (e) {
            console.error('Ошибка парсинга subjects из строки:', e, 'Строка:', currentUser.subjects);
          }
        } else {
          console.warn('Subjects неожиданный тип:', typeof currentUser.subjects, currentUser.subjects);
        }
      } else {
        console.warn('Subjects отсутствуют или null для пользователя ID:', currentUser?.id, 'Role:', currentUser?.role);
      }
      
      console.log('Текущий пользователь:', currentUser);
      console.log('Выбранные предметы (финальные):', userSubjects);
      
      // Фильтровать по выбранным предметам (только для учеников)
      let filteredLessons = Array.isArray(lessons) ? lessons : [];
      let filteredAssignments = Array.isArray(assignments) ? assignments : [];
      
      if (currentUser && currentUser.role === 'student' && userSubjects && Array.isArray(userSubjects) && userSubjects.length > 0) {
        console.log('Фильтрация по предметам:', userSubjects);
        console.log('Всего видео до фильтрации:', filteredLessons.length);
        console.log('Всего заданий до фильтрации:', filteredAssignments.length);
        
        // Фильтровать видео по выбранным предметам
        filteredLessons = filteredLessons.filter(lesson => {
          // Преобразовать subject в формат, который используется в базе
          const lessonSubject = lesson.subject === 'mathematics' ? 'mathematics' : 
                               lesson.subject === 'informatics' ? 'informatics' : null;
          const matches = lessonSubject && userSubjects.includes(lessonSubject);
          if (!matches) {
            console.log('Видео отфильтровано:', lesson.title, 'предмет:', lesson.subject);
          }
          return matches;
        });
        
        // Фильтровать задания по выбранным предметам
        filteredAssignments = filteredAssignments.filter(assignment => {
          const assignmentSubject = assignment.subject === 'mathematics' ? 'mathematics' : 
                                   assignment.subject === 'informatics' ? 'informatics' : null;
          const matches = assignmentSubject && userSubjects.includes(assignmentSubject);
          if (!matches) {
            console.log('Задание отфильтровано:', assignment.title, 'предмет:', assignment.subject);
          }
          return matches;
        });
        
        console.log('Видео после фильтрации:', filteredLessons.length);
        console.log('Задания после фильтрации:', filteredAssignments.length);
      } else {
        // Если у студента нет subjects или они пустые, показываем предупреждение
        if (currentUser && currentUser.role === 'student') {
          console.warn('У студента не выбраны предметы. Показываем все материалы.');
          // Можно показать уведомление пользователю, что нужно выбрать предметы
        }
        console.log('Фильтрация не применена:', {
          isStudent: currentUser && currentUser.role === 'student',
          hasSubjects: !!userSubjects,
          subjectsArray: Array.isArray(userSubjects),
          subjectsLength: userSubjects ? userSubjects.length : 0
        });
      }
      
      allLessons = filteredLessons;
      userProgress = Array.isArray(progress) ? progress : [];
      allAssignments = filteredAssignments;
      mySubmissions = Array.isArray(submissions) ? submissions : [];
      allTests = Array.isArray(tests) ? tests : [];
      myTestResults = Array.isArray(testResults) ? testResults : [];
      
      console.log('Загружено данных:', {
        lessons: allLessons.length,
        progress: userProgress.length,
        assignments: allAssignments.length,
        submissions: mySubmissions.length,
        tests: allTests.length,
        testResults: myTestResults.length
      });
      
      // Статистиканы есептеу (но не показывать сразу)
      calculateAndDisplayStats();
      const statsContainer = document.getElementById('statsContainer');
      if (statsContainer) statsContainer.style.display = 'none';
      
      // Ағымдағы вкладканы көрсету
      // Небольшая задержка для гарантии, что DOM готов
      setTimeout(() => {
        console.log('Отображение текущей вкладки:', currentTab);
        displayCurrentTab();
      }, 100);
    } catch (error) {
      console.error('Деректерді жүктеу қатесі:', error);
    }
  } catch (error) {
    console.error('Сабақтарды жүктеу қатесі:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Сабақтарды жүктеу мүмкін болмады. Кейінірек қайталаңыз.</p>
      </div>
    `;
  }
}

// Сабақтарды көрсету
function displayLessons() {
  const container = document.getElementById('lessonsContainer');
  
  if (!container) {
    console.error('lessonsContainer не найден');
    // Попробуем найти контейнер снова через небольшую задержку
    setTimeout(() => {
      const retryContainer = document.getElementById('lessonsContainer');
      if (retryContainer) {
        displayLessons();
      }
    }, 200);
    return;
  }
  
  console.log('Отображение уроков. Всего уроков:', allLessons ? allLessons.length : 0);
  
  // Убедиться, что данные загружены
  if (!allLessons || allLessons === undefined || allLessons === null) {
    console.warn('allLessons не загружены, ожидание...');
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Сабақтар жүктелуде...</p>
      </div>
    `;
    setTimeout(() => displayLessons(), 200);
    return;
  }
  
  // Фильтрлеу
  let filteredLessons = Array.isArray(allLessons) ? allLessons : [];
  if (currentFilter !== 'all') {
    filteredLessons = filteredLessons.filter(lesson => lesson.subject === currentFilter);
  }
  
  console.log('Отфильтровано уроков:', filteredLessons.length);
  
  if (filteredLessons.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h3 data-translate="dashboard_no_lessons">Сабақтар әлі жоқ</h3>
        <p>Сабақтар әлі қосылмаған. Кейінірек қайталаңыз.</p>
      </div>
    `;
    return;
  }
  
  // Прогресс картасын құру
  const progressMap = {};
  userProgress.forEach(p => {
    progressMap[p.video_id] = p;
  });
  
  container.innerHTML = `
    <div class="lessons-grid">
      ${filteredLessons.map(lesson => {
        const progress = progressMap[lesson.id];
        const isCompleted = progress && progress.completed === 1;
        const isInProgress = progress && progress.completed === 0;
        
        let statusClass = 'not-started';
        let statusText = 'Басталмаған';
        
        if (isCompleted) {
          statusClass = 'completed';
          statusText = 'Аяқталды';
        } else if (isInProgress) {
          statusClass = 'in-progress';
          statusText = 'Жалғасуда';
        }
        
        const subjectClass = lesson.subject === 'mathematics' ? 'math' : 'informatics';
        const subjectText = lesson.subject === 'mathematics' ? 'Математика' : 'Информатика';
        
        return `
          <div class="lesson-card" onclick="openLesson(${lesson.id})">
            <div class="lesson-card-header">
              <div>
                <h3 class="lesson-card-title">${escapeHtml(lesson.title)}</h3>
                <span class="lesson-card-subject ${subjectClass}">${subjectText}</span>
              </div>
            </div>
            <p class="lesson-card-description">${escapeHtml(lesson.description || 'Сипаттама жоқ')}</p>
            <div class="lesson-card-footer">
              <span class="lesson-progress">
                ${progress ? `Көрілген: ${Math.round((progress.watched_seconds || 0) / 60)} мин` : 'Көрілмеген'}
              </span>
              <span class="lesson-status ${statusClass}">${statusText}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Сабақты ашу
function openLesson(lessonId) {
  window.location.href = `lesson.html?id=${lessonId}`;
}

// Фильтрлеу
function filterLessons(subject) {
  currentFilter = subject;
  
  // Табы активті ету
  document.querySelectorAll('.subject-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-subject') === subject) {
      tab.classList.add('active');
    }
  });
  
  displayLessons();
}

// HTML экранизация
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Статистиканы есептеу және көрсету
function calculateAndDisplayStats() {
  const statsContainer = document.getElementById('statsContainer');
  if (!statsContainer) return;
  
  // Видео статистикасы
  const videosWatched = userProgress.length;
  const videosCompleted = userProgress.filter(p => p.completed === 1).length;
  
  // Тапсырма статистикасы
  const assignmentsDone = mySubmissions.length;
  const gradedSubmissions = mySubmissions.filter(s => s.grade !== null);
  const averageGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length)
    : null;
  
  // Статистиканы көрсету
  document.getElementById('statVideosWatched').textContent = videosWatched;
  document.getElementById('statVideosCompleted').textContent = videosCompleted;
  document.getElementById('statAssignmentsDone').textContent = assignmentsDone;
  document.getElementById('statAverageGrade').textContent = averageGrade !== null ? averageGrade : '-';
  
  statsContainer.style.display = 'grid';
}

// switchTab уже объявлена выше в начале файла
// Переопределение не требуется - функция уже полная

// Ағымдағы вкладканы көрсету
function displayCurrentTab() {
  console.log('displayCurrentTab вызвана, currentTab:', currentTab);
  
  const statsContainer = document.getElementById('statsContainer');
  
  // Сначала показываем нужную вкладку
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  
  const activeTab = document.getElementById(`${currentTab}Tab`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.style.display = 'block';
    console.log('Активирована вкладка:', currentTab);
  } else {
    console.error('Вкладка не найдена:', `${currentTab}Tab`);
  }
  
  switch(currentTab) {
    case 'videos':
      if (statsContainer) statsContainer.style.display = 'none';
      // Небольшая задержка, чтобы вкладка успела отобразиться
      setTimeout(() => {
        console.log('Отображение видео...');
        displayLessons();
      }, 50);
      break;
    case 'assignments':
      if (statsContainer) statsContainer.style.display = 'none';
      setTimeout(() => {
        console.log('Отображение заданий...');
        displayAssignments();
      }, 50);
      break;
    case 'tests':
      if (statsContainer) statsContainer.style.display = 'none';
      setTimeout(() => {
        console.log('Отображение тестов...');
        loadTests();
      }, 50);
      break;
    case 'progress':
      if (statsContainer) statsContainer.style.display = 'grid';
      setTimeout(() => {
        console.log('Отображение прогресса...');
        displayProgress();
      }, 50);
      break;
    default:
      console.warn('Неизвестная вкладка:', currentTab);
  }
}

// Тапсырмаларды көрсету
async function displayAssignments() {
  const container = document.getElementById('assignmentsContainer');
  if (!container) {
    console.error('assignmentsContainer не найден');
    return;
  }
  
  // Убедиться, что данные загружены
  if (!allAssignments || allAssignments === undefined || allAssignments === null) {
    console.warn('allAssignments не загружены, ожидание...');
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Тапсырмалар жүктелуде...</p>
      </div>
    `;
    setTimeout(() => displayAssignments(), 200);
    return;
  }
  
  const assignments = Array.isArray(allAssignments) ? allAssignments : [];
  
  if (assignments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>Тапсырмалар әлі жоқ</h3>
        <p>Тапсырмалар әлі қосылмаған. Кейінірек қайталаңыз.</p>
      </div>
    `;
    return;
  }
  
  // Жіберулер картасы
  const submissionsMap = {};
  const submissions = Array.isArray(mySubmissions) ? mySubmissions : [];
  submissions.forEach(s => {
    submissionsMap[s.assignment_id] = s;
  });
  
  container.innerHTML = `
    <div class="assignments-grid">
      ${assignments.map(assignment => {
        const submission = submissionsMap[assignment.id];
        let statusClass = 'new';
        let statusText = 'Жаңа';
        let gradeDisplay = '';
        
        if (submission) {
          if (submission.grade !== null) {
            statusClass = 'graded';
            statusText = 'Тексерілген';
            gradeDisplay = `<div class="assignment-grade">Балл: ${submission.grade}</div>`;
          } else {
            statusClass = 'submitted';
            statusText = 'Жіберілген';
          }
        }
        
        // Дедлайн тексеру
        let deadlineDisplay = '';
        let deadlineClass = '';
        if (assignment.deadline) {
          const deadline = new Date(assignment.deadline);
          const now = new Date();
          const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
          
          if (daysLeft < 0) {
            deadlineDisplay = `Мерзімі өтті (${Math.abs(daysLeft)} күн бұрын)`;
            deadlineClass = 'urgent';
          } else if (daysLeft === 0) {
            deadlineDisplay = 'Мерзімі бүгін';
            deadlineClass = 'urgent';
          } else if (daysLeft <= 3) {
            deadlineDisplay = `Қалды: ${daysLeft} күн`;
            deadlineClass = 'urgent';
          } else {
            deadlineDisplay = `Мерзімі: ${deadline.toLocaleDateString('kk-KZ')}`;
          }
        }
        
        const subjectClass = assignment.subject === 'mathematics' ? 'math' : 'informatics';
        const subjectText = assignment.subject === 'mathematics' ? 'Математика' : 'Информатика';
        
        return `
          <div class="assignment-card">
            <div class="assignment-header">
              <div style="flex: 1;">
                <h3 class="assignment-title">${escapeHtml(assignment.title)}</h3>
                <span class="lesson-card-subject ${subjectClass}">${subjectText}</span>
              </div>
              <span class="assignment-status ${statusClass}">${statusText}</span>
            </div>
            ${deadlineDisplay ? `<div class="assignment-deadline ${deadlineClass}">${deadlineDisplay}</div>` : ''}
            <p class="lesson-card-description">${escapeHtml(assignment.description || 'Сипаттама жоқ')}</p>
            ${gradeDisplay}
            <div style="margin-top: 16px;">
              <button class="btn btn-primary" onclick="openAssignment(${assignment.id})">
                ${submission ? 'Көру' : 'Орындау'}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Прогресс көрсету
function displayProgress() {
  const container = document.getElementById('progressContainer');
  if (!container) {
    console.error('progressContainer не найден');
    return;
  }
  
  console.log('Отображение прогресса...', {
    lessons: allLessons.length,
    progress: userProgress.length,
    assignments: allAssignments.length,
    tests: allTests.length,
    testResults: myTestResults.length
  });
  
  // Прогресс бойынша топтау
  const progressBySubject = {
    mathematics: [],
    informatics: []
  };
  
  userProgress.forEach(p => {
    if (p.subject === 'mathematics') {
      progressBySubject.mathematics.push(p);
    } else if (p.subject === 'informatics') {
      progressBySubject.informatics.push(p);
    }
  });
  
  // Общее количество видео по предметам
  const mathVideos = allLessons.filter(l => l.subject === 'mathematics');
  const infoVideos = allLessons.filter(l => l.subject === 'informatics');
  
  let html = '';
  
  // Математика прогрессі
  const mathCompleted = progressBySubject.mathematics.filter(p => p.completed === 1).length;
  const mathWatched = progressBySubject.mathematics.length;
  const mathTotal = mathVideos.length;
  const mathPercent = mathTotal > 0 ? Math.round((mathCompleted / mathTotal) * 100) : 0;
  const mathWatchedPercent = mathTotal > 0 ? Math.round((mathWatched / mathTotal) * 100) : 0;
  
  html += `
    <div class="progress-section">
      <h3>📐 Математика</h3>
      <div class="progress-item">
        <span class="progress-item-title">Аяқталған сабақтар</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${mathPercent}%"></div>
        </div>
        <span class="progress-percent">${mathCompleted}/${mathTotal} (${mathPercent}%)</span>
      </div>
      <div class="progress-item">
        <span class="progress-item-title">Басталған сабақтар</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${mathWatchedPercent}%; background: rgba(99, 102, 241, 0.5);"></div>
        </div>
        <span class="progress-percent">${mathWatched}/${mathTotal} (${mathWatchedPercent}%)</span>
      </div>
    </div>
  `;
  
  // Информатика прогрессі
  const infoCompleted = progressBySubject.informatics.filter(p => p.completed === 1).length;
  const infoWatched = progressBySubject.informatics.length;
  const infoTotal = infoVideos.length;
  const infoPercent = infoTotal > 0 ? Math.round((infoCompleted / infoTotal) * 100) : 0;
  const infoWatchedPercent = infoTotal > 0 ? Math.round((infoWatched / infoTotal) * 100) : 0;
  
  html += `
    <div class="progress-section">
      <h3>💻 Информатика</h3>
      <div class="progress-item">
        <span class="progress-item-title">Аяқталған сабақтар</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${infoPercent}%"></div>
        </div>
        <span class="progress-percent">${infoCompleted}/${infoTotal} (${infoPercent}%)</span>
      </div>
      <div class="progress-item">
        <span class="progress-item-title">Басталған сабақтар</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${infoWatchedPercent}%; background: rgba(139, 92, 246, 0.5);"></div>
        </div>
        <span class="progress-percent">${infoWatched}/${infoTotal} (${infoWatchedPercent}%)</span>
      </div>
    </div>
  `;
  
  // Жалпы статистика
  const totalVideos = allLessons.length;
  const totalWatched = userProgress.length;
  const totalCompleted = userProgress.filter(p => p.completed === 1).length;
  const overallPercent = totalVideos > 0 ? Math.round((totalCompleted / totalVideos) * 100) : 0;
  const overallWatchedPercent = totalVideos > 0 ? Math.round((totalWatched / totalVideos) * 100) : 0;
  
  html += `
    <div class="progress-section">
      <h3>📈 Жалпы прогресс</h3>
      <div class="progress-item">
        <span class="progress-item-title">Аяқталған сабақтар</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${overallPercent}%"></div>
        </div>
        <span class="progress-percent">${totalCompleted}/${totalVideos} (${overallPercent}%)</span>
      </div>
      <div class="progress-item">
        <span class="progress-item-title">Басталған сабақтар</span>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${overallWatchedPercent}%; background: rgba(99, 102, 241, 0.5);"></div>
        </div>
        <span class="progress-percent">${totalWatched}/${totalVideos} (${overallWatchedPercent}%)</span>
      </div>
    </div>
  `;
  
  // Детальная статистика по заданиям
  const assignmentsDone = mySubmissions.length;
  const assignmentsGraded = mySubmissions.filter(s => s.grade !== null).length;
  const assignmentsTotal = allAssignments.length;
  const assignmentsPercent = assignmentsTotal > 0 ? Math.round((assignmentsDone / assignmentsTotal) * 100) : 0;
  
  if (assignmentsTotal > 0) {
    html += `
      <div class="progress-section">
        <h3>📝 Тапсырмалар статистикасы</h3>
        <div class="progress-item">
          <span class="progress-item-title">Орындалған тапсырмалар</span>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${assignmentsPercent}%"></div>
          </div>
          <span class="progress-percent">${assignmentsDone}/${assignmentsTotal} (${assignmentsPercent}%)</span>
        </div>
        <div class="progress-item">
          <span class="progress-item-title">Тексерілген тапсырмалар</span>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${assignmentsTotal > 0 ? Math.round((assignmentsGraded / assignmentsTotal) * 100) : 0}%; background: #10b981;"></div>
          </div>
          <span class="progress-percent">${assignmentsGraded}/${assignmentsTotal}</span>
        </div>
      </div>
    `;
  }
  
  // Статистика по тестам
  const testsTotal = allTests.length;
  const testsCompleted = myTestResults.length;
  const testsPassed = myTestResults.filter(r => r.passed === 1).length;
  const testsPercent = testsTotal > 0 ? Math.round((testsCompleted / testsTotal) * 100) : 0;
  const testsPassedPercent = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
  const averageTestScore = myTestResults.length > 0
    ? Math.round(myTestResults.reduce((sum, r) => sum + r.percentage, 0) / myTestResults.length)
    : null;
  
  if (testsTotal > 0) {
    html += `
      <div class="progress-section">
        <h3>📋 Тесттер статистикасы</h3>
        <div class="progress-item">
          <span class="progress-item-title">Орындалған тесттер</span>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${testsPercent}%"></div>
          </div>
          <span class="progress-percent">${testsCompleted}/${testsTotal} (${testsPercent}%)</span>
        </div>
        <div class="progress-item">
          <span class="progress-item-title">Өткен тесттер</span>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${testsPassedPercent}%; background: #10b981;"></div>
          </div>
          <span class="progress-percent">${testsPassed}/${testsTotal} (${testsPassedPercent}%)</span>
        </div>
        ${averageTestScore !== null ? `
          <div class="progress-item">
            <span class="progress-item-title">Орташа балл</span>
            <span class="progress-percent">${averageTestScore}%</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  if (html === '') {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>Прогресс жоқ</h3>
        <p>Сіз әлі сабақтарды көрмегенсіз. Сабақтарды бастаңыз!</p>
      </div>
    `;
  } else {
    container.innerHTML = html;
  }
  
  console.log('Прогресс отображен успешно');
}

// Тапсырманы ашу
function openAssignment(assignmentId) {
  window.location.href = `assignment.html?id=${assignmentId}`;
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
  // Убеждаемся, что вкладка videos активна по умолчанию
  currentTab = 'videos';
  const videosTab = document.getElementById('videosTab');
  if (videosTab) {
    videosTab.classList.add('active');
  }
  
  // Активируем первую кнопку в боковой панели
  const firstNavItem = document.querySelector('.sidebar-nav-item[data-tab="videos"]');
  if (firstNavItem) {
    firstNavItem.classList.add('active');
  }
  
  loadLessons();
});

// Вернуться в админ панель
function returnToAdmin() {
  const adminToken = localStorage.getItem('adminTokenBackup');
  const adminUser = localStorage.getItem('adminUserBackup');
  
  if (adminToken && adminUser) {
    // Восстановить админ токен
    localStorage.setItem('adminToken', adminToken);
    localStorage.setItem('adminUser', adminUser);
    
    // Удалить данные ученика и флаг импersonation
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminTokenBackup');
    localStorage.removeItem('adminUserBackup');
    localStorage.removeItem('isAdminImpersonation');
    
    // Перенаправить в админ панель
    window.location.href = '/admin-panel.html';
  } else {
    alert('Админ деректері табылмады. Админ панеліне қайта кіру қажет.');
    window.location.href = '/admin-login.html';
  }
}

// ========== TEACHER DASHBOARD ==========

// Переменные teacherVideos, teacherAssignments, teacherSubmissions уже объявлены выше
let currentEditVideoId = null;
let currentEditAssignmentId = null;
let teacherTests = [];          // Тесты, созданные текущим учителем
let currentEditTestId = null;
let allTests = [];              // Все доступные тесты для учеников
let myTestResults = [];         // Результаты тестов ученика

// Загрузка панели учителя
async function loadTeacherDashboard() {
  const user = getUser();
  if (!user || user.role !== 'teacher') {
    return;
  }
  
  // Показать навигацию для учителя
  const studentNav = document.querySelectorAll('.sidebar-nav-item[data-tab="videos"], .sidebar-nav-item[data-tab="assignments"], .sidebar-nav-item[data-tab="progress"]');
  const teacherNav = document.getElementById('teacherNav');
  
  studentNav.forEach(item => item.style.display = 'none');
  if (teacherNav) {
    teacherNav.style.display = 'block';
  }
  
  // Скрыть вкладки для учеников
  const videosTab = document.getElementById('videosTab');
  const assignmentsTab = document.getElementById('assignmentsTab');
  const progressTab = document.getElementById('progressTab');
  const testsTab = document.getElementById('testsTab');
  
  if (videosTab) videosTab.style.display = 'none';
  if (assignmentsTab) assignmentsTab.style.display = 'none';
  if (progressTab) progressTab.style.display = 'none';
  if (testsTab) testsTab.style.display = 'none';
  
  // Скрыть кнопку "Тесттер" в навигации для учителей
  const testsNavButton = document.querySelector('.sidebar-nav-item[data-tab="tests"]');
  if (testsNavButton) {
    testsNavButton.style.display = 'none';
  }
  
  // Загрузить данные сначала
  try {
    await Promise.all([
      loadMyVideos(),
      loadMyAssignments(),
      loadMyTests(),
      loadSubmissions(),
      loadTeacherStats()
    ]);
    
    // Показать первую вкладку учителя после загрузки данных
    switchTab('my-videos');
  } catch (error) {
    console.error('Ошибка загрузки данных учителя:', error);
  }
}

// Загрузка видео учителя
async function loadMyVideos() {
  try {
    const videos = await getVideos();
    // Фильтровать только свои видео
    const user = getUser();
    teacherVideos = videos.filter(v => v.teacher_id === user.id);
    
    renderMyVideos();
  } catch (error) {
    console.error('Видеоларды жүктеу қатесі:', error);
    document.getElementById('myVideosContainer').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Видеоларды жүктеу мүмкін болмады.</p>
      </div>
    `;
  }
}

// Отображение видео учителя
function renderMyVideos() {
  const container = document.getElementById('myVideosContainer');
  
  if (!container) {
    console.error('myVideosContainer не найден');
    return;
  }
  
  if (teacherVideos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📹</div>
        <h3>Видеолар жоқ</h3>
        <p>Сіз әлі видеолар қосмағансыз. Алғашқы видеоны қосыңыз!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = teacherVideos.map(video => {
    const subjectText = video.subject === 'mathematics' ? 'Математика' : 'Информатика';
    const date = new Date(video.created_at).toLocaleDateString('kz-KZ');
    
    return `
      <div class="teacher-video-card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <h3>${video.title}</h3>
            <p style="color: var(--text-secondary); margin: 8px 0;">${video.description || ''}</p>
            <div style="display: flex; gap: 12px; margin-top: 12px;">
              <span style="padding: 4px 12px; background: ${video.subject === 'mathematics' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(139, 92, 246, 0.1)'}; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: ${video.subject === 'mathematics' ? '#6366f1' : '#8b5cf6'};">${subjectText}</span>
              <span style="color: var(--text-secondary); font-size: 0.875rem;">${date}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="editVideo(${video.id})" style="padding: 8px 16px; font-size: 0.875rem;">Өзгерту</button>
          <button class="btn btn-danger" onclick="deleteMyVideo(${video.id})" style="padding: 8px 16px; font-size: 0.875rem; background: #e74c3c;">Жою</button>
          <a href="lesson.html?id=${video.id}" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.875rem; text-decoration: none; display: inline-block;">Көру</a>
        </div>
      </div>
    `;
  }).join('');
}

// Загрузка заданий учителя
async function loadMyAssignments() {
  try {
    const assignments = await getAssignments();
    // Фильтровать только свои задания
    const user = getUser();
    teacherAssignments = assignments.filter(a => a.teacher_id === user.id);
    
    renderMyAssignments();
  } catch (error) {
    console.error('Тапсырмаларды жүктеу қатесі:', error);
    document.getElementById('myAssignmentsContainer').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Тапсырмаларды жүктеу мүмкін болмады.</p>
      </div>
    `;
  }
}

// Отображение заданий учителя
function renderMyAssignments() {
  const container = document.getElementById('myAssignmentsContainer');
  
  if (!container) {
    console.error('myAssignmentsContainer не найден');
    return;
  }
  
  if (teacherAssignments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>Тапсырмалар жоқ</h3>
        <p>Сіз әлі тапсырмалар қосмағансыз. Алғашқы тапсырманы қосыңыз!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = teacherAssignments.map(assignment => {
    const subjectText = assignment.subject === 'mathematics' ? 'Математика' : 'Информатика';
    const date = new Date(assignment.created_at).toLocaleDateString('kz-KZ');
    const deadline = assignment.deadline ? new Date(assignment.deadline).toLocaleDateString('kz-KZ') : 'Мерзімсіз';
    
    return `
      <div class="teacher-assignment-card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <h3>${assignment.title}</h3>
            <p style="color: var(--text-secondary); margin: 8px 0;">${assignment.description || ''}</p>
            <div style="display: flex; gap: 12px; margin-top: 12px;">
              <span style="padding: 4px 12px; background: ${assignment.subject === 'mathematics' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(139, 92, 246, 0.1)'}; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: ${assignment.subject === 'mathematics' ? '#6366f1' : '#8b5cf6'};">${subjectText}</span>
              <span style="color: var(--text-secondary); font-size: 0.875rem;">Мерзімі: ${deadline}</span>
              <span style="color: var(--text-secondary); font-size: 0.875rem;">${date}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="editAssignment(${assignment.id})" style="padding: 8px 16px; font-size: 0.875rem;">Өзгерту</button>
          <button class="btn btn-danger" onclick="deleteMyAssignment(${assignment.id})" style="padding: 8px 16px; font-size: 0.875rem; background: #e74c3c;">Жою</button>
          <a href="assignment.html?id=${assignment.id}" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.875rem; text-decoration: none; display: inline-block;">Көру</a>
        </div>
      </div>
    `;
  }).join('');
}

// Загрузка выполненных заданий
async function loadSubmissions() {
  try {
    // Убедиться, что задания загружены
    if (teacherAssignments.length === 0) {
      await loadMyAssignments();
    }
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/submissions/all`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Жіберулерді алу қатесі');
    }
    
    const allSubmissions = await response.json();
    const user = getUser();
    
    // Фильтровать только по своим заданиям
    teacherSubmissions = allSubmissions.filter(s => {
      return teacherAssignments.some(a => a.id === s.assignment_id);
    });
    
    // Применить фильтр
    const filter = document.getElementById('submissionFilter')?.value || 'all';
    let filtered = teacherSubmissions;
    if (filter === 'ungraded') {
      filtered = teacherSubmissions.filter(s => s.grade === null);
    } else if (filter === 'graded') {
      filtered = teacherSubmissions.filter(s => s.grade !== null);
    }
    
    renderSubmissions(filtered);
  } catch (error) {
    console.error('Жіберулерді жүктеу қатесі:', error);
    document.getElementById('submissionsContainer').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Жіберулерді жүктеу мүмкін болмады.</p>
      </div>
    `;
  }
}

// Отображение выполненных заданий
function renderSubmissions(submissions) {
  const container = document.getElementById('submissionsContainer');
  
  if (submissions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📤</div>
        <h3>Жіберулер жоқ</h3>
        <p>Оқушылар әлі тапсырмаларды жібермеген.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = submissions.map(submission => {
    const assignment = teacherAssignments.find(a => a.id === submission.assignment_id);
    const isGraded = submission.grade !== null;
    const gradeClass = isGraded ? 'graded' : 'ungraded';
    
    return `
      <div class="submission-card ${gradeClass}">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0;">${assignment?.title || 'Тапсырма'}</h3>
            <p style="color: var(--text-secondary); margin: 4px 0;"><strong>Оқушы:</strong> ${submission.student_name}</p>
            <p style="color: var(--text-secondary); margin: 4px 0;"><strong>Күні:</strong> ${new Date(submission.created_at).toLocaleDateString('kz-KZ')}</p>
            ${submission.answer_text ? `<p style="margin: 12px 0; padding: 12px; background: var(--bg-gray-50); border-radius: 8px;">${submission.answer_text}</p>` : ''}
            ${submission.file_url ? `<p style="margin: 8px 0;"><a href="${submission.file_url}" target="_blank" style="color: var(--primary-color);">Файлды ашу</a></p>` : ''}
            ${isGraded ? `
              <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                <p style="margin: 0;"><strong>Балл:</strong> ${submission.grade}</p>
                ${submission.teacher_comment ? `<p style="margin: 8px 0 0 0;"><strong>Пікір:</strong> ${submission.teacher_comment}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        ${!isGraded ? `
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-primary" onclick="openGradeModal(${submission.id})" style="padding: 8px 16px; font-size: 0.875rem;">Бағалау</button>
          </div>
        ` : `
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-secondary" onclick="openGradeModal(${submission.id})" style="padding: 8px 16px; font-size: 0.875rem;">Бағаны өзгерту</button>
          </div>
        `}
      </div>
    `;
  }).join('');
}

// Загрузка статистики учителя
async function loadTeacherStats() {
  try {
    const user = getUser();
    const stats = {
      videosCount: teacherVideos.length,
      assignmentsCount: teacherAssignments.length,
      submissionsCount: teacherSubmissions.length,
      ungradedCount: teacherSubmissions.filter(s => s.grade === null).length,
      averageGrade: 0
    };
    
    const gradedSubmissions = teacherSubmissions.filter(s => s.grade !== null);
    if (gradedSubmissions.length > 0) {
      stats.averageGrade = Math.round(
        gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length
      );
    }
    
    renderTeacherStats(stats);
  } catch (error) {
    console.error('Статистиканы жүктеу қатесі:', error);
  }
}

// Отображение статистики учителя
function renderTeacherStats(stats) {
  const container = document.getElementById('teacherStatsContainer');
  
  container.innerHTML = `
    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <div class="stat-card">
        <div class="stat-icon">📹</div>
        <div class="stat-content">
          <div class="stat-value">${stats.videosCount}</div>
          <div class="stat-label">Видеолар</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <div class="stat-value">${stats.assignmentsCount}</div>
          <div class="stat-label">Тапсырмалар</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📤</div>
        <div class="stat-content">
          <div class="stat-value">${stats.submissionsCount}</div>
          <div class="stat-label">Жіберулер</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-value">${stats.ungradedCount}</div>
          <div class="stat-label">Бағаланбаған</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-value">${stats.averageGrade || '-'}</div>
          <div class="stat-label">Орташа балл</div>
        </div>
      </div>
    </div>
  `;
}

// Открытие модального окна для создания видео
function openVideoModal(videoId = null) {
  currentEditVideoId = videoId;
  const modal = document.getElementById('videoModal');
  const form = document.getElementById('videoForm');
  
  if (videoId) {
    const video = teacherVideos.find(v => v.id === videoId);
    if (video) {
      document.getElementById('videoModalTitle').textContent = 'Видеоны өзгерту';
      document.getElementById('videoTitle').value = video.title;
      document.getElementById('videoDescription').value = video.description || '';
      document.getElementById('videoUrl').value = video.youtube_url;
      document.getElementById('videoSubject').value = video.subject;
    }
  } else {
    document.getElementById('videoModalTitle').textContent = 'Видео қосу';
    form.reset();
  }
  
  modal.style.display = 'flex';
  modal.classList.add('active');
}

// Закрытие модального окна видео
function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
  currentEditVideoId = null;
  document.getElementById('videoForm').reset();
}

// Сохранение видео
async function saveVideo(event) {
  event.preventDefault();
  
  const title = document.getElementById('videoTitle').value;
  const description = document.getElementById('videoDescription').value;
  const youtube_url = document.getElementById('videoUrl').value;
  const subject = document.getElementById('videoSubject').value;
  
  try {
    const token = getToken();
    const url = currentEditVideoId 
      ? `${API_BASE_URL}/api/videos/${currentEditVideoId}`
      : `${API_BASE_URL}/api/videos`;
    
    const method = currentEditVideoId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, youtube_url, subject })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Қате');
    }
    
    closeVideoModal();
    await loadMyVideos();
    await loadTeacherStats();
    alert(currentEditVideoId ? 'Видео сәтті жаңартылды' : 'Видео сәтті қосылды');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Редактирование видео
function editVideo(videoId) {
  openVideoModal(videoId);
}

// Удаление видео
async function deleteMyVideo(videoId) {
  if (!confirm('Видеоны жоюға сенімдісіз бе?')) return;
  
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Видеоны жою қатесі');
    }
    
    await loadMyVideos();
    await loadTeacherStats();
    alert('Видео сәтті жойылды');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Открытие модального окна для создания задания
async function openAssignmentModal(assignmentId = null) {
  currentEditAssignmentId = assignmentId;
  const modal = document.getElementById('assignmentModal');
  const form = document.getElementById('assignmentForm');
  
  // Загрузить видео для выбора
  try {
    const videos = await getVideos();
    const user = getUser();
    const myVideos = videos.filter(v => v.teacher_id === user.id);
    const videoSelect = document.getElementById('assignmentVideo');
    videoSelect.innerHTML = '<option value="">Видео таңдамау</option>' + 
      myVideos.map(v => `<option value="${v.id}">${v.title}</option>`).join('');
  } catch (error) {
    console.error('Видеоларды жүктеу қатесі:', error);
  }
  
  if (assignmentId) {
    const assignment = teacherAssignments.find(a => a.id === assignmentId);
    if (assignment) {
      document.getElementById('assignmentModalTitle').textContent = 'Тапсырманы өзгерту';
      document.getElementById('assignmentTitle').value = assignment.title;
      document.getElementById('assignmentDescription').value = assignment.description || '';
      document.getElementById('assignmentFileUrl').value = assignment.file_url || '';
      document.getElementById('assignmentSubject').value = assignment.subject;
      document.getElementById('assignmentVideo').value = assignment.video_id || '';
      document.getElementById('assignmentDeadline').value = assignment.deadline ? 
        new Date(assignment.deadline).toISOString().slice(0, 16) : '';
    }
  } else {
    document.getElementById('assignmentModalTitle').textContent = 'Тапсырма қосу';
    form.reset();
  }
  
  modal.style.display = 'flex';
  modal.classList.add('active');
}

// Закрытие модального окна задания
function closeAssignmentModal() {
  const modal = document.getElementById('assignmentModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
  currentEditAssignmentId = null;
  document.getElementById('assignmentForm').reset();
}

// Сохранение задания
async function saveAssignment(event) {
  event.preventDefault();
  
  const title = document.getElementById('assignmentTitle').value;
  const description = document.getElementById('assignmentDescription').value;
  const file_url = document.getElementById('assignmentFileUrl').value;
  const subject = document.getElementById('assignmentSubject').value;
  const video_id = document.getElementById('assignmentVideo').value || null;
  const deadline = document.getElementById('assignmentDeadline').value || null;
  
  try {
    const token = getToken();
    const url = currentEditAssignmentId 
      ? `${API_BASE_URL}/api/assignments/${currentEditAssignmentId}`
      : `${API_BASE_URL}/api/assignments`;
    
    const method = currentEditAssignmentId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, file_url, subject, video_id, deadline })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Қате');
    }
    
    closeAssignmentModal();
    await loadMyAssignments();
    await loadSubmissions();
    await loadTeacherStats();
    alert(currentEditAssignmentId ? 'Тапсырма сәтті жаңартылды' : 'Тапсырма сәтті қосылды');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Редактирование задания
function editAssignment(assignmentId) {
  openAssignmentModal(assignmentId);
}

// Удаление задания
async function deleteMyAssignment(assignmentId) {
  if (!confirm('Тапсырманы жоюға сенімдісіз бе?')) return;
  
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Тапсырманы жою қатесі');
    }
    
    await loadMyAssignments();
    await loadSubmissions();
    await loadTeacherStats();
    alert('Тапсырма сәтті жойылды');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Открытие модального окна для оценки
function openGradeModal(submissionId) {
  const submission = teacherSubmissions.find(s => s.id === submissionId);
  if (!submission) return;
  
  const modal = document.getElementById('submissionModal');
  const content = document.getElementById('submissionContent');
  const assignment = teacherAssignments.find(a => a.id === submission.assignment_id);
  
  content.innerHTML = `
    <form id="gradeForm" onsubmit="saveGrade(event, ${submissionId})">
      <div class="form-group">
        <label><strong>Тапсырма:</strong> ${assignment?.title || 'Тапсырма'}</label>
      </div>
      <div class="form-group">
        <label><strong>Оқушы:</strong> ${submission.student_name}</label>
      </div>
      ${submission.answer_text ? `
        <div class="form-group">
          <label><strong>Жауап:</strong></label>
          <div style="padding: 12px; background: var(--bg-gray-50); border-radius: 8px; margin-top: 8px;">
            ${submission.answer_text}
          </div>
        </div>
      ` : ''}
      ${submission.file_url ? `
        <div class="form-group">
          <label><strong>Файл:</strong></label>
          <p><a href="${submission.file_url}" target="_blank" style="color: var(--primary-color);">Файлды ашу</a></p>
        </div>
      ` : ''}
      <div class="form-group">
        <label>Балл (0-100) *</label>
        <input type="number" id="submissionGrade" min="0" max="100" value="${submission.grade || ''}" required>
      </div>
      <div class="form-group">
        <label>Пікір</label>
        <textarea id="submissionComment" rows="4">${submission.teacher_comment || ''}</textarea>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Сақтау</button>
      </div>
    </form>
  `;
  
  modal.style.display = 'flex';
  modal.classList.add('active');
}

// Закрытие модального окна оценки
function closeSubmissionModal() {
  const modal = document.getElementById('submissionModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
}

// Сохранение оценки
async function saveGrade(event, submissionId) {
  event.preventDefault();
  
  const grade = parseInt(document.getElementById('submissionGrade').value);
  const teacher_comment = document.getElementById('submissionComment').value;
  
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/grade`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ grade, teacher_comment })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Қате');
    }
    
    closeSubmissionModal();
    await loadSubmissions();
    await loadTeacherStats();
    alert('Баға сәтті сақталды');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Глобалды функциялар (должны быть доступны из HTML)
window.filterLessons = filterLessons;
window.openLesson = openLesson;
window.openAssignment = openAssignment;
window.returnToAdmin = returnToAdmin;
// switchTab уже объявлена выше как window.switchTab

// Функции для учителя
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;
window.saveVideo = saveVideo;
window.editVideo = editVideo;
window.deleteMyVideo = deleteMyVideo;
window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;
window.saveAssignment = saveAssignment;
window.editAssignment = editAssignment;
window.deleteMyAssignment = deleteMyAssignment;
window.loadSubmissions = loadSubmissions;
window.openGradeModal = openGradeModal;
window.closeSubmissionModal = closeSubmissionModal;
window.saveGrade = saveGrade;

// ========== TEST MANAGEMENT ==========

// Загрузка тестов учителя
async function loadMyTests() {
  const container = document.getElementById('myTestsContainer');
  if (!container) return;
  
  try {
    console.log('Загрузка тестов учителя...');
    const tests = await getTests();
    console.log('Получены все тесты:', tests);
    
    const user = getUser();
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    
    console.log('ID учителя:', user.id);
    // Показывать свои тесты + все главные тесты (is_main_test = 1)
    teacherTests = Array.isArray(tests) ? tests.filter(t => 
      t.teacher_id === user.id || t.is_main_test === 1
    ) : [];
    console.log('Тесты учителя (включая главные):', teacherTests);
    
    renderMyTests();
  } catch (error) {
    console.error('Тесттерді жүктеу қатесі:', error);
    const container = document.getElementById('myTestsContainer');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Қате орын алды</h3>
          <p>Тесттерді жүктеу мүмкін болмады: ${error.message}</p>
        </div>
      `;
    }
  }
}

// Отображение тестов учителя
function renderMyTests() {
  const container = document.getElementById('myTestsContainer');
  
  if (!container) {
    console.error('myTestsContainer не найден');
    return;
  }
  
  if (teacherTests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Тесттер жоқ</h3>
        <p>Сіз әлі тесттер қосмағансыз. Алғашқы тестті қосыңыз!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = teacherTests.map(test => {
    const subjectText = test.subject === 'mathematics' ? 'Математика' : test.subject === 'informatics' ? 'Информатика' : 'ЕНТ';
    const date = new Date(test.created_at).toLocaleDateString('kz-KZ');
    const isActive = test.is_active === 1;
    const isMain = test.is_main_test === 1;
    
    return `
      <div class="teacher-assignment-card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="flex: 1;">
            <h3>${escapeHtml(test.title)}</h3>
            <p style="color: var(--text-secondary); margin: 8px 0;">${escapeHtml(test.description || '')}</p>
            <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
              <span style="padding: 4px 12px; background: ${test.subject === 'mathematics' ? 'rgba(99, 102, 241, 0.1)' : test.subject === 'informatics' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: ${test.subject === 'mathematics' ? '#6366f1' : test.subject === 'informatics' ? '#8b5cf6' : '#f59e0b'};">${subjectText}</span>
              <span style="padding: 4px 12px; background: ${isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: ${isActive ? '#10b981' : '#ef4444'};">${isActive ? 'Белсенді' : 'Белсенді емес'}</span>
              ${isMain ? '<span style="padding: 4px 12px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: #6366f1;">Басты тест</span>' : ''}
              <span style="color: var(--text-secondary); font-size: 0.875rem;">${test.total_questions || 0} сұрақ</span>
              <span style="color: var(--text-secondary); font-size: 0.875rem;">${date}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="viewTestResults(${test.id})" style="padding: 8px 16px; font-size: 0.875rem;">Нәтижелер</button>
          <button class="btn btn-secondary" onclick="editTest(${test.id})" style="padding: 8px 16px; font-size: 0.875rem;">Өзгерту</button>
          <button class="btn btn-danger" onclick="deleteMyTest(${test.id})" style="padding: 8px 16px; font-size: 0.875rem; background: #e74c3c;">Жою</button>
        </div>
      </div>
    `;
  }).join('');
}

// Загрузка тестов для учеников
async function loadTests() {
  const container = document.getElementById('testsContainer');
  if (!container) return;
  
  try {
    console.log('Загрузка тестов...');
    const tests = await getTests();
    console.log('Получены тесты:', tests);
    
    let filteredTests = Array.isArray(tests) ? tests : [];
    
    // Фильтровать по предметам ученика
    const user = getUser();
    console.log('Текущий пользователь:', user);
    
    if (user && user.role === 'student' && user.subjects) {
      let userSubjects = null;
      if (Array.isArray(user.subjects)) {
        userSubjects = user.subjects;
      } else if (typeof user.subjects === 'string') {
        try {
          userSubjects = JSON.parse(user.subjects);
        } catch (e) {
          console.error('Ошибка парсинга subjects:', e);
        }
      }
      
      console.log('Предметы ученика:', userSubjects);
      
      if (userSubjects && Array.isArray(userSubjects) && userSubjects.length > 0) {
        filteredTests = filteredTests.filter(test => {
          // ЕНТ тесты показываем всем ученикам
          if (test.subject === 'ent') {
            console.log(`Тест "${test.title}" (${test.subject}): показан (ЕНТ)`);
            return true;
          }
          const matches = userSubjects.includes(test.subject);
          console.log(`Тест "${test.title}" (${test.subject}): ${matches ? 'показан' : 'скрыт'}`);
          return matches;
        });
      }
    }
    
    allTests = filteredTests;
    console.log('Отфильтрованные тесты:', allTests);
    
    displayTests();
  } catch (error) {
    console.error('Тесттерді жүктеу қатесі:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Қате орын алды</h3>
        <p>Тесттерді жүктеу мүмкін болмады: ${error.message}</p>
      </div>
    `;
  }
}

// Отображение тестов для учеников
function displayTests() {
  const container = document.getElementById('testsContainer');
  if (!container) {
    console.error('testsContainer не найден');
    return;
  }
  
  // Убедиться, что данные загружены
  if (!allTests || allTests === undefined || allTests === null) {
    console.warn('allTests не загружены, ожидание...');
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Тесттер жүктелуде...</p>
      </div>
    `;
    setTimeout(() => displayTests(), 200);
    return;
  }
  
  const tests = Array.isArray(allTests) ? allTests : [];
  
  if (tests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Тесттер жоқ</h3>
        <p>Қолжетімді тесттер жоқ.</p>
      </div>
    `;
    return;
  }
  
  // Создать карту результатов
  const resultsMap = {};
  const testResults = Array.isArray(myTestResults) ? myTestResults : [];
  testResults.forEach(r => {
    if (!resultsMap[r.test_id]) {
      resultsMap[r.test_id] = [];
    }
    resultsMap[r.test_id].push(r);
  });
  
  container.innerHTML = `
    <div class="assignments-grid">
      ${tests.map(test => {
        const subjectClass = test.subject === 'mathematics' ? 'math' : test.subject === 'informatics' ? 'informatics' : 'ent';
        const subjectText = test.subject === 'mathematics' ? 'Математика' : test.subject === 'informatics' ? 'Информатика' : 'ЕНТ';
        const results = resultsMap[test.id] || [];
        const bestResult = results.length > 0 ? results.reduce((best, r) => 
          r.percentage > best.percentage ? r : best
        ) : null;
        const attempts = results.length;
        
        let statusHtml = '';
        if (bestResult) {
          const passed = bestResult.passed === 1;
          statusHtml = `
            <div style="margin-top: 12px; padding: 12px; background: ${passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 8px;">
              <div style="font-weight: 600; color: ${passed ? '#10b981' : '#ef4444'};">
                ${passed ? '✅ Өтті' : '❌ Өтпеді'}
              </div>
              <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 4px;">
                Ең жақсы нәтиже: ${Math.round(bestResult.percentage)}% (${bestResult.score}/${bestResult.total_score} балл)
              </div>
              <div style="font-size: 0.875rem; color: var(--text-secondary);">
                Әрекеттер саны: ${attempts}
              </div>
            </div>
          `;
        }
        
        return `
          <div class="assignment-card">
            <div class="assignment-header">
              <div style="flex: 1;">
                <h3 class="assignment-title">${escapeHtml(test.title)}</h3>
                <span class="lesson-card-subject ${subjectClass}">${subjectText}</span>
              </div>
            </div>
            <p class="lesson-card-description">${escapeHtml(test.description || 'Сипаттама жоқ')}</p>
            <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
              <span style="font-size: 0.875rem; color: var(--text-secondary);">${test.total_questions || 0} сұрақ</span>
              ${test.time_limit ? `<span style="font-size: 0.875rem; color: var(--text-secondary);">⏱ ${test.time_limit} минут</span>` : ''}
              ${test.passing_score ? `<span style="font-size: 0.875rem; color: var(--text-secondary);">Өту: ${test.passing_score}%</span>` : ''}
            </div>
            ${statusHtml}
            <div style="margin-top: 16px;">
              <a href="test.html?id=${test.id}" class="btn btn-primary">
                ${bestResult ? 'Қайта орындау' : 'Бастау'}
              </a>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Открытие модального окна для создания теста
async function openTestModal(testId = null) {
  currentEditTestId = testId;
  const modal = document.getElementById('testModal');
  const form = document.getElementById('testForm');
  const questionsContainer = document.getElementById('questionsContainer');
  
  if (testId) {
    try {
      // Загрузить полные данные теста с сервера для редактирования
      const token = getToken();
      const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
      const response = await fetch(`${apiUrl}/api/tests/${testId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Тестті жүктеу мүмкін болмады';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          console.error('Ошибка парсинга ответа:', errorText.substring(0, 200));
          errorMessage = `Сервер қатесі (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      let test;
      if (contentType && contentType.includes('application/json')) {
        test = await response.json();
      } else {
        const responseText = await response.text();
        console.error('Сервер вернул не JSON:', responseText.substring(0, 200));
        throw new Error('Сервер қатесі: дұрыс емес формат');
      }
      if (test) {
        document.getElementById('testModalTitle').textContent = 'Тестті өзгерту';
        document.getElementById('testTitle').value = test.title || '';
        document.getElementById('testDescription').value = test.description || '';
        document.getElementById('testSubject').value = test.subject || '';
        document.getElementById('testTimeLimit').value = test.time_limit ? String(test.time_limit) : '';
        document.getElementById('testPassingScore').value = test.passing_score ? String(test.passing_score) : '';
        document.getElementById('testIsMain').checked = test.is_main_test === 1;
        document.getElementById('testIsActive').checked = test.is_active === 1;
        
        // Загрузить вопросы теста
        await loadTestQuestions(testId);
      } else {
        alert('Тест табылмады');
        return;
      }
    } catch (error) {
      console.error('Тестті жүктеу қатесі:', error);
      alert('Тестті жүктеу мүмкін болмады: ' + (error.message || 'Белгісіз қате'));
      return;
    }
  } else {
    document.getElementById('testModalTitle').textContent = 'Тест қосу';
    form.reset();
    questionsContainer.innerHTML = '';
    addQuestion(); // Добавить первый вопрос по умолчанию
  }
  
  modal.style.display = 'flex';
  modal.classList.add('active');
}

// Загрузка вопросов теста для редактирования
async function loadTestQuestions(testId) {
  try {
    const token = getToken();
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
    const response = await fetch(`${apiUrl}/api/tests/${testId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Сұрақтарды жүктеу мүмкін болмады';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        console.error('Ошибка парсинга ответа:', errorText.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    let test;
    if (contentType && contentType.includes('application/json')) {
      test = await response.json();
    } else {
      const responseText = await response.text();
      console.error('Сервер вернул не JSON:', responseText.substring(0, 200));
      throw new Error('Сервер қатесі: дұрыс емес формат');
    }
    
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = '';
    
    if (test.questions && test.questions.length > 0) {
      test.questions.forEach((q, index) => {
        // Парсинг правильных ответов
        let correctAnswer = q.correct_answer;
        if (typeof correctAnswer === 'string') {
          try {
            correctAnswer = JSON.parse(correctAnswer);
          } catch (e) {
            // Если не JSON, оставляем как есть
          }
        }
        
        const questionData = {
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          correct_answer: correctAnswer,
          points: q.points || 1
        };
        
        addQuestion(questionData, index);
      });
    } else {
      addQuestion();
    }
  } catch (error) {
    console.error('Сұрақтарды жүктеу қатесі:', error);
    alert('Сұрақтарды жүктеу мүмкін болмады');
  }
}

// Добавление вопроса в форму
function addQuestion(questionData = null, index = null) {
  const questionsContainer = document.getElementById('questionsContainer');
  const questionIndex = index !== null ? index : questionsContainer.children.length;
  
  const question = questionData || {
    question_text: '',
    question_type: 'single_choice',
    options: ['', '', '', ''],
    correct_answer: 0,
    points: 1
  };
  
  // Обработка правильного ответа
  const isCorrect = (optIndex) => {
    if (question.question_type === 'single_choice') {
      return question.correct_answer === optIndex;
    } else {
      return Array.isArray(question.correct_answer) && question.correct_answer.includes(optIndex);
    }
  };
  
  const questionHtml = `
    <div class="question-form-item" data-index="${questionIndex}" style="margin-bottom: 24px; padding: 16px; background: white; border-radius: 8px; border: 2px solid var(--bg-gray-200);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin: 0;">Сұрақ ${questionIndex + 1}</h4>
        <button type="button" class="btn btn-danger" onclick="removeQuestion(this)" style="padding: 4px 12px; font-size: 0.875rem; background: #e74c3c;">Жою</button>
      </div>
      <div class="form-group">
        <label>Сұрақ мәтіні *</label>
        <textarea class="question-text" required rows="2" placeholder="Сұрақ мәтінін енгізіңіз">${escapeHtml(question.question_text)}</textarea>
      </div>
      <div class="form-group">
        <label>Сұрақ түрі *</label>
        <select class="question-type" required>
          <option value="single_choice" ${question.question_type === 'single_choice' ? 'selected' : ''}>Бір жауап</option>
          <option value="multiple_choice" ${question.question_type === 'multiple_choice' ? 'selected' : ''}>Бірнеше жауап</option>
        </select>
      </div>
      <div class="form-group">
        <label>Нұсқалар *</label>
        <div class="options-container">
          ${question.options.map((opt, optIndex) => {
            const correct = isCorrect(optIndex);
            return `
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input type="text" class="option-input" value="${escapeHtml(opt)}" placeholder="Нұсқа ${optIndex + 1}" required>
              <input type="checkbox" name="correct-${questionIndex}" class="correct-checkbox" value="${optIndex}" ${correct ? 'checked' : ''} style="display: none;">
              <button type="button" class="btn btn-secondary correct-btn" onclick="setCorrectAnswer(this, ${questionIndex}, ${optIndex})" style="padding: 8px 12px; min-width: 100px; ${correct ? 'background: #10b981; color: white;' : ''}">
                ${correct ? '✓ Дұрыс' : 'Дұрыс ету'}
              </button>
            </div>
          `;
          }).join('')}
        </div>
        <button type="button" class="btn btn-secondary" onclick="addOption(this)" style="margin-top: 8px; padding: 6px 12px; font-size: 0.875rem;">+ Нұсқа қосу</button>
      </div>
      <div class="form-group">
        <label>Балл</label>
        <input type="number" class="question-points" min="1" value="${question.points || 1}" style="width: 100px;">
      </div>
    </div>
  `;
  
  questionsContainer.insertAdjacentHTML('beforeend', questionHtml);
  
  // Обновить обработчики для типа вопроса
  const questionItem = questionsContainer.lastElementChild;
  const typeSelect = questionItem.querySelector('.question-type');
  typeSelect.addEventListener('change', function() {
    updateQuestionType(this);
  });
}

// Удаление вопроса
function removeQuestion(button) {
  const questionItem = button.closest('.question-form-item');
  questionItem.remove();
  updateQuestionNumbers();
}

// Обновление номеров вопросов
function updateQuestionNumbers() {
  const questions = document.querySelectorAll('.question-form-item');
  questions.forEach((item, index) => {
    item.setAttribute('data-index', index);
    const title = item.querySelector('h4');
    if (title) title.textContent = `Сұрақ ${index + 1}`;
  });
}

// Добавление варианта ответа
function addOption(button) {
  const questionItem = button.closest('.question-form-item');
  const optionsContainer = questionItem.querySelector('.options-container');
  const questionIndex = parseInt(questionItem.getAttribute('data-index'));
  const optionIndex = optionsContainer.children.length;
  
  const optionHtml = `
    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
      <input type="text" class="option-input" placeholder="Нұсқа ${optionIndex + 1}" required>
      <input type="checkbox" name="correct-${questionIndex}" class="correct-checkbox" value="${optionIndex}" style="display: none;">
      <button type="button" class="btn btn-secondary correct-btn" onclick="setCorrectAnswer(this, ${questionIndex}, ${optionIndex})" style="padding: 8px 12px; min-width: 100px;">Дұрыс ету</button>
    </div>
  `;
  
  optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
}

// Установка правильного ответа
function setCorrectAnswer(button, questionIndex, optionIndex) {
  const questionItem = button.closest('.question-form-item');
  const typeSelect = questionItem.querySelector('.question-type');
  const questionType = typeSelect.value;
  
  if (questionType === 'single_choice') {
    // Снять все выделения
    questionItem.querySelectorAll('.correct-btn').forEach(btn => {
      btn.textContent = 'Дұрыс ету';
      btn.style.background = '';
      btn.style.color = '';
    });
    questionItem.querySelectorAll('.correct-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Установить выбранный
    button.textContent = '✓ Дұрыс';
    button.style.background = '#10b981';
    button.style.color = 'white';
    const checkbox = questionItem.querySelector(`input[name="correct-${questionIndex}"][value="${optionIndex}"]`);
    if (checkbox) checkbox.checked = true;
  } else {
    // Multiple choice - переключить
    const checkbox = questionItem.querySelector(`input[name="correct-${questionIndex}"][value="${optionIndex}"]`);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) {
        button.textContent = '✓ Дұрыс';
        button.style.background = '#10b981';
        button.style.color = 'white';
      } else {
        button.textContent = 'Дұрыс ету';
        button.style.background = '';
        button.style.color = '';
      }
    }
  }
}

// Обновление типа вопроса
function updateQuestionType(select) {
  const questionItem = select.closest('.question-form-item');
  const questionType = select.value;
  
  if (questionType === 'single_choice') {
    // Если переключили на single choice, оставить только один выбранный ответ
    const checkedCheckboxes = questionItem.querySelectorAll('.correct-checkbox:checked');
    if (checkedCheckboxes.length > 1) {
      // Оставить только первый
      for (let i = 1; i < checkedCheckboxes.length; i++) {
        checkedCheckboxes[i].checked = false;
        const btn = checkedCheckboxes[i].closest('div').querySelector('.correct-btn');
        if (btn) {
          btn.textContent = 'Дұрыс ету';
          btn.style.background = '';
          btn.style.color = '';
        }
      }
    }
  }
}

// Закрытие модального окна теста
function closeTestModal() {
  const modal = document.getElementById('testModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
  currentEditTestId = null;
  document.getElementById('testForm').reset();
  document.getElementById('questionsContainer').innerHTML = '';
}

// Сохранение теста
async function saveTest(event) {
  event.preventDefault();
  
  const title = document.getElementById('testTitle').value.trim();
  const description = document.getElementById('testDescription').value.trim();
  const subject = document.getElementById('testSubject').value;
  const timeLimitValue = document.getElementById('testTimeLimit').value.trim();
  const passingScoreValue = document.getElementById('testPassingScore').value.trim();
  const time_limit = timeLimitValue ? parseInt(timeLimitValue) : null;
  const passing_score = passingScoreValue ? parseInt(passingScoreValue) : null;
  const is_main_test = document.getElementById('testIsMain').checked ? 1 : 0;
  const is_active = document.getElementById('testIsActive').checked ? 1 : 0;
  
  // Валидация
  if (!title) {
    alert('Атауы міндетті');
    return;
  }
  
  if (!subject) {
    alert('Пән таңдаңыз');
    return;
  }
  
  if (time_limit !== null && (isNaN(time_limit) || time_limit < 1)) {
    alert('Уақыт шегі дұрыс емес');
    return;
  }
  
  if (passing_score !== null && (isNaN(passing_score) || passing_score < 0 || passing_score > 100)) {
    alert('Өту баллы 0-100 аралығында болуы керек');
    return;
  }
  
  // Собрать вопросы
  const questions = [];
  const questionItems = document.querySelectorAll('.question-form-item');
  
  questionItems.forEach((item, index) => {
    const question_text = item.querySelector('.question-text').value;
    const question_type = item.querySelector('.question-type').value;
    const points = parseInt(item.querySelector('.question-points').value) || 1;
    
    const options = [];
    item.querySelectorAll('.option-input').forEach(input => {
      if (input.value.trim()) {
        options.push(input.value.trim());
      }
    });
    
    if (!question_text || options.length < 2) {
      throw new Error(`Сұрақ ${index + 1} толық емес`);
    }
    
    // Получить правильные ответы
    let correct_answer;
    if (question_type === 'single_choice') {
      const checkedCheckbox = item.querySelector('.correct-checkbox:checked');
      if (!checkedCheckbox) {
        throw new Error(`Сұрақ ${index + 1} үшін дұрыс жауап таңдалмаған`);
      }
      correct_answer = parseInt(checkedCheckbox.value);
    } else {
      const checkedCheckboxes = item.querySelectorAll('.correct-checkbox:checked');
      if (checkedCheckboxes.length === 0) {
        throw new Error(`Сұрақ ${index + 1} үшін дұрыс жауап таңдалмаған`);
      }
      correct_answer = Array.from(checkedCheckboxes).map(cb => parseInt(cb.value));
    }
    
    questions.push({
      question_text,
      question_type,
      options,
      correct_answer,
      points
    });
  });
  
  if (questions.length === 0) {
    alert('Кемінде бір сұрақ қосу керек');
    return;
  }
  
  try {
    const token = getToken();
    if (!token) {
      alert('Авторизация қажет. Қайта кіріңіз.');
      window.location.href = 'login.html';
      return;
    }
    
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : window.location.origin;
    const url = currentEditTestId 
      ? `${apiUrl}/api/tests/${currentEditTestId}`
      : `${apiUrl}/api/tests`;
    
    const method = currentEditTestId ? 'PUT' : 'POST';
    
    console.log('Отправка теста:', { 
      method, 
      url, 
      testId: currentEditTestId,
      title, 
      subject, 
      questionsCount: questions.length,
      is_main_test,
      is_active,
      time_limit,
      passing_score
    });
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        description,
        subject,
        time_limit: time_limit !== null && !isNaN(time_limit) ? parseInt(time_limit) : null,
        passing_score: passing_score !== null && !isNaN(passing_score) ? parseInt(passing_score) : null,
        is_main_test: is_main_test !== undefined ? (is_main_test ? 1 : 0) : 1,
        is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
        questions
      })
    });
    
    // Проверить тип ответа перед парсингом
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (!response.ok) {
      // Если ошибка, попробуем получить JSON или текст
      const errorText = await response.text();
      try {
        responseData = JSON.parse(errorText);
      } catch (e) {
        console.error('Сервер вернул не JSON:', errorText.substring(0, 200));
        throw new Error(`Сервер қатесі (${response.status}): ${errorText.substring(0, 100)}`);
      }
      console.error('Ошибка сохранения теста:', responseData);
      throw new Error(responseData.error || `Қате (${response.status})`);
    }
    
    // Если успешно, парсим JSON
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const responseText = await response.text();
      console.warn('Сервер вернул не JSON, но статус OK:', responseText.substring(0, 200));
      responseData = { success: true };
    }
    
    console.log('Тест успешно создан:', responseData);
    closeTestModal();
    await loadMyTests();
    await loadTeacherStats();
    alert(currentEditTestId ? 'Тест сәтті жаңартылды' : 'Тест сәтті қосылды');
  } catch (error) {
    console.error('Ошибка при сохранении теста:', error);
    alert('Қате: ' + error.message);
  }
}

// Редактирование теста
function editTest(testId) {
  openTestModal(testId);
}

// Удаление теста
async function deleteMyTest(testId) {
  if (!confirm('Тестті жоюға сенімдісіз бе?')) return;
  
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/tests/${testId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Тестті жою қатесі');
    }
    
    await loadMyTests();
    await loadTeacherStats();
    alert('Тест сәтті жойылды');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Просмотр результатов теста
async function viewTestResults(testId) {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/tests/${testId}/results`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Нәтижелерді алу қатесі');
    }
    
    const results = await response.json();
    
    // Найти тест в списке учителя или загрузить отдельно, если это главный тест
    let test = teacherTests.find(t => t.id === testId);
    
    // Если тест не найден в списке (например, главный тест), загрузить его отдельно
    if (!test) {
      try {
        const testResponse = await fetch(`${API_BASE_URL}/api/tests/${testId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (testResponse.ok) {
          test = await testResponse.json();
        }
      } catch (e) {
        console.error('Ошибка загрузки теста:', e);
      }
    }
    
    const modal = document.getElementById('testResultsModal');
    const content = document.getElementById('testResultsContent');
    const title = document.getElementById('testResultsModalTitle');
    
    title.textContent = `Тест нәтижелері: ${test ? test.title : 'Тест'}`;
    
    if (results.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h3>Нәтижелер жоқ</h3>
          <p>Оқушылар әлі бұл тестті орындамаған.</p>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-gray-100);">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--bg-gray-200);">Оқушы</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--bg-gray-200);">Балл</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--bg-gray-200);">Процент</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--bg-gray-200);">Нәтиже</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--bg-gray-200);">Уақыт</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--bg-gray-200);">Күні</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => {
                const passed = r.passed === 1;
                const date = new Date(r.completed_at).toLocaleDateString('kz-KZ');
                // Форматировать время: часы:минуты:секунды
                let timeSpent = '-';
                if (r.time_spent) {
                  const totalSeconds = r.time_spent;
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;
                  
                  if (hours > 0) {
                    timeSpent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                  } else {
                    timeSpent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  }
                }
                
                return `
                  <tr style="border-bottom: 1px solid var(--bg-gray-100);">
                    <td style="padding: 12px;">${escapeHtml(r.student_name)}</td>
                    <td style="padding: 12px;">${r.score}/${r.total_score}</td>
                    <td style="padding: 12px;">${Math.round(r.percentage)}%</td>
                    <td style="padding: 12px;">
                      <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; font-weight: 600; background: ${passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${passed ? '#10b981' : '#ef4444'};">
                        ${passed ? '✅ Өтті' : '❌ Өтпеді'}
                      </span>
                    </td>
                    <td style="padding: 12px;">${timeSpent}</td>
                    <td style="padding: 12px;">${date}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    
    modal.style.display = 'flex';
    modal.classList.add('active');
  } catch (error) {
    alert('Қате: ' + error.message);
  }
}

// Закрытие модального окна результатов
function closeTestResultsModal() {
  const modal = document.getElementById('testResultsModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
}

// Глобальные функции для тестов
window.openTestModal = openTestModal;
window.closeTestModal = closeTestModal;
window.saveTest = saveTest;
window.editTest = editTest;
window.deleteMyTest = deleteMyTest;
window.viewTestResults = viewTestResults;
window.closeTestResultsModal = closeTestResultsModal;
window.addQuestion = addQuestion;
window.removeQuestion = removeQuestion;
window.addOption = addOption;
window.setCorrectAnswer = setCorrectAnswer;

