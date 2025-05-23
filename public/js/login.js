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

            console.log('Attempting login with:', { ...credentials, password: '***' });

            const response = await fetch('/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Errore durante il login');
            }

            if (!data.token || !data.user || !data.expiresIn) {
                console.error('Missing required login data:', data);
                throw new Error('Dati di login incompleti dal server');
            }

            AuthService.setSession(data.token, data.user, data.expiresIn);
            window.location.href = '/index.html';

        } catch (error) {
            console.error('Login error details:', error);
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
        }
    });
});