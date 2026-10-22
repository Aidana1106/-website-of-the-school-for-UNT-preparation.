/**
 * ENT-Bilim - Authentication & API Integration
 * Авторизация және API интеграциясы
 */

const API_BASE_URL = window.location.origin;

// Токенді localStorage-дан алу
function getToken() {
  return localStorage.getItem('token');
}

// Токенді localStorage-ға сақтау
function setToken(token) {
  localStorage.setItem('token', token);
}

// Токенді жою
function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Пайдаланушы деректерін алу
function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Пайдаланушы деректерін сақтау
function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// API сұрауы
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      // Если токен невалиден (401/403), очищаем его
      if (response.status === 401 || response.status === 403) {
        // Не очищаем токен автоматически, пусть это делает validateToken
        // Просто пробрасываем ошибку
      }
      throw new Error(data.error || 'Қате орын алды');
    }

    return data;
  } catch (error) {
    console.error('API қатесі:', error);
    throw error;
  }
}

/**
 * Регистрация нового пользователя
 * Отправляет данные регистрации на сервер
 * 
 * @param {string} name - Имя пользователя
 * @param {string} email - Email (должен быть уникальным)
 * @param {string} password - Пароль
 * @param {string} role - Роль ('student' или 'teacher')
 * @param {Array<string>|null} subjects - Массив предметов для учеников (['mathematics', 'informatics'] или один из них)
 * 
 * @returns {Promise<object>} Данные ответа от сервера:
 *   - message: сообщение об успешной регистрации
 *   - requiresApproval: true (пользователь должен ждать одобрения)
 *   - user: данные пользователя (без токена, так как не одобрен)
 *   - token: токен (только если пользователь сразу одобрен, что маловероятно)
 * 
 * Если регистрация успешна, сохраняет данные пользователя в localStorage
 * Токен сохраняется только если он есть в ответе (если пользователь сразу одобрен)
 */
