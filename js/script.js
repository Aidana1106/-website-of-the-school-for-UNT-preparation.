/**
 * ENT-Bilim - Main JavaScript
 * Features: Animations, forms, sliders, counters
 * Тек қазақ тілі - Математика және Информатика
 */

// ===== GLOBAL VARIABLES =====
let currentLanguage = 'kz';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initAOS();
    initSwiper();
    initHeader();
    initMobileMenu();
    initTranslations();
    initForms();
    initScrollToTop();
    initCounters();
    initSmoothScroll();
    initTrialLesson();
});

// ===== THEME TOGGLE =====
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    
    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Optional: Add animation effect
            themeToggle.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                themeToggle.style.transform = 'rotate(0deg)';
            }, 300);
            
            console.log(`Theme switched to: ${newTheme}`);
        });
    }
}

// ===== AOS ANIMATION INITIALIZATION =====
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 100,
            delay: 50
        });
    }
}

// ===== SWIPER SLIDER INITIALIZATION =====
function initSwiper() {
    if (typeof Swiper !== 'undefined') {
        const testimonialSwiper = new Swiper('.testimonials-slider', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 30
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 30
                }
            }
        });
    }
}

/**
 * Инициализация эффекта прокрутки для шапки сайта
 * При прокрутке страницы вниз более чем на 100px:
 * - Добавляет класс 'scrolled' к шапке
 * - Это позволяет изменить стиль шапки (например, сделать её фиксированной или изменить фон)
 */
function initHeader() {
    const header = document.getElementById('header');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

/**
 * Инициализация мобильного меню
 * 
 * Функционал:
 * 1. Переключение мобильного меню по клику на кнопку-гамбургер
 * 2. Блокировка прокрутки страницы при открытом меню
 * 3. Раскрытие/сворачивание выпадающих пунктов меню на мобильных устройствах
 * 4. Закрытие меню при клике на ссылку
 * 5. Закрытие меню при клике вне меню
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });
        
        // Mobile dropdown toggle
        const dropdownItems = document.querySelectorAll('.nav-item-dropdown');
        dropdownItems.forEach(item => {
            const link = item.querySelector('.nav-link-dropdown');
            if (link) {
                link.addEventListener('click', (e) => {
                    if (window.innerWidth <= 1024) {
                        e.preventDefault();
                        item.classList.toggle('active');
                    }
                });
            }
        });
        
        // Close menu when clicking on a dropdown link
        const dropdownLinks = navMenu.querySelectorAll('.dropdown-link');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                dropdownItems.forEach(item => item.classList.remove('active'));
            });
        });
        
        // Close menu when clicking on regular nav link
        const navLinks = navMenu.querySelectorAll('.nav-link:not(.nav-link-dropdown)');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
                dropdownItems.forEach(item => item.classList.remove('active'));
            }
        });
    }
}

/**
 * Инициализация переводов на странице
 * 
 * Процесс:
 * 1. Устанавливает атрибут lang у HTML элемента
 * 2. Находит все элементы с атрибутом data-translate
 * 3. Заменяет текст элементов на переводы из объекта translations
 * 4. Обновляет placeholder у полей ввода
 * 5. Обновляет атрибуты title у элементов
 * 
 * Используется для динамической локализации контента страницы
 */
function initTranslations() {
    // Set HTML lang attribute
    document.documentElement.lang = currentLanguage;
    
    // Update all translatable elements
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            // Check if element is input or select
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translations[currentLanguage][key];
            } else if (element.tagName === 'SELECT') {
                // Skip select elements as they have data-translate-placeholder
            } else {
                element.textContent = translations[currentLanguage][key];
            }
        }
    });
    
    // Update placeholders
    const placeholders = document.querySelectorAll('[data-translate-placeholder]');
    placeholders.forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.placeholder = translations[currentLanguage][key];
        }
    });
    
    // Update select options
    updateSelectOptions(currentLanguage);
}

function updateSelectOptions(lang) {
    const selects = document.querySelectorAll('select[data-translate-placeholder]');
    selects.forEach(select => {
        const options = select.querySelectorAll('option[data-translate]');
        options.forEach(option => {
            const key = option.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                option.textContent = translations[lang][key];
            }
        });
    });
}

