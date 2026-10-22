/**
 * ENT-Bilim - Admin Panel JavaScript
 * Админ панель JavaScript
 * 
 * Этот файл содержит всю логику для работы админ панели:
 * - Управление пользователями (ученики, учителя)
 * - Управление видео-уроками
 * - Управление заданиями
 * - Просмотр комментариев и прогресса
 * - Одобрение новых регистраций
 * - Подтверждение оплаты для учеников
 * - Вход в аккаунт ученика от имени админа
 */

// Базовый URL для API запросов к админ панели
const API_BASE = '/api/admin';

// Глобальные переменные для хранения ID редактируемых элементов
let currentEditUserId = null;        // ID пользователя, которого редактируем
let currentEditVideoId = null;       // ID видео, которое редактируем
let currentEditAssignmentId = null; // ID задания, которое редактируем

// Кэш для загруженных данных
let allVideos = [];      // Массив всех видео
let allTeachers = [];    // Массив всех учителей

/**
 * Проверка авторизации админа
 * Проверяет наличие токена в localStorage и перенаправляет на страницу входа, если токена нет
 * @returns {boolean} true если авторизован, false если нет
 */
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    if (!token) {
        window.location.href = '/admin-login.html';
        return false;
    }
    if (user.email) {
        document.getElementById('adminEmail').textContent = user.email;
    }
    return true;
}

/**
 * Выполнение API запросов к админ панели
 * Автоматически добавляет токен авторизации в заголовки
 * Обрабатывает ошибки авторизации (401) и перенаправляет на страницу входа
 * 
 * @param {string} endpoint - URL endpoint (например, '/users' или '/videos/1')
 * @param {object} options - Опции для fetch (method, body, headers и т.д.)
 * @returns {Promise<object>} JSON ответ от сервера
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin-login.html';
        return;
    }
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Қате орын алды');
    }
    
    return response.json();
}

/**
 * Инициализация навигации по разделам админ панели
 * При клике на пункт меню:
 * 1. Убирает активный класс у всех пунктов
 * 2. Добавляет активный класс выбранному пункту
 * 3. Показывает соответствующий раздел контента
 * 4. Загружает данные для этого раздела
 */
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        showSection(section);
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
    });
});

/**
 * Переключение между разделами админ панели
 * Скрывает все разделы и показывает выбранный
 * Обновляет заголовок страницы
 * Загружает данные для выбранного раздела
 * 
 * @param {string} section - Имя раздела ('dashboard', 'pending', 'users', 'videos', 'assignments', 'comments', 'progress')
 */
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    const titles = {
        'dashboard': 'Басты бет',
        'pending': 'Бекіту күтуде',
        'users': 'Пайдаланушылар',
        'videos': 'Видео сабақтар',
        'assignments': 'Тапсырмалар',
        'comments': 'Комментарийлер',
        'progress': 'Прогресс'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Админ панелі';
    
    // Загрузить данные для секции
    if (section === 'dashboard') loadStats();
    else if (section === 'pending') loadPending();
    else if (section === 'users') loadUsers();
    else if (section === 'videos') loadVideos();
    else if (section === 'assignments') loadAssignments();
    else if (section === 'comments') loadComments();
    else if (section === 'progress') loadProgress();
}

// ========== РАЗДЕЛ: ГЛАВНАЯ СТРАНИЦА (СТАТИСТИКА) ==========

/**
 * Загрузка общей статистики системы
 * Показывает количество:
 * - Учеников
 * - Учителей
 * - Видео-уроков
 * - Заданий
 * - Комментариев
 * - Завершенных видео
 * - Пользователей, ожидающих одобрения
 * 
 * Также обновляет бейдж с количеством ожидающих одобрения
 */
