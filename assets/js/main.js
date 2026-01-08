// Main JavaScript file for Panopticon Dashboard

// Cookie Helpers
const setCookie = (name, value, days) => {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
};

const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

const eraseCookie = (name) => {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

document.addEventListener('DOMContentLoaded', () => {
    const authContent = document.getElementById('auth-content');
    const unauthContent = document.getElementById('unauth-content');
    const logoutBtn = document.getElementById('logout-btn');

    const isLoggedIn = getCookie('panopticon_session') === 'true';

    if (isLoggedIn) {
        authContent.classList.remove('hidden');
        unauthContent.classList.add('hidden');
    } else {
        authContent.classList.add('hidden');
        unauthContent.classList.remove('hidden');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            eraseCookie('panopticon_session');
            window.location.reload();
        });
    }

    console.log('Panopticon Landing Page initialized. Auth state:', isLoggedIn);
});
