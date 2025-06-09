//********Header profilo********** 
// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get user ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');

        if (!userId) {
            throw new Error('ID utente non specificato');
        }

        // Get session user for authorization check
        const sessionUser = JSON.parse(sessionStorage.getItem('user'));
        if (!sessionUser) {
            window.location.href = '/login.html';
            return;
        }

        // Check if user is authorized to view this profile
        if (parseInt(userId) !== sessionUser.id) {
            throw new Error('Non autorizzato a visualizzare questo profilo');
        }

        // Load user data using the ID from URL
        const response = await fetch(`/users/api/${userId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Errore nel recupero dei dati utente');
        }

        // Update profile with user data
        updateUserProfile(data.user);
        
        // Load additional data
        await loadOrders();
        await loadUserReviews();
        await loadUserReports();

    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorMessage(error);
    }
});

//Funzione per aggiornare il profilo utente
function updateUserProfile(user) {

    // Update profile name and username in header
    const profileNameEl = document.getElementById('profileName');
    const usernameEl = document.querySelector('.username span'); // Changed selector to target span inside .username class

    if (profileNameEl) {
        profileNameEl.textContent = `${user.nome} ${user.cognome}`;
    }
    
    if (usernameEl) {
        usernameEl.textContent = user.username;
    }

    // Update info cards
    const cards = {
        'card-address': { value: user.indirizzo && user.citta ? `${user.indirizzo} - ${user.citta}` : 'Non specificato' },
        'card-phone': { value: user.numero_telefono || 'Non specificato' },
        'card-mail': { value: user.email || 'Non specificato' }
    };

    Object.entries(cards).forEach(([cardClass, data]) => {
        const card = document.querySelector(`.${cardClass} p`);
        if (card) {
            card.textContent = data.value;
        }
    });

    // Update form fields
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
        }
    });
}

// Modale di modifica profilo
async function updateProfile(event) {
    event.preventDefault();
    
    try {
        const userId = new URLSearchParams(window.location.search).get('id');
        const formData = {
            nome: document.getElementById('editNameInput').value.trim() || null,
            cognome: document.getElementById('editSurnameInput').value.trim() || null,
            email: document.getElementById('editEmailInput').value.trim() || null,
            numero_telefono: document.getElementById('editPhoneInput').value.trim() || null,
            indirizzo: document.getElementById('editAddressInput').value.trim() || null,
            citta: document.getElementById('editCityInput').value.trim() || null
        };

        // Filter out null values
        Object.keys(formData).forEach(key => 
            formData[key] === null && delete formData[key]
        );

        const response = await fetch(`/users/update/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nell\'aggiornamento del profilo');
        }

        const data = await response.json();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();

        // Update the profile display with new data
        updateUserProfile(data.user);

        // Show success message
        showSuccessMessage('Profilo aggiornato con successo');

    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorMessage(error.message || 'Errore nell\'aggiornamento del profilo');
    }
}



//********Tabella visualizzazione ordini********** 
// Carica gli ordini dell'utente
// Fix loadOrders function
async function loadOrders() {
    try {
        const response = await fetch('/orders/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Errore nel caricamento degli ordini');
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Errore nel caricamento degli ordini');
        }

        const orders = data.data; // Update to match API response structure
        const tbody = document.getElementById('ordersTableBody');
        
        if (!tbody) {
            throw new Error('Table body element not found');
        }

        if (!orders || orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-inbox mb-3" style="font-size: 2rem; color: var(--palette-primary);"></i>
                        <p>Nessun ordine effettuato</p>
                    </td>
                </tr>`;
            return;
        }
        
        // In the loadOrders function, update the table row generation:
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.ordine_id}</td>
                <td>${new Date(order.data_ordine).toLocaleDateString()}</td>
                <td>€${parseFloat(order.totale).toFixed(2)}</td>
                <td>
                    <span class="badge bg-${getStatusColor(order.stato)}">
                        ${getStatusText(order.stato)}
                    </span>
                </td>
                <td class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.ordine_id})" title="Visualizza dettagli">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="reportOrder(${order.ordine_id})" title="Segnala ordine">
                        <i class="fas fa-flag"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle mb-3"></i>
                        <p>${error.message || 'Errore nel caricamento degli ordini'}</p>
                    </td>
                </tr>`;
        }
    }
}