async function register(name, email, password, role, subjects = null) {
  try {
    const payload = { name, email, password, role };
    if (subjects && subjects.length > 0) {
      payload.subjects = subjects;
    }
    
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Сохраняем токен только если он есть (если пользователь одобрен)
    // Если requiresApproval: true, токен не будет в ответе
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    } else {
      // Сохраняем только данные пользователя без токена
      setUser(data.user);
    }
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Вход в систему
 * Отправляет email и пароль на сервер для авторизации
 * 
 * @param {string} email - Email пользователя
 * @param {string} password - Пароль
 * 
 * @returns {Promise<object>} Данные ответа от сервера:
 *   - message: сообщение об успешном входе
 *   - token: JWT токен для авторизации
 *   - user: данные пользователя (id, name, email, role, avatar_url, subjects)
 * 
 * При успешном входе:
 * - Сохраняет токен в localStorage
 * - Сохраняет данные пользователя в localStorage
 * 
 * Если пользователь не одобрен или не оплатил (для учеников), сервер вернет ошибку 403
 */
async function login(email, password) {
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setToken(data.token);
    setUser(data.user);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Выход из системы
 * Удаляет токен и данные пользователя из localStorage
 * Перенаправляет на главную страницу
 */
function logout() {
  removeToken();
  window.location.href = 'index.html';
}

/**
 * Получение профиля текущего пользователя
 * Запрашивает актуальные данные пользователя с сервера
 * 
 * @returns {Promise<object>} Данные пользователя:
 *   - id, name, email, role, avatar_url, subjects
 * 
 * Используется для обновления данных пользователя в localStorage
 * Особенно важно для получения актуальных subjects после их изменения админом
 */
async function getProfile() {
  return await apiRequest('/auth/profile');
}

// Видеоларды алу
async function getVideos(subject = null) {
  const query = subject ? `?subject=${subject}` : '';
  return await apiRequest(`/videos${query}`);
}

// Бір видеоны алу
async function getVideo(id) {
  return await apiRequest(`/videos/${id}`);
}

// Прогресс алу
async function getProgress() {
  return await apiRequest('/progress/my');
}

// Прогресс жаңарту
async function updateProgress(video_id, watched_seconds, completed) {
  return await apiRequest('/progress', {
    method: 'POST',
    body: JSON.stringify({ video_id, watched_seconds, completed })
  });
}

// Тапсырмаларды алу
async function getAssignments(subject = null) {
  const query = subject ? `?subject=${subject}` : '';
  return await apiRequest(`/assignments${query}`);
}

// Бір тапсырманы алу
async function getAssignment(id) {
  return await apiRequest(`/assignments/${id}`);
}

// Менің жіберулерімді алу
async function getMySubmissions() {
  return await apiRequest('/submissions/my');
}

// Тесттерді алу
async function getTests() {
  return await apiRequest('/tests');
}

// Бір тестті алу
async function getTest(id) {
  return await apiRequest(`/tests/${id}`);
}

// Менің тест нәтижелерімді алу
async function getMyTestResults() {
  return await apiRequest('/tests/my-results');
}

// Тапсырма жіберу
async function submitAssignment(assignment_id, answer_text, file_url) {
  return await apiRequest('/submissions', {
    method: 'POST',
    body: JSON.stringify({ assignment_id, answer_text, file_url })
  });
}

// Авторизация тексеру (только проверка наличия токена в localStorage)
function checkAuth() {
  const token = getToken();
  const user = getUser();
  
  if (!token || !user) {
    return false;
  }
  
  return true;
}

/**
 * Проверка валидности токена на сервере
 * Отправляет запрос к /api/auth/profile для проверки токена
 * 
 * @returns {Promise<object|false>} 
 *   - Если токен валиден: возвращает данные пользователя с сервера
 *   - Если токен невалиден или отсутствует: возвращает false
 * 
 * При успешной проверке:
 * - Обновляет данные пользователя в localStorage
 * - Возвращает актуальные данные пользователя (включая subjects)
 * 
 * Если токен невалиден (401/403):
 * - Удаляет токен из localStorage
 * - Возвращает false
 * 
 * Используется для:
 * - Проверки авторизации перед загрузкой защищенных страниц
 * - Обновления данных пользователя (особенно subjects)
 */
async function validateToken() {
  const token = getToken();
  if (!token) {
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('Данные пользователя получены с сервера:', userData); // Для отладки
      console.log('Subjects в ответе:', userData.subjects); // Для отладки
      // Обновляем данные пользователя на случай, если они изменились
      setUser(userData);
      const savedUser = getUser();
      console.log('Данные сохранены в localStorage:', savedUser); // Для отладки
      return userData; // Возвращаем данные пользователя
    } else {
      // Токен невалиден - очищаем
      if (response.status === 401 || response.status === 403) {
        removeToken();
      }
      return false;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Авторизация тексеру және редирект (для защищенных страниц)
async function requireAuth() {
  const hasToken = checkAuth();
  
  if (!hasToken) {
    window.location.href = 'login.html';
    return false;
  }
  
  // Проверяем валидность токена на сервере
  const isValid = await validateToken();
  
  if (!isValid) {
    // Токен невалиден - редирект на страницу входа
    window.location.href = 'login.html';
    return false;
  }
  
  return true;
}

// Login формасы
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      errorMessage.classList.remove('show');
      successMessage.classList.remove('show');
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Кіруде...';
      
      try {
        await login(email, password);
        successMessage.textContent = 'Сәтті кірдіңіз! Жеке кабинетке бағытталуда...';
        successMessage.classList.add('show');
        
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } catch (error) {
        errorMessage.textContent = error.message || 'Кіру қатесі. Email және құпия сөзді тексеріңіз.';
        errorMessage.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Register формасы
  const registerForm = document.getElementById('registerForm');
  
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const role = document.getElementById('role').value;
      
      errorMessage.classList.remove('show');
      successMessage.classList.remove('show');
      
      // Парольдерді тексеру
      if (password !== confirmPassword) {
        errorMessage.textContent = 'Құпия сөздер сәйкес келмейді';
        errorMessage.classList.add('show');
        return;
      }
      
      if (password.length < 6) {
        errorMessage.textContent = 'Құпия сөз кемінде 6 таңбадан тұруы керек';
        errorMessage.classList.add('show');
        return;
      }
      
      if (!role) {
        errorMessage.textContent = 'Рөлді таңдаңыз';
        errorMessage.classList.add('show');
        return;
      }
      
      // Собрать выбранные предметы для учеников
      let subjects = null;
      if (role === 'student') {
        const selectedSubjects = Array.from(document.querySelectorAll('input[name="subjects"]:checked')).map(cb => cb.value);
        if (selectedSubjects.length === 0) {
          errorMessage.textContent = 'Кемінде бір пән таңдаңыз';
          errorMessage.classList.add('show');
          return;
        }
        subjects = selectedSubjects;
      }
      
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Тіркелуде...';
      
      try {
        const result = await register(name, email, password, role, subjects);
        
        // Если требуется одобрение, не перенаправляем в дашборд
        if (result.requiresApproval) {
          successMessage.textContent = result.message || 'Тіркелу сәтті! Сіздің тіркелуіңіз бекіту күтуде. Админ бекіткеннен кейін кіре аласыз.';
          successMessage.classList.add('show');
          // Не перенаправляем, пользователь должен ждать одобрения
        } else {
          // Если токен есть, значит пользователь сразу одобрен (не должно быть для новых пользователей)
          successMessage.textContent = 'Тіркелу сәтті! Жеке кабинетке бағытталуда...';
          successMessage.classList.add('show');
          
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        }
      } catch (error) {
        errorMessage.textContent = error.message || 'Тіркелу қатесі. Деректерді тексеріңіз.';
        errorMessage.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
  
  // Навигацияда авторизация тексеру (только для страниц, где есть authButtons)
  // Для главной страницы проверка делается в index.html
  const authButtons = document.getElementById('authButtons');
  if (authButtons && checkAuth()) {
    // Проверяем валидность токена асинхронно
    validateToken().then(isValid => {
      if (isValid) {
        const user = getUser();
        authButtons.innerHTML = `
          <a href="dashboard.html" class="btn btn-secondary">${user.name}</a>
          <button class="btn btn-primary" onclick="logout()">Шығу</button>
        `;
      } else {
        // Токен невалиден - показываем кнопки входа
        authButtons.innerHTML = `
          <a href="login.html" class="btn btn-secondary">Кіру</a>
          <a href="register.html" class="btn btn-primary">Тіркелу</a>
        `;
      }
    }).catch(() => {
      // При ошибке показываем кнопки входа
      authButtons.innerHTML = `
        <a href="login.html" class="btn btn-secondary">Кіру</a>
        <a href="register.html" class="btn btn-primary">Тіркелу</a>
      `;
    });
  }
});

// Глобалды функциялар
window.logout = logout;
window.checkAuth = checkAuth;
window.requireAuth = requireAuth;
window.validateToken = validateToken;
window.getVideos = getVideos;
window.getVideo = getVideo;
window.getProgress = getProgress;
window.updateProgress = updateProgress;
window.getAssignments = getAssignments;
window.getAssignment = getAssignment;
window.getMySubmissions = getMySubmissions;
window.submitAssignment = submitAssignment;

