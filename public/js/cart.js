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

        // Load cart content
        await loadCartContent();
        
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
        
        // Load cart content
        await loadCartContent();

    } catch (error) {
        console.error('Error initializing cart:', error);
        showError(error);
    }
});

async function loadCartContent() {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const response = await fetch('/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Errore nel recupero del carrello');
        }

        updateCartTable(data.items);
        updateTotalAmount(data.items);

    } catch (error) {
        console.error('Error loading cart:', error);
        showError(error);
    }
}

function updateCartTable(items) {
    const tbody = document.querySelector('.table tbody');
    if (!tbody) return;

    // If cart is empty
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Il tuo carrello è vuoto
                </td>
            </tr>`;
        return;
    }

    // Update existing tbody with cart items
    tbody.innerHTML = items.map(item => {
        // Convert price to number
        const price = parseFloat(item.prezzo_unitario);
        const quantity = parseInt(item.quantita);
        const total = price * quantity;
        
        return `
            <tr>
                <td>
                    <div>${item.nome_prodotto}</div>
                </td>
                <td>€${price.toFixed(2)}</td>
                <td class="text-center">
                    <input type="number" 
                           class="form-control form-control-sm w-75"
                           value="${quantity}" 
                           min="1"
                           max="${item.disponibilita}"
                           onchange="updateQuantity(${item.prodotto_id}, this.value)">
                </td>
                <td>€${total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" 
                            onclick="removeFromCart(${item.prodotto_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateTotalAmount(items) {
    const total = items.reduce((sum, item) => 
        sum + (parseFloat(item.prezzo_unitario) * parseInt(item.quantita)), 0);
    
    document.querySelector('.totalOrder h4').textContent = 
        `Totale provvisorio: €${total.toFixed(2)}`;
}

async function updateQuantity(productId, newQuantity) {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const response = await fetch('/cart/update', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prodotto_id: productId,
                quantita: parseInt(newQuantity)
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await loadCartContent();
    } catch (error) {
        console.error('Error updating quantity:', error);
        showError(error);
    }
}

async function removeFromCart(productId) {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const response = await fetch(`/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await loadCartContent();
    } catch (error) {
        console.error('Error removing item:', error);
        showError(error);
    }
}