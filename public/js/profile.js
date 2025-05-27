/***********Header dati utente ******************/
// Add error handling functions at the top
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

function updateUserProfile(user) {
    console.log('Updating user profile with:', user);

    // Update profile name and username in header
    const profileNameEl = document.getElementById('profileName');
    const usernameEl = document.querySelector('#username .username'); // Changed selector

    if (profileNameEl) {
        profileNameEl.textContent = `${user.nome} ${user.cognome}`;
    }
    
    if (usernameEl) {
        usernameEl.textContent = user.username; // Username will be after @ in HTML
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
// Add error message function at the top with other message functions
function showErrorMessage(message) {
    const container = document.createElement('div');
    container.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    container.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(container);
    
    setTimeout(() => {
        container.remove();
    }, 3000);
}

// Update the updateProfile function
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

        console.log('Sending update with data:', formData);

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
// Add a success message function
function showSuccessMessage(message) {
    const container = document.createElement('div');
    container.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    container.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(container);
    
    setTimeout(() => {
        container.remove();
    }, 3000);
}
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
        showError(error);
    }
});




//********Tabella visualizzazione ordini********** 


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
        
        // For each product in order, fetch artisan details
        if (order.prodotti && order.prodotti.length > 0) {
            const productsWithArtisans = await Promise.all(order.prodotti.map(async product => {
                if (!product.artigiano_id) {
                    console.warn('Product without artisan ID:', product);
                    return {
                        ...product,
                        nome_artigiano: 'Non disponibile',
                        cognome_artigiano: ''
                    };
                }

                try {
                    const artisanResponse = await fetch(`/users/api/artisan/${product.artigiano_id}`, {
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                        }
                    });
                    
                    if (!artisanResponse.ok) {
                        console.error(`Failed to fetch artisan details for ID: ${product.artigiano_id}`);
                        return {
                            ...product,
                            nome_artigiano: 'Non disponibile',
                            cognome_artigiano: ''
                        };
                    }

                    const artisan = await artisanResponse.json();
                    if (!artisan.success) {
                        throw new Error('Invalid artisan data');
                    }

                    return {
                        ...product,
                        nome_artigiano: artisan.artisan.nome,
                        cognome_artigiano: artisan.artisan.cognome
                    };
                } catch (error) {
                    console.error(`Error fetching artisan ${product.artigiano_id}:`, error);
                    return {
                        ...product,
                        nome_artigiano: 'Non disponibile',
                        cognome_artigiano: ''
                    };
                }
            }));

            order.prodotti = productsWithArtisans;
        }

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
                        <!--<td>${product.nome_artigiano} ${product.cognome_artigiano}</td>-->
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
// Funzioni per gestire i colori e i testi degli stati degli ordini
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



/*************Tabella recensioni *************/
// Carica le recensioni dell'utente
async function loadUserReviews() {
    try {
        const response = await fetch('/reviews/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento delle recensioni');
        
        const reviews = await response.json();
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
                    <button class="btn btn-sm btn-primary me-1" onclick="editReview(${JSON.stringify(review).replace(/"/g, '&quot;')})">
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
        document.getElementById('reviewsTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Errore nel caricamento delle recensioni
                </td>
            </tr>
        `;
    }
}
function editReview(review) {
    document.getElementById('editReviewId').value = review.recensione_id;
    document.getElementById('editReviewRating').value = review.valutazione;
    document.getElementById('editReviewText').value = review.descrizione;
    
    const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    modal.show();
}
async function updateReview() {
    try {
        const reviewId = document.getElementById('editReviewId').value;
        const data = {
            valutazione: document.getElementById('editReviewRating').value,
            descrizione: document.getElementById('editReviewText').value
        };

        const response = await fetch(`/reviews/${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Errore nell\'aggiornamento della recensione');

        // Chiudi il modale
        const modal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
        modal.hide();

        // Ricarica le recensioni
        await loadUserReviews();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nell\'aggiornamento della recensione');
    }
}
async function deleteReview(reviewId) {
    if (!confirm('Sei sicuro di voler eliminare questa recensione?')) return;

    try {
        const response = await fetch(`/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nell\'eliminazione della recensione');

        // Ricarica le recensioni
        await loadUserReviews();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nell\'eliminazione della recensione');
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
async function loadUserReports() {
    try {
        const response = await fetch('/reports/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento delle segnalazioni');
        
        const reports = await response.json();
        const tbody = document.getElementById('reportsTableBody');
        
        if (!tbody) {
            console.error('Reports table body element not found');
            return;
        }

        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        Nessuna segnalazione effettuata
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.ordine_id ? `#${report.ordine_id}` : 'N/A'}</td>
                <td>${new Date(report.data_segnalazione).toLocaleDateString()}</td>
                <td>${getReportReasonText(report.motivazione)}</td>
                <td>
                    <span class="badge bg-${getReportStatusColor(report.stato_segnalazione)}">
                        ${getReportStatusText(report.stato_segnalazione)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteReport(${report.segnalazione_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('reportsTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Errore nel caricamento delle segnalazioni
                </td>
            </tr>
        `;
    }
}
async function deleteReport(reportId) {
    if (!confirm('Sei sicuro di voler eliminare questa segnalazione?')) return;

    try {
        const response = await fetch(`/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nell\'eliminazione della segnalazione');

        // Ricarica le segnalazioni
        await loadUserReports();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nell\'eliminazione della segnalazione');
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
