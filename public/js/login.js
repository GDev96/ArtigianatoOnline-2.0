document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    togglePassword?.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    // Handle form submission
    loginForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        loginError.classList.add('d-none');
        
        try {
            const credentials = {
                nome_utente: document.getElementById('usernameInput').value.trim(),
                password: document.getElementById('passwordInput').value
            };

            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || 'Errore durante il login');
            }

            if (!data.token || !data.user) {
                throw new Error('Dati di login incompleti dal server');
            }

            AuthService.setSession(data.token, data.user);
            window.location.href = '/index.html';

        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
        }
    });
});