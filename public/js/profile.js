document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user || user.ruolo_id !== 1) {
        window.location.href = '/login.html';
        return;
    }
    
    loadUserData();
    loadOrders();
    loadUserReports();
});

async function loadUserData() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    // Update header information
    document.getElementById('profileName').textContent = `${user.nome} ${user.cognome}`;
    document.getElementById('username').textContent = user.username;
    
    // Update info cards
    const fullAddress = user.indirizzo && user.citta ? 
        `${user.indirizzo} - ${user.citta}` : 
        'Non specificato';
    
    // Aggiorna le card nell'header
    const addressCard = document.querySelector('.card-address p');
    const phoneCard = document.querySelector('.card-phone p');
    const emailCard = document.querySelector('.card-mail p');
    
    if (addressCard) addressCard.textContent = fullAddress;
    if (phoneCard) phoneCard.textContent = user.numero_telefono || 'Non specificato';
    if (emailCard) emailCard.textContent = user.email;

    // Populate edit form fields
    document.getElementById('editNameInput').value = user.nome;
    document.getElementById('editSurnameInput').value = user.cognome;
    document.getElementById('editEmailInput').value = user.email;
    document.getElementById('editPhoneInput').value = user.numero_telefono || '';
    document.getElementById('editAddressInput').value = user.indirizzo || '';
    document.getElementById('editCityInput').value = user.citta || '';
}

async function updateProfile() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    const formData = {
        nome: document.getElementById('editName').value || currentUser.nome,
        cognome: document.getElementById('editSurname').value || currentUser.cognome,
        email: document.getElementById('editEmail').value || currentUser.email,
        telefono: document.getElementById('editPhone').value || currentUser.telefono,
        indirizzo: document.getElementById('editAddress').value || currentUser.indirizzo,
        citta: document.getElementById('editCity').value || currentUser.citta
    };

    try {
        const response = await fetch('/api/users/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Errore nell\'aggiornamento del profilo');

        const updatedUser = await response.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
        loadUserData();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Errore durante l\'aggiornamento del profilo');
    }
}



async function loadOrders() {
    try {
        const response = await fetch('/api/orders/user', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento degli ordini');
        
        const orders = await response.json();
        const tbody = document.getElementById('ordersTableBody');
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.ordine_id}</td>
                <td>${new Date(order.data_ordine).toLocaleDateString()}</td>
                <td>€${order.totale.toFixed(2)}</td>
                <td>
                    <span class="badge bg-${getStatusColor(order.stato)}">
                        ${getStatusText(order.stato)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.ordine_id})">
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
    }
}

function reportOrder(orderId) {
    document.getElementById('reportOrderId').value = orderId;
    const modal = new bootstrap.Modal(document.getElementById('reportOrderModal'));
    modal.show();
}

async function submitOrderReport() {
    const reportData = {
        ordine_id: document.getElementById('reportOrderId').value,
        motivo: document.getElementById('reportReason').value,
        descrizione: document.getElementById('reportDescription').value
    };

    try {
        const response = await fetch('/api/reports/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(reportData)
        });

        if (!response.ok) throw new Error('Errore nell\'invio della segnalazione');

        bootstrap.Modal.getInstance(document.getElementById('reportOrderModal')).hide();
        document.getElementById('reportOrderForm').reset();
        alert('Segnalazione inviata con successo');

    } catch (error) {
        console.error('Error:', error);
        alert('Errore durante l\'invio della segnalazione');
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

//Carica le segnalazioni dell'utente
async function loadUserReports() {
    try {
        const response = await fetch('/api/reports/user', {
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

//Mostra i dettagli dell'ordine
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel caricamento dei dettagli dell\'ordine');

        const order = await response.json();

        document.getElementById('orderDetailId').textContent = order.ordine_id;
        document.getElementById('orderDetailDate').textContent = new Date(order.data_ordine).toLocaleDateString();
        document.getElementById('orderDetailStatus').innerHTML = `
            <span class="badge bg-${getStatusColor(order.stato)}">
                ${getStatusText(order.stato)}
            </span>
        `;
        document.getElementById('orderDetailTotal').textContent = order.totale.toFixed(2);

        document.getElementById('orderDetailProducts').innerHTML = order.prodotti.map(product => `
            <tr>
                <td>${product.nome}</td>
                <td>${product.quantita}</td>
                <td>€${product.prezzo.toFixed(2)}</td>
                <td>€${(product.prezzo * product.quantita).toFixed(2)}</td>
            </tr>
        `).join('');

        const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nel caricamento dei dettagli dell\'ordine');
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
