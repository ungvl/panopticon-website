// Main JavaScript file for Panopticon Dashboard

document.addEventListener('DOMContentLoaded', () => {
    const authContent = document.getElementById('auth-content');
    const unauthContent = document.getElementById('unauth-content');
    const logoutBtn = document.getElementById('logout-btn');

    const isLoggedIn = localStorage.getItem('panopticon_auth') === 'true';

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
            localStorage.removeItem('panopticon_auth');
            window.location.reload();
        });
    }

    console.log('Panopticon Landing Page initialized. Auth state:', isLoggedIn);
});
