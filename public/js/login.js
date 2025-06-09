document.addEventListener('DOMContentLoaded', function() {
    
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    const usernameInput = document.getElementById('usernameInput');
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const loginError = document.getElementById('loginError');


    // Gestione del toggle password
    togglePassword?.addEventListener('click', function(e) {
        e.preventDefault();
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    // Gestione form submit
    loginForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

    // Gestione click del bottone
    loginButton?.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Gestione Enter key negli input
    [usernameInput, passwordInput].forEach(input => {
        input?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    });
    
    async function handleLogin() {
        
        const submitButton = document.getElementById('loginButton');
        const originalButtonText = submitButton?.textContent || 'Accedi';
        const loginError = document.getElementById('loginError');
        
        // Flag per indicare che stiamo effettuando il login
        window.isLoggingIn = true;
        
        // Verifica che tutti gli elementi esistano
        if (!usernameInput || !passwordInput || !submitButton) {
            console.error('Required form elements not found');
            showError('Errore: elementi del form non trovati');
            window.isLoggingIn = false;
            return;
        }
        
        try {
            // Imposta stati iniziali
            submitButton.disabled = true;
            submitButton.textContent = 'Accesso in corso...';
            hideError();

            // Prepara le credenziali
            const rawUsername = usernameInput.value;
            const rawPassword = passwordInput.value;
        

            const credentials = {
                nome_utente: rawUsername.trim(),
                password: rawPassword
            };

            // Validazione base
            if (!credentials.nome_utente || !credentials.password) {
                throw new Error('Username e password sono richiesti');
            }

            if (credentials.nome_utente.length < 3) {
                throw new Error('Username deve contenere almeno 3 caratteri');
            }

            if (credentials.password.length < 4) {
                throw new Error('Password deve contenere almeno 4 caratteri');
            }


            // Invia la richiesta
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            let data;
            try {
                const responseText = await response.text();
                
                if (responseText) {
                    data = JSON.parse(responseText);
                    console.log('Parsed response data:', {
                        success: data.success,
                        hasToken: !!data.token,
                        hasUser: !!data.user,
                        error: data.error,
                        code: data.code
                    });
                } else {
                    throw new Error('Empty response from server');
                }
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                throw new Error('Errore di comunicazione con il server - risposta non valida');
            }

            // Gestione errori specifici
            if (response.status === 400) {
                console.log('Bad Request (400)');
                throw new Error(data.error || 'Dati di login non validi');
            }

            if (response.status === 401) {
                console.log('Unauthorized (401)');
                throw new Error('Username o password non corretti');
            }
            
            if (response.status === 403) {
                console.log('Forbidden (403)');
                if (data.code === 'ACCOUNT_SUSPENDED') {
                    handleAccountSuspension(data);
                    return;
                } else {
                    throw new Error(data.error || 'Accesso negato');
                }
            }

            if (response.status === 404) {
                console.log('Not Found (404)');
                throw new Error('Servizio di login non trovato. Verifica la configurazione del server.');
            }

            if (response.status === 500) {
                console.log('Server Error (500)');
                throw new Error('Errore interno del server. Riprova più tardi.');
            }

            if (!response.ok) {
                console.log(`HTTP error (${response.status})`);
                throw new Error(data.error || `Errore del server (${response.status})`);
            }

            if (!data.success) {
                console.log('Login failed (success=false)');
                throw new Error(data.error || 'Login fallito');
            }

            if (!data.token || !data.user) {
                console.log('Incomplete login data');
                console.log('Missing:', {
                    token: !data.token,
                    user: !data.user
                });
                throw new Error('Dati di login incompleti ricevuti dal server');
            }

            // Login riuscito
            console.log('User data:', {
                id: data.user.id,
                username: data.user.username,
                nome: data.user.nome,
                cognome: data.user.cognome,
                ruolo_id: data.user.ruolo_id
            });
            
            // Salva la sessione
            try {
                if (typeof AuthService !== 'undefined') {
                    AuthService.setSession(data.token, data.user);
                } else {
                    sessionStorage.setItem('authToken', data.token);
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                }
            } catch (storageError) {
                console.error('Error saving session:', storageError);
                // Continue anyway, the login was successful
            }
                        
            // Redirect
            window.location.href = '/index.html';

        } catch (error) {
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // Mostra errore all'utente
            const errorMessage = error.message || 'Errore durante il login';
            showError(errorMessage);
            
            // Pulisci la password e rimetti il focus
            if (passwordInput) {
                passwordInput.value = '';
                setTimeout(() => {
                    passwordInput.focus();
                }, 100);
            }
            
        } finally {
            // Ripristina lo stato del bottone
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
            
            // Rimuovi il flag di login
            window.isLoggingIn = false;
        }
    }

    function showError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.classList.remove('d-none');
            
            // Scroll verso l'errore se necessario
            loginError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
        } else {
            alert('Errore: ' + message);
        }
    }

    function hideError() {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.add('d-none');
        }
    }

        function handleAccountSuspension(data) {
    
        try {
            // Controlla se Bootstrap è disponibile
            if (typeof bootstrap === 'undefined') {
                throw new Error('Bootstrap non disponibile');
            }
    
            const modalEl = document.getElementById('suspensionModal');
            if (!modalEl) {
                throw new Error('Modal di sospensione non trovato');
            }
    
            let giorniRimanenti = 0;
            let dataFineFormatted = '';
    
            // Calcola giorni rimanenti se disponibile la data
            if (data.suspension?.data_fine_prevista) {
                const dataFine = new Date(data.suspension.data_fine_prevista);
                const oggi = new Date();
                giorniRimanenti = Math.ceil((dataFine - oggi) / (1000 * 60 * 60 * 24));
                
                // Formatta la data in italiano
                dataFineFormatted = dataFine.toLocaleString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }
    
            const modalBody = modalEl.querySelector('.modal-body');
            if (!modalBody) {
                throw new Error('Corpo del modal non trovato');
            }
    
            // Genera contenuto del modal
            modalBody.innerHTML = `
                <div class="text-center">
                    <i class="bi bi-exclamation-triangle text-danger fs-1 mb-3"></i>
                    <h4 class="text-danger mb-3">Account Sospeso</h4>
                    <p class="mb-2">Il tuo account è stato sospeso ${
                        giorniRimanenti > 0 
                            ? `per ${giorniRimanenti} ${giorniRimanenti === 1 ? 'giorno' : 'giorni'}`
                            : 'a tempo indeterminato'
                    }.</p>
                    ${dataFineFormatted ? `
                        <p class="text-muted">Data prevista di riattivazione:<br>
                        <strong>${dataFineFormatted}</strong></p>
                    ` : ''}
                    <p class="text-muted mt-3">
                        Per maggiori informazioni, contatta l'amministratore.
                    </p>
                </div>
            `;
    
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
    
        } catch (modalError) {
            console.error('Error handling suspension modal:', modalError);
            // Fallback con alert se il modal fallisce
            const message = giorniRimanenti > 0
                ? `Account sospeso per ${giorniRimanenti} ${giorniRimanenti === 1 ? 'giorno' : 'giorni'}`
                : 'Account sospeso a tempo indeterminato';
            alert(`${message}. Contatta l'amministratore per maggiori informazioni.`);
        }
    }
});

