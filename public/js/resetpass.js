document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Reset password page loaded');
    
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    const tokenError = document.getElementById('tokenError');
    const resetForm = document.getElementById('resetPasswordForm');
    const resetSuccess = document.getElementById('resetSuccess');
    
    console.log('Token from URL:', token ? 'Present' : 'Missing');
    
    if (!token) {
        console.log('❌ No token found in URL');
        if (tokenError) {
            tokenError.classList.remove('d-none');
        }
        if (resetForm) {
            resetForm.style.display = 'none';
        }
        return;
    }

    console.log('✅ Token found, setting up form');

    // Setup password toggles
    ['toggleNewPassword', 'toggleConfirmPassword'].forEach((toggleId, index) => {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(['newPassword', 'confirmPassword'][index]);
        
        if (toggle && input) {
            toggle.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                toggle.classList.toggle('bi-eye');
                toggle.classList.toggle('bi-eye-slash');
            });
        }
    });

    // Funzione per mostrare messaggi di successo
    function showSuccess(message) {
        console.log('✅ Showing success message:', message);
        if (resetSuccess) {
            resetSuccess.textContent = message;
            resetSuccess.classList.remove('d-none');
        } else {
            // Fallback: crea un elemento di successo se non esiste
            const successDiv = document.createElement('div');
            successDiv.className = 'alert alert-success';
            successDiv.textContent = message;
            resetForm.parentNode.insertBefore(successDiv, resetForm);
        }
        
        // Nascondi eventuali errori
        const resetError = document.getElementById('resetError');
        if (resetError) {
            resetError.classList.add('d-none');
        }
    }

    // Funzione per mostrare errori
    function showError(message) {
        console.log('❌ Showing error message:', message);
        const resetError = document.getElementById('resetError');
        if (resetError) {
            resetError.textContent = message;
            resetError.classList.remove('d-none');
            resetError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            alert('Errore: ' + message);
        }
    }

    // Handle form submission
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📝 Form submission started');
            
            const resetError = document.getElementById('resetError');
            const submitButton = this.querySelector('button[type="submit"]');
            
            if (resetError) {
                resetError.classList.add('d-none');
            }
        
            try {
                const newPasswordInput = document.getElementById('newPassword');
                const confirmPasswordInput = document.getElementById('confirmPassword');
                
                if (!newPasswordInput || !confirmPasswordInput) {
                    throw new Error('Campi password non trovati');
                }
                
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                console.log('Password validation...');
        
                // Validation
                if (!newPassword || !confirmPassword) {
                    throw new Error('Inserisci entrambe le password');
                }
                
                if (newPassword !== confirmPassword) {
                    throw new Error('Le password non coincidono');
                }
        
                if (newPassword.length < 8) {
                    throw new Error('La password deve contenere almeno 8 caratteri');
                }
                
                // Validazione password più robusta
                const hasUpperCase = /[A-Z]/.test(newPassword);
                const hasLowerCase = /[a-z]/.test(newPassword);
                const hasNumbers = /\d/.test(newPassword);
                const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
                
                if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
                    throw new Error('La password deve contenere almeno una lettera maiuscola, una minuscola e un numero');
                }
                
                console.log('✅ Password validation passed');
        
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Elaborazione...';
                }
                
                console.log('🔗 Sending reset request...');
        
                const response = await fetch('/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        token,
                        newPassword
                    })
                });
                
                console.log('📡 Response received:', response.status);
        
                const data = await response.json();
                console.log('Response data:', data);
        
                if (!response.ok) {
                    throw new Error(data.error || 'Errore durante il reset della password');
                }
                
                console.log('🎉 Password reset successful!');
        
                // Nascondi il form e mostra il messaggio di successo
                resetForm.style.display = 'none';
                showSuccess('Password reimpostata con successo! Verrai reindirizzato al login...');
                
                // Redirect al login dopo 3 secondi
                setTimeout(() => {
                    console.log('🔄 Redirecting to login...');
                    window.location.href = '/login.html';
                }, 3000);
        
            } catch (error) {
                console.error('❌ Password reset error:', error);
                showError(error.message);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Reimposta Password';
                }
            }
        });
    } else {
        console.warn('⚠️ Reset form not found');
    }
});