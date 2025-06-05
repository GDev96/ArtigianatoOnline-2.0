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

async function requestPasswordRecovery() {
    const emailInput = document.getElementById('emailInput');
    const recoverError = document.getElementById('recoverError');
    const recoverSuccess = document.getElementById('recoverSuccess');
    
    // Reset messages
    recoverError.classList.add('d-none');
    recoverSuccess.classList.add('d-none');

    try {
        const email = emailInput.value.trim();
        
        if (!email) {
            throw new Error('Inserisci un indirizzo email valido');
        }

        const response = await fetch('/auth/recover-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Errore durante la richiesta di recupero password');
        }

        // Show success message
        recoverSuccess.textContent = 'Email di recupero inviata! Controlla la tua casella di posta.';
        recoverSuccess.classList.remove('d-none');
        
        // Clear input
        emailInput.value = '';
        
        // Automatically close modal after 3 seconds
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('recoverPasswordModal'));
            modal.hide();
        }, 3000);

    } catch (error) {
        console.error('Password recovery error:', error);
        recoverError.textContent = error.message;
        recoverError.classList.remove('d-none');
    }
}