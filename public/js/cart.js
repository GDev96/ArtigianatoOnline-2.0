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
    // Update profile name and username in header
    const profileNameEl = document.getElementById('profileName');
    const headerUsernameEl = document.querySelector('#profile-header .username'); // More specific selector

    if (profileNameEl) {
        profileNameEl.textContent = `${user.nome} ${user.cognome}`;
    }
    
    if (headerUsernameEl) {
        headerUsernameEl.textContent = user.username;
    }
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
    const modalElements = {
        name: document.getElementById('modalShippingName'),
        surname: document.getElementById('modalShippingSurname'),
        address: document.getElementById('modalShippingAddress'),
        city: document.getElementById('modalShippingCity')
    };

    if (modalElements.name) modalElements.name.textContent = user.nome;
    if (modalElements.surname) modalElements.surname.textContent = user.cognome;
    if (modalElements.address) modalElements.address.textContent = user.indirizzo || 'Non salvato';
    if (modalElements.city) modalElements.city.textContent = user.citta || 'Non salvato';
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
    const modalOpenButton = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#confirmOrder"]');
    
    if (!tbody) return;

    // If cart is empty
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Il tuo carrello è vuoto
                </td>
            </tr>`;

        // Disable modal open button
        if (modalOpenButton) {
            modalOpenButton.disabled = true;
            modalOpenButton.classList.add('opacity-50');
            modalOpenButton.title = 'Aggiungi prodotti al carrello per procedere all\'ordine';
        }
        return;
    }

    // Enable modal open button if cart has items
    if (modalOpenButton) {
        modalOpenButton.disabled = false;
        modalOpenButton.classList.remove('opacity-50');
        modalOpenButton.title = 'Procedi all\'ordine';
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

    updateOrderModal(items);
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

//Modale di invio ordine
function updateOrderModal(items) {
    const modalTbody = document.querySelector('#confirmOrder .table tbody');
    const modalTfoot = document.querySelector('#confirmOrder .table tfoot');
    
    if (!modalTbody || !modalTfoot) return;

    if (!items || items.length === 0) {
        modalTbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Il carrello è vuoto
                </td>
            </tr>`;
        modalTfoot.innerHTML = `
            <tr>
                <th colspan="3" class="text-end">Totale:</th>
                <th>€0.00</th>
            </tr>`;
        return;
    }

    // Update items list
    modalTbody.innerHTML = items.map(item => {
        const price = parseFloat(item.prezzo_unitario);
        const quantity = parseInt(item.quantita);
        const total = price * quantity;
        
        return `
            <tr>
                <td>${item.nome_prodotto}</td>
                <td>${quantity}</td>
                <td>€${price.toFixed(2)}</td>
                <td>€${total.toFixed(2)}</td>
            </tr>`;
    }).join('');

    // Calculate and update total
    const orderTotal = items.reduce((sum, item) => 
        sum + (parseFloat(item.prezzo_unitario) * parseInt(item.quantita)), 0);

    modalTfoot.innerHTML = `
        <tr>
            <th colspan="3" class="text-end">Totale:</th>
            <th>€${orderTotal.toFixed(2)}</th>
        </tr>`;
}

// Add event listener for order confirmation
document.querySelector('#confirmOrder .btn-success').addEventListener('click', async function() {
    try {
        const response = await fetch('/orders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Errore nella creazione dell\'ordine');
        }

        const data = await response.json();

        // Close payment modal
        const orderModal = bootstrap.Modal.getInstance(document.getElementById('confirmOrder'));
        orderModal.hide();

        // Show success message
        showMessage('Ordine creato con successo!', 'success');

        // Reload cart page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error creating order:', error);
        showError(error);
    }
});

// Add helper function for showing messages
function showMessage(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}