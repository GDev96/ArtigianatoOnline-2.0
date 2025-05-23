document.addEventListener('DOMContentLoaded', function() {
    const rawUser = sessionStorage.getItem('user');
    if (!rawUser) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const user = JSON.parse(rawUser);
        // Continue with cart initialization...
    } catch (error) {
        console.error('Error loading cart:', error);
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
});

//Compila i dati dell'utente nel profilo
document.addEventListener('DOMContentLoaded', function() {
    // Recupera i dati utente dal localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
        document.getElementById('profileName').textContent = `${user.nome} ${user.cognome}`;
        document.getElementById('username').textContent = user.nome_utente;

        const addressElement = document.querySelector('.card-address p');
        const phoneElement = document.querySelector('.card-phone p');
        const emailElement = document.querySelector('.card-mail p');
        
        const fullAddress = user.indirizzo && user.citta ? `${user.indirizzo} - ${user.citta}` : 'Non salvato';
        
        addressElement.textContent = fullAddress || 'Non salvato';
        phoneElement.textContent = user.telefono || 'Non salvato';
        emailElement.textContent = user.email;

        document.getElementById('editNameInput').value = user.nome;
        document.getElementById('editSurnameInput').value = user.cognome;
        document.getElementById('editEmailInput').value = user.email;
        document.getElementById('editPhoneInput').value = user.telefono || '';
        document.getElementById('editAddressInput').value = user.indirizzo || '';
        document.getElementById('editCityInput').value = user.citta || '';
    } else {
        // Reindirizza alla pagina di login se l'utente non è autenticato
        window.location.href = '/login.html';
    }
});



// Funzione per aggiornare la visualizzazione del carrello
function updateCartDisplay() {
    const cart = getCartFromLocal();
    const tableBody = document.querySelector('tbody');
    const totalElement = document.querySelector('.totalOrder h4');
    
    if (!tableBody) return;

    if (cart.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="card text-center p-5">
                        <div class="card-body">
                            <h3 class="card-title text-muted">
                                <i class="fas fa-shopping-cart mb-3 d-block" style="font-size: 3rem;"></i>
                                Carrello vuoto
                            </h3>
                            <p class="card-text text-muted">
                                Non hai ancora aggiunto prodotti al carrello.
                            </p>
                            <a href="/index.html" class="btn btn-brown">
                                <i class="fas fa-shopping-bag me-2"></i>Inizia lo shopping
                            </a>
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    let total = 0;
    tableBody.innerHTML = cart.map(item => {
        const itemTotal = item.prezzo * item.quantity;
        total += itemTotal;
        return `
            <tr data-product-id="${item.prodotto_id}">
                <td>${item.nome_prodotto}</td>
                <td>€${item.prezzo.toFixed(2)}</td>
                <td>
                    <input type="number" class="form-control w-50" 
                           value="${item.quantity}" min="1" 
                           onchange="updateQuantity(${item.prodotto_id}, this.value)">
                </td>
                <td>€${itemTotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" 
                            onclick="removeFromCart(${item.prodotto_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    totalElement.textContent = `Totale provvisorio: €${total.toFixed(2)}`;
}

// Funzione per il modale di conferma ordine
document.addEventListener('DOMContentLoaded', () => {
    const confirmAndPayButton = document.querySelector('.btn-success');
    const paymentSuccessModal = new bootstrap.Modal(document.getElementById('paymentSuccessModal'));
    const confirmOrderModal = document.getElementById('confirmOrder');

    // Add event listener for modal show
    confirmOrderModal.addEventListener('show.bs.modal', () => {
        // Populate shipping details
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            document.getElementById('modalShippingName').textContent = user.nome || 'Non specificato';
            document.getElementById('modalShippingSurname').textContent = user.cognome || 'Non specificato';
            document.getElementById('modalShippingAddress').textContent = user.indirizzo || 'Non specificato';
            document.getElementById('modalShippingCity').textContent = user.citta || 'Non specificata';
        }

        // Populate order summary
        const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
        const tbody = confirmOrderModal.querySelector('tbody');
        let total = 0;

        tbody.innerHTML = cart.map(item => {
            const itemTotal = item.prezzo * item.quantity;
            total += itemTotal;
            return `
                <tr>
                    <td>${item.nome_prodotto}</td>
                    <td>${item.quantity}</td>
                    <td>€${item.prezzo.toFixed(2)}</td>
                    <td>€${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Update total
        confirmOrderModal.querySelector('tfoot th:last-child').textContent = `€${total.toFixed(2)}`;
    });

    confirmAndPayButton.addEventListener('click', async () => {
        const success = await saveOrderToDatabase();
        
        if (success) {
            const confirmOrderModalInstance = bootstrap.Modal.getInstance(confirmOrderModal);
            if (confirmOrderModalInstance) {
                confirmOrderModalInstance.hide();
            }
            paymentSuccessModal.show();
        } else {
            alert('Si è verificato un errore durante il salvataggio dell\'ordine.');
        }
    });
});

//Salva l'ordine nel database
async function saveOrderToDatabase() {
    const cart = getCartFromLocal();
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    const orderData = {
        cliente_id: user.id,
        prodotti: cart.map(item => ({
            prodotto_id: item.prodotto_id,
            quantita: item.quantity,
            prezzo_unitario: item.prezzo
        })),
        indirizzo_spedizione: {
            nome: document.getElementById('shippingName').value,
            cognome: document.getElementById('shippingSurname').value,
            indirizzo: document.getElementById('shippingAddress').value,
            citta: document.getElementById('shippingCity').value,
            cap: document.getElementById('shippingPostalCode').value
        },
        metodo_pagamento: document.querySelector('input[name="paymentMethod"]:checked').value
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            // Svuota il carrello locale solo dopo conferma dell'ordine
            localStorage.removeItem('shoppingCart');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Errore nel salvataggio dell\'ordine:', error);
        return false;
    }
}