async function loadStats() {
    try {
        const stats = await apiRequest('/stats');
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>Оқушылар</h3>
                <div class="stat-value">${stats.students}</div>
            </div>
            <div class="stat-card">
                <h3>Мұғалімдер</h3>
                <div class="stat-value">${stats.teachers}</div>
            </div>
            <div class="stat-card">
                <h3>Видео сабақтар</h3>
                <div class="stat-value">${stats.videos}</div>
            </div>
            <div class="stat-card">
                <h3>Тапсырмалар</h3>
                <div class="stat-value">${stats.assignments}</div>
            </div>
            <div class="stat-card">
                <h3>Комментарийлер</h3>
                <div class="stat-value">${stats.comments}</div>
            </div>
            <div class="stat-card">
                <h3>Аяқталған видео</h3>
                <div class="stat-value">${stats.completedVideos}</div>
            </div>
            <div class="stat-card" style="background: #fff3cd;">
                <h3>Бекіту күтуде</h3>
                <div class="stat-value" style="color: #856404;">${stats.pendingApprovals || 0}</div>
            </div>
        `;
        
        // Обновить badge
        const badge = document.getElementById('pendingBadge');
        if (stats.pendingApprovals > 0) {
            badge.textContent = stats.pendingApprovals;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Статистика жүктеу қатесі:', error);
    }
}

// ========== РАЗДЕЛ: ОЖИДАЮЩИЕ ОДОБРЕНИЯ ==========

/**
 * Загрузка списка пользователей, ожидающих одобрения
 * Показывает всех пользователей (учеников и учителей), которые:
 * - Зарегистрировались, но еще не одобрены (approved = 0)
 * - Для учеников: не оплатили (paid = 0)
 * 
 * Для каждого пользователя показывает кнопки:
 * - "Бекіту" (Одобрить) - одобряет пользователя
 * - "Төлем белгілеу" (Отметить оплату) - только для неоплативших учеников
 * - "Оқушы аккаунтына кіру" - только для одобренных и оплативших учеников
 * - "Жою" (Удалить) - удаляет пользователя
 */
async function loadPending() {
    try {
        const pending = await apiRequest('/pending');
        const tbody = document.getElementById('pendingTableBody');
        
        if (pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Бекіту күтудегілер жоқ</td></tr>';
            return;
        }
        
        tbody.innerHTML = pending.map(user => {
            const roleText = user.role === 'student' ? 'Оқушы' : 'Мұғалім';
            const paidText = user.paid ? 'Төленген' : 'Төленбеген';
            const paidClass = user.paid ? 'status-paid' : 'status-unpaid';
            const date = new Date(user.created_at).toLocaleDateString('kz-KZ');
            
            return `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge role-${user.role}">${roleText}</span></td>
                    <td><span class="status-badge ${paidClass}">${paidText}</span></td>
                    <td>${date}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-approve" onclick="approveUser(${user.id}, ${user.paid ? 1 : 0})">Бекіту</button>
                            ${user.role === 'student' && !user.paid ? `<button class="btn-reset" onclick="markPaid(${user.id})">Төлем белгілеу</button>` : ''}
                            ${user.role === 'student' && user.approved && user.paid ? `<button class="btn-login-as" onclick="loginAsStudent(${user.id})" title="Оқушы аккаунтына кіру">Оқушы аккаунтына кіру</button>` : ''}
                            <button class="btn-delete" onclick="deleteUser(${user.id})">Жою</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Күтудегілерді жүктеу қатесі:', error);
    }
}

/**
 * Одобрение пользователя
 * Устанавливает approved = 1 для пользователя
 * Для учеников также устанавливает paid статус
 * 
 * @param {number} userId - ID пользователя
 * @param {number} paid - Статус оплаты (1 = оплачено, 0 = не оплачено)
 */
