document.addEventListener('DOMContentLoaded', function() {
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
            // Set initial states
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
    
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Errore parsing JSON:', jsonError);
                throw new Error('Errore di comunicazione con il server');
            }
    
            console.log('=== RISPOSTA SERVER ===');
    
            // Handle specific error codes
            if (response.status === 401) {
                throw new Error('Credenziali non valide');
            }
            
            if (response.status === 403 && data.code === 'ACCOUNT_SUSPENDED') {
                let giorniRimanenti = 3; // Default to 3 days if no date provided
                try {
                    if (typeof bootstrap === 'undefined') {
                        throw new Error('Account sospeso per 3 giorni');
                    }
            
                    const modalEl = document.getElementById('suspensionModal');
                    if (!modalEl) {
                        throw new Error('Account sospeso per 3 giorni');
                    }
            
                    if (data.suspension && data.suspension.dataFine) {
                        // Calculate remaining days
                        const dataFine = new Date(data.suspension.dataFine);
                        const oggi = new Date();
                        giorniRimanenti = Math.ceil((dataFine - oggi) / (1000 * 60 * 60 * 24));
                        giorniRimanenti = Math.max(1, Math.min(3, giorniRimanenti));
                    }
            
                    const modalBody = modalEl.querySelector('.modal-body');
                    if (!modalBody) {
                        throw new Error('Account sospeso per 3 giorni');
                    }
            
                    // Format suspension message
                    modalBody.innerHTML = `
                        <div class="text-center">
                            <i class="bi bi-exclamation-triangle text-danger fs-1 mb-3"></i>
                            <h4 class="text-danger mb-3">Account Sospeso</h4>
                            <p class="mb-2">Il tuo account è stato sospeso per ${giorniRimanenti} ${giorniRimanenti === 1 ? 'giorno' : 'giorni'}.</p>
                            ${data.suspension?.dataFine ? `
                                <p class="text-muted">Data prevista di riattivazione:<br>
                                <strong>${new Date(data.suspension.dataFine).toLocaleString('it-IT', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}</strong></p>
                            ` : ''}
                        </div>
                    `;
            
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                    return;
            
                } catch (modalError) {
                    console.error('Error handling suspension:', modalError);
                    throw new Error(`Account sospeso per ${giorniRimanenti} giorni`);
                }
            }

            if (!response.ok) {
                throw new Error(data.error || `Errore del server (${response.status})`);
            }
    
            if (!data.success || !data.token || !data.user) {
                throw new Error('Dati di login incompleti');
            }
    
            // Login successful
            console.log('=== LOGIN COMPLETATO ===');
            AuthService.setSession(data.token, data.user);
            window.location.href = '/index.html';
    
        } catch (error) {
            console.error('=== ERRORE LOGIN ===');
            console.error('Tipo errore:', error.name);
            console.error('Messaggio:', error.message);
            
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
            
        } finally {
            // Reset states
            window.isLoggingIn = false;
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            console.log('=== FINE PROCESSO LOGIN ===');
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