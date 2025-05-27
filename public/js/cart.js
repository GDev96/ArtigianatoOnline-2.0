document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get session user first
        const sessionUser = JSON.parse(sessionStorage.getItem('user'));
        if (!sessionUser || sessionUser.ruolo_id !== 1) {
            window.location.href = '/login.html';
            return;
        }

        // Get user ID from URL parameters or session
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id') || sessionUser.id;

        // Check if URL ID matches session user
        if (parseInt(userId) !== sessionUser.id) {
            throw new Error('Accesso non autorizzato');
        }

        // Fetch complete user data from backend
        const response = await fetch(`/users/api/${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Errore nel recupero dei dati utente');
        }

        // Update header with user data
        updateUserHeader(data.user);
        
    } catch (error) {
        console.error('Error initializing cart:', error);
        showError(error);
    }
});

function updateUserHeader(user) {
    // Update name and username
    document.getElementById('profileName').textContent = `${user.nome} ${user.cognome}`;
    document.getElementById('username').textContent = user.username;

    // Update address card
    const addressElement = document.querySelector('.card-address p');
    if (addressElement) {
        addressElement.textContent = user.indirizzo && user.citta 
            ? `${user.indirizzo} - ${user.citta}` 
            : 'Non salvato';
    }

    // Update phone card
    const phoneElement = document.querySelector('.card-phone p');
    if (phoneElement) {
        phoneElement.textContent = user.numero_telefono || 'Non salvato';
    }

    // Update email card
    const emailElement = document.querySelector('.card-mail p');
    if (emailElement) {
        emailElement.textContent = user.email || 'Non salvato';
    }

    // Update modal shipping info
    document.getElementById('modalShippingName').textContent = user.nome;
    document.getElementById('modalShippingSurname').textContent = user.cognome;
    document.getElementById('modalShippingAddress').textContent = user.indirizzo || 'Non salvato';
    document.getElementById('modalShippingCity').textContent = user.citta || 'Non salvato';
}

function showError(error) {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Errore!</h4>
                <p>${error.message}</p>
                <hr>
                <p class="mb-0">Torna alla <a href="/" class="alert-link">home page</a>.</p>
            </div>`;
    }
}