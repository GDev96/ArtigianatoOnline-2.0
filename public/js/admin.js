document.addEventListener('DOMContentLoaded', function() {
    const rawUser = sessionStorage.getItem('user');
    if (!rawUser) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const user = JSON.parse(rawUser);
        if (user.ruolo_id !== 3) {
            window.location.href = '/index.html';
            return;
        }
        // Continue with admin console initialization...
    } catch (error) {
        console.error('Error loading admin console:', error);
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.ruolo_id !== 3) {
        window.location.href = '/login.html';
        return;
    }

    // Initialize Charts
    initializeDashboardCharts();
    // Load initial data
    loadDashboardData();
    
    // Add event listeners for tab switching
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            loadTabData(this.getAttribute('href').substring(1));
        });
    });
});

// --- DASHBOARD ---
async function loadDashboardData() {
    try {
        const artisansResponse = await fetch('/api/users/artisans', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!artisansResponse.ok) {
            throw new Error('Errore nel recupero dei dati');
        }

        const artisansData = await artisansResponse.json();
        
        const totalArtisans = artisansData.artisans ? artisansData.artisans.length : 0;
        const totalClients = artisansData.total - totalArtisans;

        document.getElementById('totalClients').textContent = totalClients;
        document.getElementById('totalArtisans').textContent = totalArtisans;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('totalClients').textContent = '0';
        document.getElementById('totalArtisans').textContent = '0';
    }
}

function initializeDashboardCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
            datasets: [{
                label: 'Vendite',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#b99570',
                tension: 0.1
            }]
        }
    });

    // Categories Chart
    const categoriesCtx = document.getElementById('categoriesChart').getContext('2d');
    new Chart(categoriesCtx, {
        type: 'doughnut',
        data: {
            labels: ['Gioielli', 'Ceramica', 'Legno', 'Altro'],
            datasets: [{
                data: [12, 19, 3, 5],
                backgroundColor: ['#b99570', '#d4b08c', '#f1d7b8', '#f8e9d6']
            }]
        }
    });
}

// --- USERS ---
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const users = await response.json();
        
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${user.active ? 'success' : 'danger'}">
                        ${user.active ? 'Attivo' : 'Inattivo'}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${user.segnalazioni > 0 ? 'warning' : 'secondary'}">
                        ${user.segnalazioni || 0}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// --- ARTISANS ---
async function loadArtisans() {
    try {
        const response = await fetch('/api/users/artisans', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero degli artigiani');
        }

        const artisansData = await response.json();
        const tbody = document.getElementById('artisansTableBody');

        tbody.innerHTML = artisansData.artisans.map(artisan => `
            <tr>
                <td>${artisan.id}</td>
                <td>${artisan.nome_utente}</td>
                <td>${artisan.email}</td>
                <td>${getCategoryName(artisan.tipologia_id)}</td>
                <td>
                    <span class="badge bg-${artisan.sospeso ? 'danger' : 'success'}">
                        ${artisan.sospeso ? 'Sospeso' : 'Attivo'}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${artisan.segnalazioni > 0 ? 'warning' : 'secondary'}">
                        ${artisan.segnalazioni || 0}
                    </span>
                </td>
                <td>
                    <button title="Sospendi" class="btn btn-sm ${artisan.sospeso ? 'btn-success' : 'btn-warning'}" 
                        onclick="toggleArtisanStatus(${artisan.id})">
                        <i class="bi bi-${artisan.sospeso ? 'play-circle' : 'pause-circle'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteArtisan(${artisan.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading artisans:', error);
        const tbody = document.getElementById('artisansTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Errore nel caricamento degli artigiani: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Add new function to handle artisan suspension
async function toggleArtisanStatus(artisanId) {
    if (confirm('Sei sicuro di voler cambiare lo stato di questo artigiano?')) {
        try {
            const response = await fetch(`/api/users/artisans/${artisanId}/toggle-status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                await loadArtisans();
            } else {
                throw new Error('Errore nella modifica dello stato dell\'artigiano');
            }
        } catch (error) {
            console.error('Error toggling artisan status:', error);
            alert('Errore nella modifica dello stato dell\'artigiano');
        }
    }
}
        
