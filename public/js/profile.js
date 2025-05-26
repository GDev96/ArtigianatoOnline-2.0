document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user || user.ruolo_id !== 1) {
        window.location.href = '/login.html';
        return;
    }
    
    await loadUserData();
    await loadOrders();
    await loadUserReports();
});

/***********Header dati utente ******************/
//Carica i dati dell'utente al caricamento della pagina - funziona
async function loadUserData() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (!user) {
        console.error('No user data found in session');
        window.location.href = '/login.html';
        return;
    }

    console.log('Loading user data:', user);

    try {
        // Update header information
        const profileNameEl = document.getElementById('profileName');
        const usernameEl = document.getElementById('username');

        if (!profileNameEl || !usernameEl) {
            console.error('Header elements not found:', {
                profileName: !!profileNameEl,
                username: !!usernameEl
            });
            throw new Error('Header elements not found');
        }

        profileNameEl.textContent = `${user.nome} ${user.cognome}`;
        usernameEl.textContent = user.username;
        
        // Create formatted address string
        const fullAddress = user.indirizzo && user.citta ? 
            `${user.indirizzo} - ${user.citta}` : 
            'Non specificato';
        
        // Update info cards with error handling
        const cards = {
            'card-address': { value: fullAddress },
            'card-phone': { value: user.numero_telefono || 'Non specificato' },
            'card-mail': { value: user.email || 'Non specificato' }
        };

        Object.entries(cards).forEach(([cardClass, data]) => {
            const card = document.querySelector(`.${cardClass} p`);
            if (card) {
                card.textContent = data.value;
            } else {
                console.error(`Card element .${cardClass} not found`);
            }
        });

        // Update form fields for editing
        const formFields = {
            'editNameInput': user.nome,
            'editSurnameInput': user.cognome,
            'editEmailInput': user.email,
            'editPhoneInput': user.numero_telefono || '',
            'editAddressInput': user.indirizzo || '',
            'editCityInput': user.citta || ''
        };

        Object.entries(formFields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
            } else {
                console.error(`Form field #${fieldId} not found`);
            }
        });

    } catch (error) {
        console.error('Error loading user data:', error);
        console.log('Errore nel caricamento dei dati utente');
    }
}
// Funzione per aggiornare il profilo utente - funziona
async function updateProfile(event) {
    event.preventDefault(); // Previene il submit del form

    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    if (!currentUser) {
        console.log('Sessione utente non valida');
        return;
    }
    
    const formData = {
        nome: document.getElementById('editNameInput').value.trim(),
        cognome: document.getElementById('editSurnameInput').value.trim(),
        email: document.getElementById('editEmailInput').value.trim(),
        telefono: document.getElementById('editPhoneInput').value.trim(),
        indirizzo: document.getElementById('editAddressInput').value.trim(),
        citta: document.getElementById('editCityInput').value.trim()
    };

    // Validazione base
    if (!formData.nome || !formData.cognome || !formData.email) {
        console.log('Nome, cognome ed email sono campi obbligatori');
        return;
    }

    try {
        const response = await fetch(`/users/update/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Errore nell\'aggiornamento del profilo');
        }

        const result = await response.json();
        
        if (result.success) {
            // Aggiorna i dati utente nella sessione
            sessionStorage.setItem('user', JSON.stringify(result.user));
            
            // Chiudi il modale
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            modal.hide();
            
            // Ricarica i dati del profilo
            await loadUserData();
            
            // Mostra messaggio di successo
            console.log('Profilo aggiornato con successo');
        } else {
            throw new Error(result.message || 'Errore nell\'aggiornamento del profilo');
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.log(error.message);
    }
}



//********Tabella visualizzazione ordini********** */
async function loadOrders() {
    try {
        const response = await fetch('/orders/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento degli ordini');
        
        const orders = await response.json();
        const tbody = document.getElementById('ordersTableBody');
        
        if (!tbody) {
            console.error('Table body element not found');
            return;
        }

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        Nessun ordine effettuato
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.ordine_id}</td>
                <td>${new Date(order.data_ordine).toLocaleDateString()}</td>
                <td>${order.nome_artigiano} ${order.cognome_artigiano}</td>
                <td>€${order.totale.toFixed(2)}</td>
                <td>
                    <span class="badge bg-${getStatusColor(order.stato)}">
                        ${getStatusText(order.stato)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="viewOrderDetails(${order.ordine_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="reportOrder(${order.ordine_id})">
                        <i class="fas fa-flag"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('ordersTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Errore nel caricamento degli ordini
                </td>
            </tr>
        `;
    }
}
//Mostra i dettagli dell'ordine
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Errore nel caricamento dei dettagli dell\'ordine');
        }

        const order = await response.json();
        
        // Update modal content with proper number parsing
        const modalElements = {
            'orderDetailId': order.ordine_id,
            'orderDetailDate': new Date(order.data_ordine).toLocaleDateString(),
            'orderDetailStatus': `<span class="badge bg-${getStatusColor(order.stato)}">${getStatusText(order.stato)}</span>`,
            'orderDetailTotal': parseFloat(order.totale).toFixed(2)
        };

        // Update modal elements with error handling
        Object.entries(modalElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = value;
            } else {
                console.error(`Modal element #${id} not found`);
            }
        });

        // Update products table
        const productsTableBody = document.getElementById('orderDetailProducts');
        if (productsTableBody && order.prodotti) {
            productsTableBody.innerHTML = order.prodotti.map(product => {
                const prezzo = parseFloat(product.prezzo);
                const quantita = parseInt(product.quantita);
                const subtotale = prezzo * quantita;
                
                return `
                    <tr>
                        <td>${product.nome}</td>
                        <td>${quantita}</td>
                        <td>€${prezzo.toFixed(2)}</td>
                        <td>€${subtotale.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading order details:', error);
        showErrorMessage('Errore nel caricamento dei dettagli dell\'ordine');
    }
}
// Apre modale per segnalare un ordine
function reportOrder(orderId) {
    document.getElementById('reportOrderId').value = orderId;
    const modal = new bootstrap.Modal(document.getElementById('reportOrderModal'));
    modal.show();
}
// Funzione per inviare la segnalazione di un ordine
async function submitOrderReport() {
    try {
        const reportData = {
            order_id: document.getElementById('reportOrderId').value,
            reason: document.getElementById('reportReason').value,
            description: document.getElementById('reportDescription').value
        };

        // Validation
        if (!reportData.order_id || !reportData.reason || !reportData.description) {
            showErrorMessage('Tutti i campi sono obbligatori');
            return;
        }

        const response = await fetch('/reports/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(reportData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Errore nell\'invio della segnalazione');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportOrderModal'));
        modal.hide();
        document.getElementById('reportOrderForm').reset();

        // Show success message
        showSuccessMessage('Segnalazione inviata con successo');

        // Reload reports table
        await loadUserReports();

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message);
    }
}




function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'processing': 'info',
        'shipped': 'primary',
        'delivered': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'pending': 'In attesa',
        'processing': 'In lavorazione',
        'shipped': 'Spedito',
        'delivered': 'Consegnato',
        'cancelled': 'Annullato'
    };
    return texts[status] || status;
}



/**********Tabella segnalazioni************* */
//Carica le segnalazioni dell'utente
async function loadUserReports() {
    try {
        const response = await fetch('/reports/user', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento delle segnalazioni');
        
        const reports = await response.json();
        const tbody = document.getElementById('reportsTableBody');
        
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>
                    <a href="#" onclick="viewOrderDetails(${report.ordine_id}); return false;"
                       class="text-primary text-decoration-underline">
                        #${report.ordine_id}
                    </a>
                </td>
                <td>${new Date(report.data_segnalazione).toLocaleDateString()}</td>
                <td>${getReportReason(report.motivo)}</td>
                <td>
                    <span class="badge bg-${getReportStatusColor(report.stato)}">
                        ${getReportStatus(report.stato)}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('reportsTableBody').innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    Errore nel caricamento delle segnalazioni
                </td>
            </tr>
        `;
    }
}



//Funzioni per le segnalazioni
function getReportType(type) {
    const types = {
        'order': 'Ordine',
        'artisan': 'Artigiano',
        'review': 'Recensione'
    };
    return types[type] || type;
}

function getReportReason(reason) {
    const reasons = {
        'delivery': 'Problemi di consegna',
        'product': 'Prodotto danneggiato/difettoso',
        'fake': 'Contenuto falso',
        'inappropriate': 'Contenuto inappropriato',
        'other': 'Altro'
    };
    return reasons[reason] || reason;
}

function getReportStatus(status) {
    const statuses = {
        'open': 'Aperta',
        'processing': 'In elaborazione',
        'closed': 'Chiusa',
        'resolved': 'Risolta'
    };
    return statuses[status] || status;
}

function getReportStatusColor(status) {
    const colors = {
        'open': 'warning',
        'processing': 'info',
        'closed': 'secondary',
        'resolved': 'success'
    };
    return colors[status] || 'secondary';
}
