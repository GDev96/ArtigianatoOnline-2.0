document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    // Handle form submission
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        loginError.classList.add('d-none');
        
        try {
            const response = await AuthService.fetch('/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    nome_utente: document.getElementById('usernameInput').value.trim(),
                    password: document.getElementById('passwordInput').value 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Errore durante il login');
            }

            AuthService.setSession(data.token, data.user, data.expiresIn);
            window.location.href = '/index.html';

        } catch (error) {
            console.error('Errore:', error);
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
        }
    });
});