// ===== FORM HANDLING =====
function initForms() {
    // Hero Form
    const heroForm = document.getElementById('heroForm');
    if (heroForm) {
        heroForm.addEventListener('submit', handleFormSubmit);
        initPhoneMask(heroForm);
    }
    
    // CTA Form
    const ctaForm = document.getElementById('ctaForm');
    if (ctaForm) {
        ctaForm.addEventListener('submit', handleFormSubmit);
        initPhoneMask(ctaForm);
    }
    
    // Contacts Form
    const contactsForm = document.getElementById('contactsForm');
    if (contactsForm) {
        contactsForm.addEventListener('submit', handleFormSubmit);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Get form data
    const inputs = form.querySelectorAll('input, textarea, select');
    const data = {};
    
    inputs.forEach(input => {
        // Получаем значение из placeholder или name/id
        let key = input.name || input.id;
        if (!key) {
            // Пытаемся определить по типу и placeholder
            const placeholder = input.placeholder?.toLowerCase() || '';
            if (placeholder.includes('имя') || placeholder.includes('аты')) {
                key = 'name';
            } else if (placeholder.includes('телефон') || placeholder.includes('phone') || input.type === 'tel') {
                key = 'contact';
            } else if (placeholder.includes('email') || input.type === 'email') {
                key = 'contact';
            } else if (placeholder.includes('сообщение') || placeholder.includes('хабарлама') || input.tagName === 'TEXTAREA') {
                key = 'message';
            } else if (input.tagName === 'SELECT') {
                key = 'program';
            }
        }
        
        if (key) {
            if (input.type === 'checkbox') {
                data[key] = input.checked;
            } else if (input.tagName === 'SELECT') {
                data[key] = input.value;
            } else {
                const value = input.value.trim();
                if (value) {
                    // Если поле contact уже заполнено, но это email - объединяем
                    if (key === 'contact' && data.contact && input.type === 'email') {
                        data.contact = `${data.contact} / ${value}`;
                    } else {
                        data[key] = value;
                    }
                }
            }
        }
    });
    
    // Определяем тип формы
    let formType = 'contact';
    if (form.id === 'heroForm') {
        formType = 'hero';
    } else if (form.id === 'ctaForm') {
        formType = 'cta';
    } else if (form.id === 'contactsForm') {
        formType = 'contact';
    }
    
    // Подготовка данных для отправки
    const payload = {
        name: data.name || '',
        contact: data.contact || '',
        message: data.message || '',
        formType: formType,
        program: data.program || ''
    };
    
    // Валидация
    if (!payload.name || !payload.contact) {
        showNotification(
            currentLanguage === 'ru' 
                ? 'Пожалуйста, заполните все обязательные поля.' 
                : 'Барлық міндетті өрістерді толтырыңыз.',
            'error'
        );
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
        return;
    }
    
    // Show loading state
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Жіберілуде...';
    
    try {
        // Отправка на сервер
        const response = await fetch('/api/telegram/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Show success message
            showNotification(
                currentLanguage === 'ru' 
                    ? 'Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время.' 
                    : 'Рахмет! Біз сізбен жақын арада байланысамыз.',
                'success'
            );
            
            // Reset form
            form.reset();
        } else {
            throw new Error(result.error || 'Ошибка отправки');
        }
    } catch (error) {
        console.error('Ошибка отправки формы:', error);
        showNotification(
            currentLanguage === 'ru' 
                ? 'Произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.' 
                : 'Қате орын алды. Кейінірек қайталаңыз немесе бізбен тікелей байланысыңыз.',
            'error'
        );
    } finally {
        // Restore button
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

function initPhoneMask(form) {
    const phoneInputs = form.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Limit to 11 digits (7 + 10)
            if (value.length > 11) {
                value = value.slice(0, 11);
            }
            
            // Format: +7 (___) ___-__-__
            let formatted = '+7';
            if (value.length > 1) {
                formatted += ' (' + value.substring(1, 4);
            }
            if (value.length >= 5) {
                formatted += ') ' + value.substring(4, 7);
            }
            if (value.length >= 8) {
                formatted += '-' + value.substring(7, 9);
            }
            if (value.length >= 10) {
                formatted += '-' + value.substring(9, 11);
            }
            
            e.target.value = formatted;
        });
        
        // Auto-add +7 on focus
        input.addEventListener('focus', (e) => {
            if (!e.target.value) {
                e.target.value = '+7 ';
            }
        });
    });
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 32px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ===== SCROLL TO TOP BUTTON =====
function initScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 500) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// ===== COUNTER ANIMATION =====
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps
    let current = 0;
    
    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    };
    
    updateCounter();
}

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if href is just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== ACTIVE NAVIGATION LINK =====
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== KEYBOARD ACCESSIBILITY =====
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape') {
        const menuToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.getElementById('navMenu');
        if (menuToggle && navMenu && navMenu.classList.contains('active')) {
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ===== TRIAL LESSON =====
function initTrialLesson() {
    const trialLessonBtn = document.getElementById('watchTrialLessonBtn');
    
    if (trialLessonBtn) {
        trialLessonBtn.addEventListener('click', () => {
            window.location.href = 'trial-lesson.html';
        });
    }
}

// ===== CONSOLE MESSAGE =====
console.log('%c ENT-Bilim ', 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 8px;');
console.log('%c Математика және Информатика бойынша ҰБТ-ға дайындалуға арналған онлайн платформа ', 'font-size: 14px; color: #6366f1;');
console.log('%c Theme: ' + (localStorage.getItem('theme') || 'light') + ' mode 🎨', 'font-size: 12px; color: #10b981;');

// ===== ADD NOTIFICATION ANIMATIONS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

