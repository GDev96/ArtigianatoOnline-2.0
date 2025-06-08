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
        showErrorMessage(error);
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



/*********** Carrello **************/
async function loadCartContent() {
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch('/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero del carrello');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Errore nel recupero del carrello');
        }

        updateCartTable(data.items);
        updateTotalAmount(data.items);

    } catch (error) {
        console.error('Error loading cart:', error);
        showErrorMessage(error.message);
    }
}

function updateCartTable(items) {
    const cartTableBody = document.querySelector('#cartTable tbody');
    const cartTableHead = document.querySelector('#cartTable thead'); // Add this line
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartContent = document.getElementById('cartContent');
    const confirmOrderBtn = document.querySelector('[data-bs-target="#confirmOrder"]');

    if (cartContent) cartContent.style.display = 'block';
    if (emptyCartMessage) emptyCartMessage.style.display = 'none';
    if (confirmOrderBtn) confirmOrderBtn.disabled = false;
    if (cartTableHead) cartTableHead.style.display = 'table-header-group'; // Show table header

    if (!items || items.length === 0) {
        if (cartContent) cartContent.style.display = 'none';
        if (emptyCartMessage) emptyCartMessage.style.display = 'block';
        if (confirmOrderBtn) confirmOrderBtn.disabled = true;
        if (cartTableHead) cartTableHead.style.display = 'none'; // Hide table header
        return;
    }

    cartTableBody.innerHTML = items.map(item => `
        <tr>
            <td class="align-middle">
                <img src="${item.immagine ? `data:image/jpeg;base64,${item.immagine}` : '/assets/images/default/product.jpg'}"
                    alt="${item.nome_prodotto}"
                    class="cart-product-image"
                    style="width: 50px; height: 50px; object-fit: cover;">
            </td>
            <td class="align-middle">${item.nome_prodotto}</td>
            <td class="align-middle">€${parseFloat(item.prezzo_unitario).toFixed(2)}</td>
            <td class="align-middle">
                <div class="quantity-counter">
                    <button class="btn-quantity" onclick="updateQuantity(${item.prodotto_id}, ${item.quantita - 1})" 
                            ${item.quantita <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity-display">${item.quantita}</span>
                    <button class="btn-quantity" onclick="updateQuantity(${item.prodotto_id}, ${item.quantita + 1})"
                            ${item.quantita >= item.disponibilita ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>
            <td class="align-middle">€${(parseFloat(item.prezzo_unitario) * item.quantita).toFixed(2)}</td>
            <td class="align-middle">
                <button class="btn btn-danger btn-sm" onclick="removeFromCart(${item.prodotto_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    updateOrderModal(items);
}

async function updateQuantity(productId, newQuantity) {
    try {
        if (newQuantity <= 0) {
            await removeFromCart(productId);
            return;
        }

        const token = sessionStorage.getItem('token');
        const response = await fetch('/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                prodotto_id: productId,
                quantita: newQuantity
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore nell\'aggiornamento della quantità');
        }

        await loadCartContent();

    } catch (error) {
        console.error('Error updating quantity:', error);
        showErrorMessage(error.message);
    }
}

async function removeFromCart(productId) {
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore nella rimozione del prodotto');
        }

        await loadCartContent();

    } catch (error) {
        console.error('Error removing item:', error);
        showErrorMessage(error.message);
    }
}

function updateTotalAmount(items) {
    const totalElement = document.getElementById('totalAmount');
    if (!totalElement || !items) return;

    const total = items.reduce((sum, item) => 
        sum + (parseFloat(item.prezzo_unitario) * item.quantita), 0);
    
    totalElement.textContent = `€${total.toFixed(2)}`;
}



/*******Modale di conferma ordine **************/
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

//Gestione del metodo di pagamento
document.addEventListener('DOMContentLoaded', () => {
  const paymentDetails = document.getElementById('paymentDetails');

  // Funzione per aggiornare i dettagli del metodo di pagamento
  const updatePaymentDetails = (method) => {
    paymentDetails.innerHTML = ''; // Svuota il contenitore

    if (method === 'creditCard') {
      paymentDetails.innerHTML = `
        <div class="mb-3">
          <label for="cardNumber" class="form-label">Numero Carta</label>
          <input type="text" class="form-control" id="cardNumber" placeholder="Inserisci il numero della carta" required>
        </div>
        <div class="d-flex justify-content-between">
          <div class="mb-3">
            <label for="cardExpiry" class="form-label">Data di Scadenza</label>
            <input type="text" class="form-control" id="cardExpiry" placeholder="MM/AA" required>
          </div>
          <div class="mb-3 ms-2">
            <label for="cardCVV" class="form-label">CVV</label>
            <input type="text" class="form-control" id="cardCVV" placeholder="Inserisci il CVV" required>
          </div>
        </div>
      `;
    } else if (method === 'paypal') {
      paymentDetails.innerHTML = `
        <div class="mb-3 text-center">
            <svg width="48px" height="48px" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                    <circle cx="24" cy="24" r="20" fill="#7095b9"></circle>
                    <path d="M32.3305 18.0977C32.3082 18.24 32.2828 18.3856 32.2542 18.5351C31.2704 23.5861 27.9046 25.331 23.606 25.331H21.4173C20.8916 25.331 20.4486 25.7127 20.3667 26.2313L19.2461 33.3381L18.9288 35.3527C18.8755 35.693 19.1379 36 19.4815 36H23.3634C23.8231 36 24.2136 35.666 24.286 35.2127L24.3241 35.0154L25.055 30.3772L25.1019 30.1227C25.1735 29.6678 25.5648 29.3338 26.0245 29.3338H26.6051C30.3661 29.3338 33.3103 27.8068 34.1708 23.388C34.5303 21.5421 34.3442 20.0008 33.393 18.9168C33.1051 18.59 32.748 18.3188 32.3305 18.0977Z" fill="#ffffff" fill-opacity="0.9"></path>
                    <path d="M31.3009 17.6871C31.1506 17.6434 30.9955 17.6036 30.8364 17.5678C30.6766 17.5328 30.5127 17.5018 30.3441 17.4748C29.754 17.3793 29.1074 17.334 28.4147 17.334H22.5676C22.4237 17.334 22.2869 17.3666 22.1644 17.4254C21.8948 17.5551 21.6944 17.8104 21.6459 18.1229L20.402 26.0013L20.3662 26.2311C20.4481 25.7126 20.8911 25.3308 21.4168 25.3308H23.6055C27.9041 25.3308 31.2699 23.5851 32.2537 18.5349C32.2831 18.3854 32.3078 18.2398 32.33 18.0975C32.0811 17.9655 31.8115 17.8525 31.5212 17.7563C31.4496 17.7324 31.3757 17.7094 31.3009 17.6871Z" fill="#ffffff" fill-opacity="0.95"></path>
                    <path d="M21.6461 18.1231C21.6946 17.8105 21.895 17.5552 22.1646 17.4264C22.2879 17.3675 22.4239 17.3349 22.5678 17.3349H28.4149C29.1077 17.3349 29.7542 17.3803 30.3444 17.4757C30.513 17.5027 30.6768 17.5338 30.8367 17.5687C30.9957 17.6045 31.1508 17.6443 31.3011 17.688C31.3759 17.7103 31.4498 17.7334 31.5222 17.7564C31.8125 17.8527 32.0821 17.9664 32.331 18.0976C32.6237 16.231 32.3287 14.9601 31.3194 13.8093C30.2068 12.5424 28.1986 12 25.629 12H18.169C17.6441 12 17.1963 12.3817 17.1152 12.9011L14.0079 32.5969C13.9467 32.9866 14.2473 33.3381 14.6402 33.3381H19.2458L20.4022 26.0014L21.6461 18.1231Z" fill="#ffffff"></path>
                </g>
            </svg>        
        </div>  
        <div class="mb-3">
          <label for="paypalEmail" class="form-label">Email PayPal</label>
          <input type="email" class="form-control" id="paypalEmail" placeholder="Inserisci la tua email PayPal" required>
        </div>
        <div class="mb-3">
          <label for="paypalPassword" class="form-label">Password</label>
          <input type="password" class="form-control" id="paypalPassword" placeholder="Inserisci la tua password" required>
        </div>
      `;
    } else if (method === 'bankTransfer') {
      paymentDetails.innerHTML = `
        <div class="mb-3">
          <p>Effettua il bonifico al seguente IBAN:</p>
          <p><strong>IT60X0542811101000000123456</strong></p>
          <p>Intestato a: Artigianato Online</p>
        </div>
        <div class="mb-3">
          <label for="transferReference" class="form-label">Riferimento Bonifico</label>
          <input type="text" class="form-control" id="transferReference" placeholder="Inserisci il riferimento del bonifico" required>
        </div>
      `;
    }
  };

  // Event listener per i cambiamenti nel metodo di pagamento
  document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      updatePaymentDetails(e.target.value);
    });
  });

  // Imposta il metodo di pagamento iniziale
  updatePaymentDetails('creditCard');
}); 

// Add payment validation function
function validatePaymentFields() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    let isValid = true;
    
    // Reset all fields first
    document.querySelectorAll('#paymentDetails .form-control').forEach(input => {
        input.classList.remove('is-invalid');
    });
    
    switch (selectedMethod) {
        case 'creditCard':
            const cardNumber = document.getElementById('cardNumber');
            const cardExpiry = document.getElementById('cardExpiry');
            const cardCVV = document.getElementById('cardCVV');
            
            if (!cardNumber.value.trim()) {
                cardNumber.classList.add('is-invalid');
                isValid = false;
            }
            if (!cardExpiry.value.trim()) {
                cardExpiry.classList.add('is-invalid');
                isValid = false;
            }
            if (!cardCVV.value.trim()) {
                cardCVV.classList.add('is-invalid');
                isValid = false;
            }
            
            if (!isValid) {
                showErrorMessage('Inserisci tutti i dati della carta');
            }
            break;
            
        case 'paypal':
            const paypalEmail = document.getElementById('paypalEmail');
            const paypalPassword = document.getElementById('paypalPassword');
            
            if (!paypalEmail.value.trim()) {
                paypalEmail.classList.add('is-invalid');
                isValid = false;
            }
            if (!paypalPassword.value.trim()) {
                paypalPassword.classList.add('is-invalid');
                isValid = false;
            }
            
            if (!isValid) {
                showErrorMessage('Inserisci le credenziali PayPal');
            }
            break;
            
        case 'bankTransfer':
            const transferReference = document.getElementById('transferReference');
            
            if (!transferReference.value.trim()) {
                transferReference.classList.add('is-invalid');
                isValid = false;
                showErrorMessage('Inserisci il riferimento del bonifico');
            }
            break;
            
        default:
            showErrorMessage('Seleziona un metodo di pagamento valido');
            return false;
    }
    
    return isValid;
}

// Add event listeners to remove invalid class when user types
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('paymentDetails').addEventListener('input', (e) => {
        if (e.target.classList.contains('form-control')) {
            e.target.classList.remove('is-invalid');
        }
    });
});

// Update order confirmation listener
document.querySelector('#confirmOrder .btn-success').addEventListener('click', async function() {
    try {
        // First validate payment fields
        if (!validatePaymentFields()) {
            return;
        }

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

        // Show success message using global function
        showSuccessMessage('Ordine creato con successo!');

        // Reload cart page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error creating order:', error);
        showErrorMessage(error.message || 'Errore nella creazione dell\'ordine');
    }
});
