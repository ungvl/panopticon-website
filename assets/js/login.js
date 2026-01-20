const { Client, Account } = Appwrite;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('68f0d9e300322bff44ec');

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
            console.log("Logged in!");

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed: " + (error.message || "Invalid credentials"));
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}