async function approveUser(userId, paid) {
    try {
        await apiRequest(`/users/${userId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ paid })
        });
        alert('Пайдаланушы бекітілді');
        loadPending();
        loadStats();
    } catch (error) {
        alert('Бекіту қатесі: ' + error.message);
    }
}

/**
 * Отметка оплаты для ученика
 * Устанавливает paid = 1 для ученика
 * После этого ученик может быть одобрен и получить доступ к системе
 * 
 * @param {number} userId - ID ученика
 */
async function markPaid(userId) {
    try {
        await apiRequest(`/users/${userId}/mark-paid`, { method: 'POST' });
        alert('Төлем белгіленді');
        loadPending();
        loadUsers(); // Обновить список пользователей
        loadStats(); // Обновить статистику
    } catch (error) {
        alert('Төлем белгілеу қатесі: ' + error.message);
    }
}

// ========== РАЗДЕЛ: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========

/**
 * Загрузка списка всех пользователей с фильтрацией
 * Фильтрует по роли (все / ученики / учителя) и поисковому запросу
 * Показывает всех пользователей системы с их статусами
 */
async function loadUsers() {
    try {
        const role = document.getElementById('userRoleFilter').value;
        const search = document.getElementById('userSearch').value;
        
        const params = new URLSearchParams();
        if (role !== 'all') params.append('role', role);
        if (search) params.append('search', search);
        
        const users = await apiRequest(`/users?${params.toString()}`);
        renderUsers(users);
    } catch (error) {
        console.error('Пайдаланушыларды жүктеу қатесі:', error);
    }
}

/**
 * Отображение списка пользователей в таблице
 * Показывает для каждого пользователя:
 * - ID, имя, email, роль
 * - Статус одобрения (одобрен / ожидает)
 * - Статус оплаты (для учеников)
 * - Статистику (просмотренные видео, созданные задания и т.д.)
 * - Кнопки действий (просмотр деталей, редактирование, сброс пароля, удаление)
 * 
 * @param {Array} users - Массив объектов пользователей
 */
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Пайдаланушылар табылмады</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const roleText = {
            'student': 'Оқушы',
            'teacher': 'Мұғалім',
            'admin': 'Админ'
        }[user.role] || user.role;
        
        let statsText = '-';
        if (user.role === 'student' && user.stats) {
            statsText = `Видео: ${user.stats.videosWatched}/${user.stats.videosTotal}`;
        } else if (user.role === 'teacher' && user.stats) {
            statsText = `Видео: ${user.stats.videosCreated}, Тапсырма: ${user.stats.assignmentsCreated}`;
        }
        
        const approvedBadge = user.approved ? 
            '<span class="status-badge status-approved">Бекітілген</span>' : 
            '<span class="status-badge status-pending">Күтуде</span>';
        
        const paidBadge = user.role === 'student' ? 
            (user.paid ? '<span class="status-badge status-paid">Төленген</span>' : '<span class="status-badge status-unpaid">Төленбеген</span>') : 
            '-';
        
        const actionsDisabled = user.role === 'admin' ? 'disabled' : '';
        
        return `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${roleText}</span></td>
                <td>${approvedBadge}</td>
                <td>${paidBadge}</td>
                <td>${statsText}</td>
                <td>
                    <div class="action-buttons">
                        ${user.role === 'student' ? `<button class="btn-view" onclick="viewStudentDetails(${user.id})">Детали</button>` : ''}
                        ${user.role === 'student' && !user.paid ? `<button class="btn-reset" onclick="markPaid(${user.id})">Төлем белгілеу</button>` : ''}
                        ${user.role === 'student' && user.approved && user.paid ? `<button class="btn-login-as" onclick="loginAsStudent(${user.id})" title="Оқушы аккаунтына кіру">Оқушы аккаунтына кіру</button>` : ''}
                        <button class="btn-edit" onclick="openUserModal(${user.id})" ${actionsDisabled}>Өзгерту</button>
                        <button class="btn-reset" onclick="resetPassword(${user.id})" ${actionsDisabled}>Пароль</button>
                        <button class="btn-delete" onclick="deleteUser(${user.id})" ${actionsDisabled}>Жою</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Просмотр детальной информации об ученике
 * Показывает модальное окно с:
 * - Статистикой ученика (просмотренные видео, выполненные задания, средний балл)
 * - Прогрессом по видео-урокам
 * - Выполненными заданиями с оценками и комментариями учителя
 * 
 * @param {number} studentId - ID ученика
 */
async function viewStudentDetails(studentId) {
    try {
        const details = await apiRequest(`/students/${studentId}/details`);
        document.getElementById('studentDetailsTitle').textContent = `Студент деректері (ID: ${studentId})`;
        
        // Статистика
        const stats = details.stats;
        document.getElementById('studentStats').innerHTML = `
            <div class="stat-card">
                <h3>Көрілген видео</h3>
                <div class="stat-value">${stats.videos_watched || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Аяқталған видео</h3>
                <div class="stat-value">${stats.videos_completed || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Жіберілген тапсырма</h3>
                <div class="stat-value">${stats.assignments_submitted || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Орташа баға</h3>
                <div class="stat-value">${stats.average_grade ? stats.average_grade.toFixed(1) : '-'}</div>
            </div>
        `;
        
        // Прогресс
        document.getElementById('studentProgressBody').innerHTML = details.progress.map(p => `
            <tr>
                <td>${p.video_title}</td>
                <td><span class="subject-badge subject-${p.subject}">${p.subject === 'mathematics' ? 'Математика' : 'Информатика'}</span></td>
                <td>${p.completed ? 'Иә' : 'Жоқ'}</td>
                <td>${p.watched_seconds}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center;">Прогресс жоқ</td></tr>';
        
        // Задания
        document.getElementById('studentSubmissionsBody').innerHTML = details.submissions.map(s => `
            <tr>
                <td>${s.assignment_title}</td>
                <td><span class="subject-badge subject-${s.subject}">${s.subject === 'mathematics' ? 'Математика' : 'Информатика'}</span></td>
                <td>${s.grade !== null ? s.grade : '-'}</td>
                <td>${s.teacher_comment || '-'}</td>
                <td>${new Date(s.created_at).toLocaleDateString('kz-KZ')}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align: center;">Тапсырмалар жоқ</td></tr>';
        
        document.getElementById('studentDetailsModal').classList.add('active');
    } catch (error) {
        alert('Деректерді алу қатесі: ' + error.message);
    }
}

function closeStudentDetailsModal() {
    document.getElementById('studentDetailsModal').classList.remove('active');
}

/**
 * Открытие модального окна для создания/редактирования пользователя
 * 
 * При редактировании (userId указан):
 * - Загружает данные пользователя с сервера
 * - Заполняет форму данными пользователя
 * - Для учеников: загружает и отображает выбранные предметы (subjects)
 * - Для админа: блокирует изменение роли
 * 
 * При создании (userId = null):
 * - Показывает пустую форму
 * - Позволяет выбрать роль
 * - Для учеников: показывает выбор предметов
 * 
 * @param {number|null} userId - ID пользователя для редактирования, или null для создания нового
 */
async function openUserModal(userId = null) {
    currentEditUserId = userId;
    const form = document.getElementById('userForm');
    
    if (userId) {
        document.getElementById('userModalTitle').textContent = 'Пайдаланушыны өзгерту';
        const user = await apiRequest(`/users/${userId}`);
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        const userRole = user.role === 'admin' ? 'student' : user.role;
        document.getElementById('userRole').value = userRole;
        document.getElementById('userRole').disabled = user.role === 'admin';
        
        // Загрузить и отобразить subjects для учеников
        if (user.role === 'student') {
            console.log('Полные данные пользователя:', user); // Для отладки
            
            // Правильный парсинг subjects: может быть массив, строка JSON, или null
            let userSubjects = [];
            
            console.log('=== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ ДЛЯ РЕДАКТИРОВАНИЯ ===');
            console.log('Полные данные пользователя:', user);
            console.log('Subjects (raw):', user.subjects, 'Тип:', typeof user.subjects, 'Null?', user.subjects === null, 'Undefined?', user.subjects === undefined);
            
            if (user.subjects !== null && user.subjects !== undefined && user.subjects !== '') {
                if (Array.isArray(user.subjects)) {
                    // Если уже массив
                    userSubjects = user.subjects;
                    console.log('Subjects уже массив:', userSubjects);
                } else if (typeof user.subjects === 'string') {
                    // Если это строка JSON, пытаемся распарсить
                    try {
                        const parsed = JSON.parse(user.subjects);
                        if (Array.isArray(parsed)) {
                            userSubjects = parsed;
                            console.log('Subjects распарсены из JSON:', userSubjects);
                        } else {
                            console.warn('Subjects распарсены, но не массив:', parsed);
                        }
                    } catch (e) {
                        console.error('Ошибка парсинга subjects:', e, 'Строка:', user.subjects);
                        userSubjects = [];
                    }
                } else {
                    console.warn('Subjects неожиданный тип:', typeof user.subjects, user.subjects);
                }
            } else {
                console.log('Subjects пустые или null - ученик еще не выбрал предметы');
            }
            
            console.log('Итоговые subjects для установки чекбоксов:', userSubjects);
            
            // Устанавливаем чекбоксы на основе загруженных subjects
            const mathCheckbox = document.getElementById('userSubjectMath');
            const infoCheckbox = document.getElementById('userSubjectInfo');
            const subjectsGroup = document.getElementById('userSubjectsGroup');
            
            if (mathCheckbox && infoCheckbox && subjectsGroup) {
                mathCheckbox.checked = userSubjects.includes('mathematics');
                infoCheckbox.checked = userSubjects.includes('informatics');
                subjectsGroup.style.display = 'block';
                
                console.log('Чекбоксы установлены:', {
                    math: mathCheckbox.checked,
                    info: infoCheckbox.checked
                });
            } else {
                console.error('Не найдены элементы чекбоксов или группы subjects!', {
                    mathCheckbox: !!mathCheckbox,
                    infoCheckbox: !!infoCheckbox,
                    subjectsGroup: !!subjectsGroup
                });
            }
        } else {
            document.getElementById('userSubjectMath').checked = false;
            document.getElementById('userSubjectInfo').checked = false;
            document.getElementById('userSubjectsGroup').style.display = 'none';
        }
    } else {
        document.getElementById('userModalTitle').textContent = 'Пайдаланушы қосу';
        form.reset();
        document.getElementById('userRole').disabled = false;
        document.getElementById('userSubjectMath').checked = false;
        document.getElementById('userSubjectInfo').checked = false;
        document.getElementById('userSubjectsGroup').style.display = 'none';
    }
    
    // Вызвать toggleUserSubjects для обновления отображения при изменении роли
    // Добавляем обработчик изменения роли
    const roleSelect = document.getElementById('userRole');
    if (roleSelect) {
        // Удаляем старые обработчики, чтобы не дублировать
        const newRoleSelect = roleSelect.cloneNode(true);
        roleSelect.parentNode.replaceChild(newRoleSelect, roleSelect);
        newRoleSelect.addEventListener('change', toggleUserSubjects);
    }
    
    // Всегда вызываем toggleUserSubjects для правильного отображения группы subjects
    // Это безопасно, так как функция проверяет значение роли из select
    toggleUserSubjects();
    
    document.getElementById('userModal').classList.add('active');
}

/**
 * Показать/скрыть выбор предметов в зависимости от роли
 * Показывает группу выбора предметов только для роли "student"
 * Для других ролей скрывает и сбрасывает чекбоксы
 */
function toggleUserSubjects() {
    const roleSelect = document.getElementById('userRole');
    const subjectsGroup = document.getElementById('userSubjectsGroup');
    if (!roleSelect || !subjectsGroup) return;
    
    const role = roleSelect.value;
    if (role === 'student') {
        subjectsGroup.style.display = 'block';
    } else {
        subjectsGroup.style.display = 'none';
        const mathCheckbox = document.getElementById('userSubjectMath');
        const infoCheckbox = document.getElementById('userSubjectInfo');
        if (mathCheckbox) mathCheckbox.checked = false;
        if (infoCheckbox) infoCheckbox.checked = false;
    }
}

// Сделать функцию доступной глобально для вызова из HTML
window.toggleUserSubjects = toggleUserSubjects;

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    currentEditUserId = null;
    document.getElementById('userForm').reset();
}

/**
 * Обработчик отправки формы создания/редактирования пользователя
 * 
 * При создании:
 * - Собирает данные из формы
 * - Для учеников: собирает выбранные предметы (subjects)
 * - Запрашивает пароль у админа
 * - Отправляет POST запрос на создание пользователя
 * 
 * При редактировании:
 * - Собирает данные из формы
 * - Для учеников: всегда отправляет subjects (даже если не изменились)
 * - Для не-учеников: очищает subjects (устанавливает null)
 * - Отправляет PUT запрос на обновление пользователя
 * 
 * После успешного сохранения:
 * - Закрывает модальное окно
 * - Обновляет списки пользователей, ожидающих одобрения и статистику
 */
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const role = document.getElementById('userRole').value;
        const data = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            role: role
        };
        
        // Собрать выбранные предметы для учеников
        // ВАЖНО: Всегда отправляем subjects при редактировании студента, даже если они не изменились
        if (role === 'student') {
            // ВАЖНО: Проверяем, что группа subjects видна и чекбоксы доступны
            const subjectsGroup = document.getElementById('userSubjectsGroup');
            if (!subjectsGroup || subjectsGroup.style.display === 'none') {
                console.error('Группа subjects не видна!');
                alert('Пәндерді таңдау мүмкін емес. Бетті жаңартыңыз және қайталаңыз.');
                return;
            }
            
            const selectedSubjects = Array.from(document.querySelectorAll('input[name="userSubjects"]:checked')).map(cb => cb.value);
            console.log('=== ОТПРАВКА ДАННЫХ ===');
            console.log('Выбранные предметы из чекбоксов:', selectedSubjects);
            console.log('Все чекбоксы:', Array.from(document.querySelectorAll('input[name="userSubjects"]')).map(cb => ({
                value: cb.value,
                checked: cb.checked
            })));
            
            if (selectedSubjects.length === 0) {
                alert('Кемінде бір пән таңдаңыз');
                return;
            }
            data.subjects = selectedSubjects;
            console.log('✅ Subjects добавлены в data:', data.subjects);
        } else {
            // Для не-студентов (учителя и т.д.) subjects должны быть null
            // Если редактируем и меняем роль с student на teacher, очистить subjects
            if (currentEditUserId) {
                try {
                    const currentUser = await apiRequest(`/users/${currentEditUserId}`);
                    if (currentUser.role === 'student' && role !== 'student') {
                        data.subjects = null; // Очистить subjects при смене роли
                    } else if (role !== 'student') {
                        // Если роль не студент, всегда очищаем subjects
                        data.subjects = null;
                    }
                } catch (error) {
                    console.error('Ошибка при получении текущего пользователя:', error);
                    // В случае ошибки все равно очищаем subjects для не-студентов
                    if (role !== 'student') {
                        data.subjects = null;
                    }
                }
            } else {
                // При создании нового пользователя не-студента subjects не нужны
                if (role !== 'student') {
                    data.subjects = null;
                }
            }
        }
        
        if (currentEditUserId) {
            console.log('Отправка данных для обновления:', JSON.stringify(data, null, 2)); // Для отладки
            const response = await apiRequest(`/users/${currentEditUserId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            console.log('Ответ сервера:', response); // Для отладки
            alert('Пайдаланушы сәтті жаңартылды');
        } else {
            const password = prompt('Парольді енгізіңіз:');
            if (!password) return;
            await apiRequest('/users', {
                method: 'POST',
                body: JSON.stringify({ ...data, password })
            });
            alert('Пайдаланушы сәтті қосылды');
        }
        
        closeUserModal();
        // Обновить списки с небольшой задержкой, чтобы БД успела обновиться
        setTimeout(() => {
            loadUsers();
            loadPending();
            loadStats();
        }, 200);
    } catch (error) {
        alert('Қате: ' + error.message);
    }
});

async function resetPassword(userId) {
    const newPassword = prompt('Жаңа парольді енгізіңіз (кемінде 6 таңба):');
    if (!newPassword || newPassword.length < 6) {
        alert('Пароль кемінде 6 таңбадан тұруы керек');
        return;
    }
    
    if (!confirm('Парольді қалпына келтіруге сенімдісіз бе?')) return;
    
    try {
        await apiRequest(`/users/${userId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ newPassword })
        });
        alert('Пароль сәтті өзгертілді');
    } catch (error) {
        alert('Қате: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Пайдаланушыны жоюға сенімдісіз бе?')) return;
    
    try {
        await apiRequest(`/users/${userId}`, { method: 'DELETE' });
        alert('Пайдаланушы сәтті жойылды');
        loadUsers();
        loadPending();
        loadStats();
    } catch (error) {
        alert('Қате: ' + error.message);
    }
}

