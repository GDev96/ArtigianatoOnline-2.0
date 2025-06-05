document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Password toggle
    togglePassword?.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    // Form submission
    if (loginForm) {
        // Use addEventListener instead of onsubmit
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation(); // Stop any other handlers
            
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            loginError.classList.add('d-none');
            
            try {
                const credentials = {
                    nome_utente: document.getElementById('usernameInput').value.trim(),
                    password: passwordInput.value
                };

                if (!credentials.nome_utente || !credentials.password) {
                    throw new Error('Username e password sono richiesti');
                }

                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(credentials)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Credenziali non valide');
                }

                if (!data.success || !data.token || !data.user) {
                    throw new Error('Dati di login incompleti');
                }

                // Delay redirect slightly to ensure error handling completes
                AuthService.setSession(data.token, data.user);
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 100);

            } catch (error) {
                console.error('Login error:', error);
                loginError.textContent = error.message;
                loginError.classList.remove('d-none');
                passwordInput.value = '';
                passwordInput.focus();
            } finally {
                submitButton.disabled = false;
            }
        });

        // Prevent form submission via Enter key
        loginForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }
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