async function deleteArtisan(id) {
    if (confirm('Sei sicuro di voler eliminare questo artigiano?')) {
        try {
            const response = await fetch(`/api/users/artisans/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                await loadArtisans();
            }
        } catch (error) {
            console.error('Error deleting artisan:', error);
        }
    }
}

// --- PRODUCTS ---
async function loadProducts() {
    try {
        const response = await fetch('/api/products', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero dei prodotti');
        }

        const data = await response.json();
        const tbody = document.getElementById('productsTableBody');
        
        tbody.innerHTML = data.products.map(product => `
            <tr>
                <td>${product.prodotto_id}</td>
                <td>${product.nome_prodotto}</td>
                <td>${getCategoryName(product.tipologia_id)}</td>
                <td>€${parseFloat(product.prezzo).toFixed(2)}</td>
                <td>${product.quant}</td>
                <td>${product.artigiano_nome}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProduct(${product.prodotto_id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.prodotto_id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading products:', error);
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Errore nel caricamento dei prodotti: ${error.message}
                </td>
            </tr>
        `;
    }
}

async function editProduct(id) {
    console.log('Edit product:', id);
}

async function deleteProduct(id) {
    if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
        try {
            const response = await fetch(`/api/users/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                await loadProducts();
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }
}

async function toggleProductAvailability(id) {
    try {
        const response = await fetch(`/api/users/products/${id}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            await loadProducts();
        }
    } catch (error) {
        console.error('Error toggling product availability:', error);
    }
}

// --- ORDERS ---
async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const orders = await response.json();
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.cliente_nome}</td>
                <td>${order.artigiano_nome}</td>
                <td>€${order.totale.toFixed(2)}</td>
                <td>${new Date(order.data).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${getOrderStatusColor(order.stato)}">
                        ${order.stato}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="updateOrderStatus(${order.id})">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function getOrderStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'processing': 'info',
        'shipped': 'primary',
        'delivered': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

// --- REVIEWS ---
async function loadReviews() {
    try {
        const response = await fetch('/api/reviews', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const tbody = document.getElementById('reviewsTableBody');

        tbody.innerHTML = data.reviews.map(review => `
            <tr>
                <td>${review.recensione_id}</td>
                <td>${review.cliente_nome}</td>
                <td>${review.artigiano_nome}</td>
                <td>
                    <div class="stars">
                        ${generateStars(review.valutazione)}
                    </div>
                </td>
                <td>${review.testo.substring(0, 100)}${review.testo.length > 100 ? '...' : ''}</td>
                <td>${new Date(review.data_recensione).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${review.rimossa ? 'danger' : 'success'}">
                        ${review.rimossa ? 'Rimossa' : 'Attiva'}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${review.segnalazioni > 0 ? 'warning' : 'secondary'}">
                        ${review.segnalazioni || 0}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewReviewDetails(${review.recensione_id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm ${review.rimossa ? 'btn-success' : 'btn-danger'}" 
                            onclick="toggleReviewStatus(${review.recensione_id}, ${!review.rimossa})">
                        <i class="bi bi-${review.rimossa ? 'arrow-counterclockwise' : 'x-lg'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Errore nel caricamento delle recensioni:', error);
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-danger">
                    Errore nel caricamento delle recensioni: ${error.message}
                </td>
            </tr>
        `;
    }
}

function generateStars(rating) {
    return Array(5).fill(0).map((_, index) => 
        `<i class="bi bi-star${index < rating ? '-fill' : ''} text-warning"></i>`
    ).join('');
}

async function viewReviewDetails(reviewId) {
    try {
        const response = await fetch(`/api/reviews/${reviewId}`);
        if (!response.ok) throw new Error('Errore nel recupero dei dettagli della recensione');
        const review = await response.json();

        const modal = document.getElementById('reviewDetailsModal');
        const detailsContainer = modal.querySelector('.review-details');
        
        detailsContainer.innerHTML = `
            <div class="mb-3">
                <h6>Cliente</h6>
                <p>${review.cliente_nome}</p>
            </div>
            <div class="mb-3">
                <h6>Artigiano</h6>
                <p>${review.artigiano_nome}</p>
            </div>
            <div class="mb-3">
                <h6>Valutazione</h6>
                <div class="stars">
                    ${generateStars(review.valutazione)}
                </div>
            </div>
            <div class="mb-3">
                <h6>Recensione</h6>
                <p>${review.testo}</p>
            </div>
            <div class="mb-3">
                <h6>Data</h6>
                <p>${new Date(review.data_recensione).toLocaleDateString()}</p>
            </div>
        `;

        const modal_instance = new bootstrap.Modal(modal);
        modal_instance.show();

    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel caricamento dei dettagli della recensione');
    }
}

async function toggleReviewStatus(reviewId, shouldRemove) {
    if (!confirm(`Sei sicuro di voler ${shouldRemove ? 'rimuovere' : 'ripristinare'} questa recensione?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/reviews/${reviewId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ removed: shouldRemove })
        });

        if (!response.ok) throw new Error('Errore nella modifica dello stato della recensione');

        // Ricarica la tabella
        await loadReviews();

    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella modifica dello stato della recensione');
    }
}

// --- REPORTS ---
async function loadReports() {
    try {
        const response = await fetch('/api/admin/reports', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const reports = await response.json();
        
        // Aggiorna il contatore delle segnalazioni pendenti
        const pendingReports = reports.filter(report => report.stato === 'pending').length;
        document.getElementById('reportsCount').textContent = pendingReports;
        
        const tbody = document.getElementById('reportsTableBody');
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.id}</td>
                <td>
                    <a href="#" onclick="viewOrderDetails(${report.ordine_id})">
                        #${report.ordine_id}
                    </a>
                </td>
                <td>${report.utente_nome}</td>
                <td>${report.tipo}</td>
                <td>${report.descrizione}</td>
                <td>${new Date(report.data).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${report.stato === 'pending' ? 'warning' : 'success'}">
                        ${report.stato === 'pending' ? 'In Attesa' : 'Risolta'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="handleReport(${report.id})">
                        <i class="bi bi-chat-dots"></i>
                    </button>
                    ${report.stato === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="resolveReport(${report.id})">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

async function handleReport(reportId) {
    const response = await fetch(`/api/admin/reports/${reportId}`);
    const report = await response.json();
    // TODO: Implementa il modale
}

async function resolveReport(reportId) {
    if (confirm('Sei sicuro di voler contrassegnare questa segnalazione come risolta?')) {
        try {
            const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                await loadReports();
            }
        } catch (error) {
            console.error('Error resolving report:', error);
        }
    }
}

// --- UTILITY FUNCTIONS ---
async function loadTabData(tabId) {
    switch(tabId) {
        case 'users':
            await loadUsers();
            break;
        case 'artisans':
            await loadArtisans();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'orders':
            await loadOrders();
            await loadReports();
            break;
        case 'reviews':
            await loadReviews();
            break;
    }
}

function getCategoryName(tipologia_id) {
    const categories = {
        1: 'Ceramica',
        2: 'Legno',
        3: 'Tessuti',
        4: 'Gioielli',
        5: 'Vetro',
        6: 'Arredamento',
        7: 'Elettronica',
        8: 'Metallo',
        9: 'Decorazioni',
        10: 'Altro'
    };
    return categories[tipologia_id] || 'Non specificata';
}

function getStarRating(rating) {
    const fullStar = '<i class="bi bi-star-fill text-warning"></i>';
    const halfStar = '<i class="bi bi-star-half text-warning"></i>';
    const emptyStar = '<i class="bi bi-star text-warning"></i>';
    
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
        stars += fullStar;
    }
    if (hasHalfStar) {
        stars += halfStar;
    }
    while (stars.length < 5) {
        stars += emptyStar;
    }
    
    return stars;
}