// Funzione per il recupero password
async function requestPasswordRecovery() {
    
    const emailInput = document.getElementById('emailInput');
    const recoverError = document.getElementById('recoverError');
    const recoverSuccess = document.getElementById('recoverSuccess');
    const recoverButton = document.querySelector('#recoverPasswordModal .btn-primary');
    
    if (!emailInput) {
        console.error('Email input field not found');
        return;
    }
    
    // Reset messaggi
    recoverError?.classList.add('d-none');
    recoverSuccess?.classList.add('d-none');

    const originalButtonText = recoverButton?.textContent || 'Invia';

    try {
        const email = emailInput.value.trim();
        
        if (!email) {
            throw new Error('Inserisci un indirizzo email valido');
        }

        // Validazione email base
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Formato email non valido');
        }

        // Disabilita il bottone
        if (recoverButton) {
            recoverButton.disabled = true;
            recoverButton.textContent = 'Invio in corso...';
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

        // Mostra messaggio di successo
        const successMsg = 'Email di recupero inviata! Controlla la tua casella di posta (incluso spam).';
        if (recoverSuccess) {
            recoverSuccess.textContent = successMsg;
            recoverSuccess.classList.remove('d-none');
        } else {
            alert(successMsg);
        }
        
        // Pulisci il campo email
        emailInput.value = '';
        
        // Chiudi automaticamente il modal dopo 3 secondi
        setTimeout(() => {
            if (typeof bootstrap !== 'undefined') {
                const modalEl = document.getElementById('recoverPasswordModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal?.hide();
            }
        }, 3000);

    } catch (error) {
        console.error('Password recovery error:', error);
        
        const errorMsg = error.message;
        if (recoverError) {
            recoverError.textContent = errorMsg;
            recoverError.classList.remove('d-none');
        } else {
            alert('Errore: ' + errorMsg);
        }
    } finally {
        if (recoverButton) {
            recoverButton.disabled = false;
            recoverButton.textContent = originalButtonText;
        }
    }
}