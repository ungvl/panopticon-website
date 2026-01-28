const { Client, Account } = Appwrite;

// Config is loaded from config.js
const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const account = new Account(client);

// Auth Toggle Containers
const unauthContent = document.getElementById('unauth-content');
const authContent = document.getElementById('auth-content');

const checkAuth = async () => {
    try {
        const user = await account.get();

        // Check for admin label
        const isAdmin = user.labels && user.labels.includes('admin');
        sessionStorage.setItem('isAdmin', isAdmin);
        sessionStorage.setItem('userEmail', user.email);

        // Redirect to Dashboard
        window.location.href = 'pages/dashboard.html';
    } catch (error) {
        // Show Guest View
        if (unauthContent) unauthContent.classList.remove('hidden');
        if (authContent) authContent.classList.add('hidden');
    }
};

// Run auth check on load
document.addEventListener('DOMContentLoaded', checkAuth);

// Handle Logout
const handleLogout = async (e) => {
    if (e) e.preventDefault();
    try {
        await account.deleteSession('current');
        window.location.reload();
    } catch (error) {
        // Silent fail
    }
};

// Expose to logout link
document.addEventListener('click', (e) => {
    if (e.target.closest('.logout-link a')) {
        handleLogout(e);
    }
});