/**
 * Вход в аккаунт ученика от имени админа
 * Позволяет админу "притвориться" учеником для проверки его личного кабинета
 * 
 * Процесс:
 * 1. Сохраняет текущий админ токен в backup
 * 2. Получает токен ученика через API
 * 3. Сохраняет токен ученика в localStorage
 * 4. Устанавливает флаг isAdminImpersonation = true
 * 5. Перенаправляет на dashboard.html (личный кабинет ученика)
 * 
 * В личном кабинете ученика будет показана кнопка "Вернуться в админ панель"
 * 
 * @param {number} userId - ID ученика, в аккаунт которого нужно войти
 */
async function loginAsStudent(userId) {
    if (!confirm('Оқушы аккаунтына кіруге сенімдісіз бе? Сіз админ панелінен шығасыз.')) return;
    
    try {
        const response = await apiRequest(`/users/${userId}/login-as`, {
            method: 'POST'
        });
        
        // Сохранить админ токен для возврата
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = localStorage.getItem('adminUser');
        
        // Сохранить токен ученика
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Сохранить админ данные для возврата
        localStorage.setItem('adminTokenBackup', adminToken);
        localStorage.setItem('adminUserBackup', adminUser);
        localStorage.setItem('isAdminImpersonation', 'true');
        
        // Перенаправить на дашборд ученика
        window.location.href = '/dashboard.html';
    } catch (error) {
        alert('Оқушы аккаунтына кіру қатесі: ' + error.message);
    }
}

