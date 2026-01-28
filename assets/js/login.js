const { Client, Account } = Appwrite;

// Config is loaded from config.js
const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const account = new Account(client);

const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('username')?.value; // Using username field as email for Appwrite
        const password = document.getElementById('password')?.value;

        if (!email || !password) return;

        const submitBtn = loginForm.querySelector('.login-btn');
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = 'AUTHENTICATING...';
        submitBtn.disabled = true;

        try {
            // Create session using email and password
            await account.createEmailPasswordSession(email, password);

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            alert("Login failed: " + (error.message || "Invalid credentials"));
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}
