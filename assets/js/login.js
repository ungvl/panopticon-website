// Login functionality
const setCookie = (name, value, days) => {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
};

document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    // Minimal logic: any input allows login for now
    const username = document.getElementById('username').value;

    if (username) {
        setCookie('panopticon_session', 'true', 1);
        console.log('Login successful');
        window.location.href = '../index.html';
    }
});