// ========== РАЗДЕЛ: УПРАВЛЕНИЕ ВИДЕО-УРОКАМИ ==========

/**
 * Загрузка списка всех видео-уроков с фильтрацией
 * Фильтрует по предмету (все / математика / информатика) и поисковому запросу
 * Также загружает список учителей для выпадающего списка в модальном окне
 */
async function loadVideos() {
    try {
        const subject = document.getElementById('videoSubjectFilter').value;
        const search = document.getElementById('videoSearch').value;
        
        const params = new URLSearchParams();
        if (subject !== 'all') params.append('subject', subject);
        if (search) params.append('search', search);
        
        allVideos = await apiRequest(`/videos?${params.toString()}`);
        renderVideos(allVideos);
        
        // Загрузить учителей для модального окна
        allTeachers = await apiRequest('/teachers');
        const teacherSelect = document.getElementById('videoTeacher');
        teacherSelect.innerHTML = allTeachers.map(t => 
            `<option value="${t.id}">${t.name} (${t.email})</option>`
        ).join('');
    } catch (error) {
        console.error('Видеоларды жүктеу қатесі:', error);
    }
}

function renderVideos(videos) {
    const tbody = document.getElementById('videosTableBody');
    
    if (videos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Видеолар табылмады</td></tr>';
        return;
    }
    
    tbody.innerHTML = videos.map(video => {
        const subjectText = video.subject === 'mathematics' ? 'Математика' : 'Информатика';
        const date = new Date(video.created_at).toLocaleDateString('kz-KZ');
        
        return `
            <tr>
                <td>${video.id}</td>
                <td>${video.title}</td>
                <td><span class="subject-badge subject-${video.subject}">${subjectText}</span></td>
                <td>${video.teacher_name}</td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openVideoModal(${video.id})">Өзгерту</button>
                        <button class="btn-view" onclick="viewVideoAssignments(${video.id})">Тапсырмалар</button>
                        <button class="btn-delete" onclick="deleteVideo(${video.id})">Жою</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewVideoAssignments(videoId) {
    try {
        const assignments = await apiRequest(`/videos/${videoId}/assignments`);
        if (assignments.length === 0) {
            alert('Бұл видеоға тапсырмалар жоқ');
            return;
        }
        alert(`Бұл видеоға ${assignments.length} тапсырма бар:\n${assignments.map(a => `- ${a.title}`).join('\n')}`);
    } catch (error) {
        alert('Тапсырмаларды алу қатесі: ' + error.message);
    }
}

async function openVideoModal(videoId = null) {
    currentEditVideoId = videoId;
    
    try {
        // Всегда загружать учителей при открытии модального окна
        allTeachers = await apiRequest('/teachers');
        
        const teacherSelect = document.getElementById('videoTeacher');
        
        if (allTeachers.length === 0) {
            teacherSelect.innerHTML = '<option value="">Мұғалімдер жоқ</option>';
            alert('Ескерту: Бекітілген мұғалімдер жоқ. Алдымен мұғалім қосыңыз немесе бекітіңіз.');
        } else {
            teacherSelect.innerHTML = allTeachers.map(t => 
                `<option value="${t.id}">${t.name} (${t.email})</option>`
            ).join('');
        }
        
        if (videoId) {
            document.getElementById('videoModalTitle').textContent = 'Видеоны өзгерту';
            const video = allVideos.find(v => v.id === videoId);
            if (video) {
                document.getElementById('videoTitle').value = video.title;
                document.getElementById('videoDescription').value = video.description || '';
                document.getElementById('videoUrl').value = video.youtube_url;
                document.getElementById('videoSubject').value = video.subject;
                document.getElementById('videoTeacher').value = video.teacher_id;
            }
        } else {
            document.getElementById('videoModalTitle').textContent = 'Видео қосу';
            document.getElementById('videoForm').reset();
            // Установить первого учителя по умолчанию, если есть
            if (allTeachers.length > 0) {
                document.getElementById('videoTeacher').value = allTeachers[0].id;
            }
        }
        
        document.getElementById('videoModal').classList.add('active');
    } catch (error) {
        console.error('Мұғалімдерді жүктеу қатесі:', error);
        alert('Мұғалімдерді жүктеу қатесі: ' + error.message);
    }
}

function closeVideoModal() {
    document.getElementById('videoModal').classList.remove('active');
    currentEditVideoId = null;
    document.getElementById('videoForm').reset();
}

document.getElementById('videoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const data = {
            title: document.getElementById('videoTitle').value,
            description: document.getElementById('videoDescription').value,
            youtube_url: document.getElementById('videoUrl').value,
            subject: document.getElementById('videoSubject').value,
            teacher_id: parseInt(document.getElementById('videoTeacher').value)
        };
        
        if (currentEditVideoId) {
            await apiRequest(`/videos/${currentEditVideoId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            alert('Видео сәтті жаңартылды');
        } else {
            await apiRequest('/videos', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            alert('Видео сәтті қосылды');
        }
        
        closeVideoModal();
        loadVideos();
    } catch (error) {
        alert('Қате: ' + error.message);
    }
});

async function deleteVideo(videoId) {
    if (!confirm('Видеоны жоюға сенімдісіз бе?')) return;
    
    try {
        await apiRequest(`/videos/${videoId}`, { method: 'DELETE' });
        alert('Видео сәтті жойылды');
        loadVideos();
        loadStats();
    } catch (error) {
        alert('Қате: ' + error.message);
    }
}

// ========== РАЗДЕЛ: УПРАВЛЕНИЕ ЗАДАНИЯМИ ==========

/**
 * Загрузка списка всех заданий с фильтрацией
 * Фильтрует по предмету и поисковому запросу
 * Также загружает список видео и учителей для выпадающих списков в модальном окне
 */
async function loadAssignments() {
    try {
        const subject = document.getElementById('assignmentSubjectFilter').value;
        const search = document.getElementById('assignmentSearch').value;
        
        const params = new URLSearchParams();
        if (subject !== 'all') params.append('subject', subject);
        if (search) params.append('search', search);
        
        const assignments = await apiRequest(`/assignments?${params.toString()}`);
        renderAssignments(assignments);
        
        // Загрузить видео и учителей для модального окна
        if (allVideos.length === 0) {
            allVideos = await apiRequest('/videos');
        }
        if (allTeachers.length === 0) {
            allTeachers = await apiRequest('/teachers');
        }
        
        const videoSelect = document.getElementById('assignmentVideo');
        videoSelect.innerHTML = '<option value="">Видео таңдамау</option>' + 
            allVideos.map(v => `<option value="${v.id}">${v.title}</option>`).join('');
        
        const teacherSelect = document.getElementById('assignmentTeacher');
        teacherSelect.innerHTML = allTeachers.map(t => 
            `<option value="${t.id}">${t.name} (${t.email})</option>`
        ).join('');
    } catch (error) {
        console.error('Тапсырмаларды жүктеу қатесі:', error);
    }
}

function renderAssignments(assignments) {
    const tbody = document.getElementById('assignmentsTableBody');
    
    if (assignments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Тапсырмалар табылмады</td></tr>';
        return;
    }
    
    tbody.innerHTML = assignments.map(assignment => {
        const subjectText = assignment.subject === 'mathematics' ? 'Математика' : 'Информатика';
        const deadline = assignment.deadline ? new Date(assignment.deadline).toLocaleDateString('kz-KZ') : '-';
        
        return `
            <tr>
                <td>${assignment.id}</td>
                <td>${assignment.title}</td>
                <td><span class="subject-badge subject-${assignment.subject}">${subjectText}</span></td>
                <td>${assignment.teacher_name}</td>
                <td>${deadline}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openAssignmentModal(${assignment.id})">Өзгерту</button>
                        <button class="btn-delete" onclick="deleteAssignment(${assignment.id})">Жою</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openAssignmentModal(assignmentId = null) {
    currentEditAssignmentId = assignmentId;
    
    try {
        // Всегда загружать данные при открытии модального окна
        allVideos = await apiRequest('/videos');
        allTeachers = await apiRequest('/teachers');
        
        const videoSelect = document.getElementById('assignmentVideo');
        videoSelect.innerHTML = '<option value="">Видео таңдамау</option>' + 
            allVideos.map(v => `<option value="${v.id}">${v.title}</option>`).join('');
        
        const teacherSelect = document.getElementById('assignmentTeacher');
        
        if (allTeachers.length === 0) {
            teacherSelect.innerHTML = '<option value="">Мұғалімдер жоқ</option>';
            alert('Ескерту: Бекітілген мұғалімдер жоқ. Алдымен мұғалім қосыңыз немесе бекітіңіз.');
        } else {
            teacherSelect.innerHTML = allTeachers.map(t => 
                `<option value="${t.id}">${t.name} (${t.email})</option>`
            ).join('');
        }
        
        if (assignmentId) {
            document.getElementById('assignmentModalTitle').textContent = 'Тапсырманы өзгерту';
            const assignments = await apiRequest('/assignments');
            const assignment = assignments.find(a => a.id === assignmentId);
            if (assignment) {
                document.getElementById('assignmentTitle').value = assignment.title;
                document.getElementById('assignmentDescription').value = assignment.description || '';
                document.getElementById('assignmentFileUrl').value = assignment.file_url || '';
                document.getElementById('assignmentDeadline').value = assignment.deadline ? 
                    new Date(assignment.deadline).toISOString().slice(0, 16) : '';
                document.getElementById('assignmentSubject').value = assignment.subject;
                document.getElementById('assignmentTeacher').value = assignment.teacher_id;
                document.getElementById('assignmentVideo').value = assignment.video_id || '';
            }
        } else {
            document.getElementById('assignmentModalTitle').textContent = 'Тапсырма қосу';
            document.getElementById('assignmentForm').reset();
            // Установить первого учителя по умолчанию, если есть
            if (allTeachers.length > 0) {
                document.getElementById('assignmentTeacher').value = allTeachers[0].id;
            }
        }
        
        document.getElementById('assignmentModal').classList.add('active');
    } catch (error) {
        console.error('Деректерді жүктеу қатесі:', error);
        alert('Деректерді жүктеу қатесі: ' + error.message);
    }
}

function closeAssignmentModal() {
    document.getElementById('assignmentModal').classList.remove('active');
    currentEditAssignmentId = null;
    document.getElementById('assignmentForm').reset();
}

document.getElementById('assignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const deadline = document.getElementById('assignmentDeadline').value;
        const data = {
            title: document.getElementById('assignmentTitle').value,
            description: document.getElementById('assignmentDescription').value,
            file_url: document.getElementById('assignmentFileUrl').value || null,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            subject: document.getElementById('assignmentSubject').value,
            teacher_id: parseInt(document.getElementById('assignmentTeacher').value),
            video_id: document.getElementById('assignmentVideo').value ? 
                parseInt(document.getElementById('assignmentVideo').value) : null
        };
        
        if (currentEditAssignmentId) {
            await apiRequest(`/assignments/${currentEditAssignmentId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            alert('Тапсырма сәтті жаңартылды');
        } else {
            await apiRequest('/assignments', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            alert('Тапсырма сәтті қосылды');
        }
        
        closeAssignmentModal();
        loadAssignments();
    } catch (error) {
        alert('Қате: ' + error.message);
    }
});

async function deleteAssignment(assignmentId) {
    if (!confirm('Тапсырманы жоюға сенімдісіз бе?')) return;
    
    try {
        await apiRequest(`/assignments/${assignmentId}`, { method: 'DELETE' });
        alert('Тапсырма сәтті жойылды');
        loadAssignments();
        loadStats();
    } catch (error) {
        alert('Қате: ' + error.message);
    }
}

// ========== РАЗДЕЛ: УПРАВЛЕНИЕ КОММЕНТАРИЯМИ ==========

/**
 * Загрузка списка всех комментариев к видео-урокам
 * Показывает комментарии всех пользователей
 * Админ может удалять комментарии
 */
async function loadComments() {
    try {
        const comments = await apiRequest('/comments');
        renderComments(comments);
    } catch (error) {
        console.error('Комментарийлерді жүктеу қатесі:', error);
    }
}

function renderComments(comments) {
    const tbody = document.getElementById('commentsTableBody');
    
    if (comments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Комментарийлер жоқ</td></tr>';
        return;
    }
    
    tbody.innerHTML = comments.map(comment => {
        const date = new Date(comment.created_at).toLocaleDateString('kz-KZ');
        return `
            <tr>
                <td>${comment.id}</td>
                <td>${comment.user_name}</td>
                <td>${comment.video_title}</td>
                <td>${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}</td>
                <td>${date}</td>
                <td>
                    <button class="btn-delete" onclick="deleteComment(${comment.id})">Жою</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteComment(commentId) {
    if (!confirm('Комментарийді жоюға сенімдісіз бе?')) return;
    
    try {
        await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
        alert('Комментарий сәтті жойылды');
        loadComments();
        loadStats();
    } catch (error) {
        alert('Қате: ' + error.message);
    }
}

// ========== РАЗДЕЛ: ПРОГРЕСС УЧЕНИКОВ ==========

/**
 * Загрузка прогресса всех учеников по видео-урокам
 * Показывает:
 * - Имя ученика
 * - Название видео
 * - Предмет
 * - Просмотренные секунды
 * - Статус завершения (да/нет)
 * - Дата последнего обновления
 */
async function loadProgress() {
    try {
        const progress = await apiRequest('/progress');
        renderProgress(progress);
    } catch (error) {
        console.error('Прогресс жүктеу қатесі:', error);
    }
}

function renderProgress(progress) {
    const tbody = document.getElementById('progressTableBody');
    
    if (progress.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Прогресс жоқ</td></tr>';
        return;
    }
    
    tbody.innerHTML = progress.map(p => {
        const subjectText = p.subject === 'mathematics' ? 'Математика' : 'Информатика';
        const date = new Date(p.updated_at).toLocaleDateString('kz-KZ');
        return `
            <tr>
                <td>${p.student_name}</td>
                <td>${p.video_title}</td>
                <td><span class="subject-badge subject-${p.subject}">${subjectText}</span></td>
                <td>${p.watched_seconds} сек</td>
                <td>${p.completed ? 'Иә' : 'Жоқ'}</td>
                <td>${date}</td>
            </tr>
        `;
    }).join('');
}

// ========== ВЫХОД ИЗ АДМИН ПАНЕЛИ ==========

/**
 * Выход из админ панели
 * Удаляет токен и данные админа из localStorage
 * Перенаправляет на страницу входа в админ панель
 */
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin-login.html';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

/**
 * Инициализация админ панели при загрузке страницы
 * 
 * 1. Проверяет авторизацию админа
 * 2. Настраивает обработчики событий для фильтров и поиска:
 *    - Поиск пользователей (с задержкой 500мс - debounce)
 *    - Фильтр по роли пользователей
 *    - Поиск и фильтр видео
 *    - Поиск и фильтр заданий
 *    - Поиск комментариев
 *    - Поиск прогресса
 * 3. Загружает начальную статистику
 */
if (checkAuth()) {
    // Event listeners для фильтров
    document.getElementById('userSearch')?.addEventListener('input', debounce(loadUsers, 500));
    document.getElementById('userRoleFilter')?.addEventListener('change', loadUsers);
    document.getElementById('videoSearch')?.addEventListener('input', debounce(loadVideos, 500));
    document.getElementById('videoSubjectFilter')?.addEventListener('change', loadVideos);
    document.getElementById('assignmentSearch')?.addEventListener('input', debounce(loadAssignments, 500));
    document.getElementById('assignmentSubjectFilter')?.addEventListener('change', loadAssignments);
    document.getElementById('commentSearch')?.addEventListener('input', debounce(loadComments, 500));
    document.getElementById('progressSearch')?.addEventListener('input', debounce(loadProgress, 500));
    
    // Загрузить начальные данные
    loadStats();
}

/**
 * Функция debounce для ограничения частоты вызовов функции
 * Используется для поиска, чтобы не отправлять запрос при каждом нажатии клавиши
 * 
 * @param {Function} func - Функция, которую нужно ограничить
 * @param {number} wait - Время задержки в миллисекундах
 * @returns {Function} Обёрнутая функция с задержкой
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
