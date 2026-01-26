const { Client, Account } = Appwrite;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('68f0d9e300322bff44ec');

const account = new Account(client);

// Auth Toggle Containers
const unauthContent = document.getElementById('unauth-content');
const authContent = document.getElementById('auth-content');

const checkAuth = async () => {
    try {
        const user = await account.get();
        console.log("Authenticated User:", user);

        // Check for admin label
        const isAdmin = user.labels && user.labels.includes('admin');
        sessionStorage.setItem('isAdmin', isAdmin);
        sessionStorage.setItem('userEmail', user.email);

        // Redirect to Dashboard
        console.log("User logged in, redirecting to dashboard...");
        window.location.href = 'pages/dashboard.html';
    } catch (error) {
        console.log("Not authenticated", error);

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
        console.error("Logout failed", error);
    }
};

// Expose to logout link
document.addEventListener('click', (e) => {
    if (e.target.closest('.logout-link a')) {
        handleLogout(e);
    }
});
