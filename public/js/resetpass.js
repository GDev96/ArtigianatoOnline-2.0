document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
        document.getElementById('tokenError').classList.remove('d-none');
        document.getElementById('resetPasswordForm').style.display = 'none';
        return;
    }

    // Toggle password visibility
    const toggles = ['toggleNewPassword', 'toggleConfirmPassword'];
    const inputs = ['newPassword', 'confirmPassword'];

    toggles.forEach((toggle, index) => {
        document.getElementById(toggle)?.addEventListener('click', function() {
            const input = document.getElementById(inputs[index]);
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
    });

    // Handle form submission
    const resetForm = document.getElementById('resetPasswordForm');
    resetForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const resetError = document.getElementById('resetError');
        const resetSuccess = document.getElementById('resetSuccess');
        resetError.classList.add('d-none');
        resetSuccess.classList.add('d-none');

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        try {
            // Validate passwords
            if (newPassword !== confirmPassword) {
                throw new Error('Le password non coincidono');
            }

            if (newPassword.length < 8) {
                throw new Error('La password deve contenere almeno 8 caratteri');
            }

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

            // Show success message and redirect
            resetSuccess.classList.remove('d-none');
            resetForm.style.display = 'none';
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000);

        } catch (error) {
            console.error('Password reset error:', error);
            resetError.textContent = error.message;
            resetError.classList.remove('d-none');
        }
    });
});