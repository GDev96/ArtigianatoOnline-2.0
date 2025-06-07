document.addEventListener('DOMContentLoaded', function() {
    // BLOCCA QUALSIASI TENTATIVO DI RELOAD DELLA PAGINA
    window.addEventListener('beforeunload', function(e) {
        if (window.isLoggingIn) {
            console.log('TENTATIVO DI RELOAD BLOCCATO DURANTE LOGIN');
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });

    // Intercetta e blocca tutti i submit di form
    document.addEventListener('submit', function(e) {
        console.log('Submit intercettato:', e.target);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }, true);

    // Intercetta tutti i click sui link
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A' && e.target.href) {
            console.log('Click su link intercettato:', e.target.href);
            if (window.isLoggingIn) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    }, true);

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Previeni il submit del form in tutti i modi possibili
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            console.log('Form submit intercettato');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        });
    }

    // Password toggle functionality
    togglePassword?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    // Button click event invece di form submit
    const loginButton = document.getElementById('loginButton');
    loginButton?.addEventListener('click', handleLogin);
    
    // Aggiungi anche gestione per Enter key nei campi input
    passwordInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin(e);
        }
    });
    
    document.getElementById('usernameInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin(e);
        }
    });
    
    async function handleLogin(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('=== INIZIO LOGIN ===');
        
        const submitButton = document.getElementById('loginButton');
        const originalButtonText = submitButton.textContent;
        const loginError = document.getElementById('loginError');
        
        try {
            window.isLoggingIn = true;
            submitButton.disabled = true;
            submitButton.textContent = 'Accesso in corso...';
            loginError.classList.add('d-none');

            const credentials = {
                nome_utente: document.getElementById('usernameInput').value.trim(),
                password: document.getElementById('passwordInput').value
            };

            // Basic validation
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

            // Check if response is null (from fetch interceptor)
            if (!response) {
                throw new Error('Errore di comunicazione con il server');
            }

            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const responseText = await response.text();
                console.error('Non-JSON response:', responseText);
                throw new Error('Errore di comunicazione con il server');
            }

            // Handle specific error codes
            if (response.status === 401) {
                throw new Error(data.error || 'Credenziali non valide');
            }
            
            if (response.status === 403) {
                throw new Error(data.error || 'Account non attivo o sospeso');
            }

            if (!response.ok) {
                throw new Error(data.error || `Errore del server (${response.status})`);
            }

            if (data?.success && data?.token && data?.user) {
                AuthService.setSession(data.token, data.user);
                window.location.href = '/index.html';
            } else {
                throw new Error('Dati di login incompleti');
            }

        } catch (error) {
            console.error('=== CATCH BLOCK ===');
            console.error('Errore login:', error);
            
            // Handle different error types
            let errorMessage = 'Errore durante il login';
            
            if (error instanceof TypeError && error.message.includes('headers')) {
                errorMessage = 'Errore di connessione al server';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            loginError.textContent = errorMessage;
            loginError.classList.remove('d-none');
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
            
        } finally {
            console.log('=== FINALLY BLOCK ===');
            window.isLoggingIn = false;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
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
            if (modal) {
                modal.hide();
            }
        }, 3000);

    } catch (error) {
        console.error('Password recovery error:', error);
        recoverError.textContent = error.message;
        recoverError.classList.remove('d-none');
    }
}