//Mostra i dettagli dell'ordine
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel caricamento dei dettagli dell\'ordine');
        }

        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Dati ordine non validi');
        }

        const order = data.data;

        // Update modal content
        const modalBody = document.querySelector('#orderDetailsModal .modal-body');
        if (!modalBody) {
            throw new Error('Modal body not found');
        }

        modalBody.innerHTML = `
            <div class="container-fluid">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>Ordine #:</strong> ${order.ordine_id}</p>
                        <p><strong>Data:</strong> ${new Date(order.data_ordine).toLocaleDateString()}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Stato:</strong> <span class="badge bg-${getStatusColor(order.stato)}">${getStatusText(order.stato)}</span></p>
                        <p><strong>Totale:</strong> €${parseFloat(order.totale).toFixed(2)}</p>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Prodotto</th>
                                <th>Quantità</th>
                                <th>Prezzo unitario</th>
                                <th>Totale</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.prodotti.map(item => `
                                <tr>
                                    <td>${item.nome}</td>
                                    <td>${item.quantita}</td>
                                    <td>€${parseFloat(item.prezzo).toFixed(2)}</td>
                                    <td>€${(item.quantita * parseFloat(item.prezzo)).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${order.stato === 'consegnato' ? `
                    <div class="mt-3 text-end">
                        <button class="btn btn-warning" onclick="reportOrder(${order.ordine_id})">
                            <i class="fas fa-flag me-1"></i> Segnala Ordine
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading order details:', error);
        showErrorMessage(error.message);
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
            order_id: parseInt(document.getElementById('reportOrderId').value),
            reason: document.getElementById('reportReason').value,
            description: document.getElementById('reportDescription').value
        };

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

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Errore nell\'invio della segnalazione');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportOrderModal'));
        modal.hide();
        document.getElementById('reportOrderForm').reset();

        showSuccessMessage('Segnalazione inviata con successo');

        // Reload orders and reports
        await Promise.all([loadOrders(), loadUserReports()]);

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message);
    }
}

// Funzioni per gestire i colori e i testi degli stati degli ordini
function getStatusColor(status) {
    const colors = {
        'in preparazione': 'warning',
        'spedito': 'primary',
        'controversia aperta': 'danger',
        'consegnato': 'success'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'in preparazione': 'In preparazione',
        'spedito': 'Spedito',
        'controversia aperta': 'Controversia aperta',
        'consegnato': 'Consegnato'
    };
    return texts[status] || status;
}



/*************Tabella recensioni *************/
// Carica le recensioni dell'utente
async function loadUserReviews() {
    try {
        const response = await fetch('/reviews/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nel caricamento delle recensioni');
        }
        
        const data = await response.json();
        const reviews = Array.isArray(data.reviews) ? data.reviews : [];
        const tbody = document.getElementById('reviewsTableBody');
        
        if (!tbody) {
            console.error('Reviews table body element not found');
            return;
        }

        if (reviews.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        Nessuna recensione scritta
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = reviews.map(review => `
            <tr>
                <td>
                    <a href="/catalog.html?id=${review.artigiano_id}" class="text-decoration-none">
                        ${review.nome_artigiano} ${review.cognome_artigiano}
                    </a>
                </td>
                <td>${new Date(review.data_recensione).toLocaleDateString()}</td>
                <td class="text-center">${review.valutazione}/5</td>
                <td>${review.descrizione}</td>
                <td>
                    <span class="badge bg-${getReviewStatusColor(review.stato)}">
                        ${getReviewStatus(review.stato)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editReview(${review.recensione_id}, ${review.valutazione}, '${review.descrizione.replace(/'/g, "\\'")}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteReview(${review.recensione_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('reviewsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

function editReview(reviewId, rating, description) {
    // Set values in modal form
    const editReviewForm = document.getElementById('editReviewForm');
    if (editReviewForm) {
        document.getElementById('editReviewId').value = reviewId;
        document.getElementById('editReviewRating').value = rating;
        document.getElementById('editReviewText').value = description;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
        modal.show();
    } else {
        console.error('Edit review form not found');
        showErrorMessage('Errore nel caricamento del form di modifica');
    }
}

async function updateReview() {
    try {
        const reviewId = document.getElementById('editReviewId').value;
        const data = {
            valutazione: parseInt(document.getElementById('editReviewRating').value),
            descrizione: document.getElementById('editReviewText').value.trim()
        };

        // Validation
        if (!data.valutazione || !data.descrizione) {
            showErrorMessage('Tutti i campi sono obbligatori');
            return;
        }

        const response = await fetch(`/reviews/${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nell\'aggiornamento della recensione');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
        modal.hide();

        // Reset form
        document.getElementById('editReviewForm').reset();

        // Show success message
        showSuccessMessage('Recensione aggiornata con successo');

        // Reload reviews
        await loadUserReviews();

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message || 'Errore nell\'aggiornamento della recensione');
    }
}

function deleteReview(reviewId) {
    document.getElementById('deleteReviewId').value = reviewId;
    const modal = new bootstrap.Modal(document.getElementById('deleteReviewModal'));
    modal.show();
}

async function confirmDeleteReview() {
    try {
        const reviewId = document.getElementById('deleteReviewId').value;
        
        const response = await fetch(`/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nell\'eliminazione della recensione');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteReviewModal'));
        modal.hide();

        // Show success message
        showSuccessMessage('Recensione eliminata con successo');

        // Reload reviews
        await loadUserReviews();

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Errore nell\'eliminazione della recensione');
    }
}

// Helper function per i colori dello stato recensione
function getReviewStatusColor(status) {
    const colors = {
        'attiva': 'success',
        'sospesa': 'warning',
        'eliminata': 'danger'
    };
    return colors[status] || 'secondary';
}
function getReviewStatus(status) {
    const statuses = {
        'attiva': 'Attiva',
        'sospesa': 'In revisione',
        'eliminata': 'Eliminata'
    };
    return statuses[status] || status;
}


/**********Tabella segnalazioni************* */
//Carica le segnalazioni dell'utente

// Fix loadUserReports function
async function loadUserReports() {
    try {
        const response = await fetch('/reports/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Errore nel caricamento delle segnalazioni');
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Errore nel caricamento delle segnalazioni');
        }

        const reports = data.reports;
        const tbody = document.getElementById('reportsTableBody');
        
        if (!tbody) {
            throw new Error('Reports table body element not found');
        }

        if (!reports || reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-shield-check mb-3" style="font-size: 2rem; color: var(--palette-primary);"></i>
                        <p>Nessuna segnalazione effettuata</p>
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = reports.map(report => {
            // Determine reference type and format
            let reference = '';
            if (report.ordine_id) {
                reference = `Ordine #${report.ordine_id}`;
            } else if (report.recensione_id) {
                reference = `Recensione #${report.recensione_id}`;
            } else if (report.artigiano_id) {
                reference = `Artigiano #${report.artigiano_id}`;
            } else {
                reference = 'N/A';
            }

            return `
                <tr>
                    <td>${reference}</td>
                    <td>${new Date(report.data_segnalazione).toLocaleDateString()}</td>
                    <td>${getReportReasonText(report.motivazione)}</td>
                    <td>
                        <span class="badge bg-${getReportStatusColor(report.stato_segnalazione)}">
                            ${getReportStatusText(report.stato_segnalazione)}
                        </span>
                    </td>
                    <td>
                        ${report.stato_segnalazione === 'in attesa' ? `
                            <button class="btn btn-sm btn-danger" onclick="deleteReport(${report.segnalazione_id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('reportsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle mb-3"></i>
                        <p>${error.message || 'Errore nel caricamento delle segnalazioni'}</p>
                    </td>
                </tr>`;
        }
    }
}

function deleteReport(reportId) {
    document.getElementById('deleteReportId').value = reportId;
    const modal = new bootstrap.Modal(document.getElementById('deleteReportModal'));
    modal.show();
}

async function confirmDeleteReport() {
    try {
        const reportId = document.getElementById('deleteReportId').value;
        
        const response = await fetch(`/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nell\'eliminazione della segnalazione');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteReportModal'));
        modal.hide();

        // Show success message
        showSuccessMessage('Segnalazione eliminata con successo');

        // Reload reports
        await loadUserReports();

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Errore nell\'eliminazione della segnalazione');
    }
}
// Helper functions for report status and reason
function getReportStatusColor(status) {
    const colors = {
        'in attesa': 'warning',
        'in lavorazione': 'info',
        'risolta': 'success',
        'chiusa': 'secondary',
        'rifiutata': 'danger'
    };
    return colors[status] || 'secondary';
}
function getReportStatusText(status) {
    const statuses = {
        'in attesa': 'In attesa',
        'in lavorazione': 'In lavorazione',
        'risolta': 'Risolta',
        'chiusa': 'Chiusa',
        'rifiutata': 'Rifiutata'
    };
    return statuses[status] || status;
}
function getReportReasonText(reason) {
    const reasons = {
        'delivery': 'Problemi di consegna',
        'product': 'Prodotto danneggiato/difettoso',
        'other': 'Altro'
    };
    return reasons[reason] || reason;
}
