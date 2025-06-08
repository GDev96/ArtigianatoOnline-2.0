// filepath: c:\Users\fratt\Documents\GitHub\artigianato-online-2\public\js\resetpass.js
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    const tokenError = document.getElementById('tokenError');
    const resetForm = document.getElementById('resetPasswordForm');
    
    if (!token) {
        tokenError.classList.remove('d-none');
        resetForm.style.display = 'none';
        return;
    }

    // Setup password toggles
    ['toggleNewPassword', 'toggleConfirmPassword'].forEach((toggleId, index) => {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(['newPassword', 'confirmPassword'][index]);
        
        toggle?.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            toggle.classList.toggle('bi-eye');
            toggle.classList.toggle('bi-eye-slash');
        });
    });

    // Handle form submission
    resetForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const resetError = document.getElementById('resetError');
        const submitButton = this.querySelector('button[type="submit"]');
        
        resetError.classList.add('d-none');
    
        try {
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
    
            // Validation
            if (newPassword !== confirmPassword) {
                throw new Error('Le password non coincidono');
            }
    
            if (newPassword.length < 8) {
                throw new Error('La password deve contenere almeno 8 caratteri');
            }
    
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Elaborazione...';
    
            const response = await fetch('/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.error || 'Errore durante il reset della password');
            }
    
            resetForm.style.display = 'none';
            
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
    
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000);
    
        } catch (error) {
            console.error('Password reset error:', error);
            resetError.textContent = error.message;
            resetError.classList.remove('d-none');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Reimposta Password';
        }
    });
});