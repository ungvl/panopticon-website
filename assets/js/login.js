document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    // Minimal logic for the "WIP" feel
    const username = document.getElementById('username').value;

    if (username) {
        localStorage.setItem('panopticon_auth', 'true');
        console.log('Login successful');
        window.location.href = '../index.html';
    }
});
