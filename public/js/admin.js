// Keep only one initialization event
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get session user for authorization check
        const rawUser = sessionStorage.getItem('user');
        if (!rawUser) {
            window.location.href = '/login.html';
            return;
        }

        const user = JSON.parse(rawUser);
        if (user.ruolo_id !== 3) {
            window.location.href = '/index.html';
            return;
        }

        // Initialize admin console
        await Promise.all([
            loadDashboardData(),
            loadUsers(),
            loadArtisans(),
            loadProducts(),
            loadOrders(),
            loadReviews(),
            loadReports()
        ]);

        // Add event listeners for tab switching
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                loadTabData(this.getAttribute('href').substring(1));
            });
        });

        // Initialize charts
        initializeDashboardCharts();

    } catch (error) {
        console.error('Error initializing admin console:', error);
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
});

// --- DASHBOARD ---
async function loadDashboardData() {
    try {
        const response = await fetch('/admin/stats/users', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero dei dati');
        }

        const stats = await response.json();
        
        document.getElementById('totalClients').textContent = stats.clientsCount || 0;
        document.getElementById('totalArtisans').textContent = stats.artisansCount || 0;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('totalClients').textContent = '0';
        document.getElementById('totalArtisans').textContent = '0';
    }
}
function initializeDashboardCharts() {
    loadSalesChart();
    loadCategoriesChart();
}
async function loadSalesChart() {
    try {
        const response = await fetch('/admin/stats/orders', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero dati vendite');
        
        const monthlyData = await response.json();
        
        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Ordini',
                    data: monthlyData,
                    borderColor: '#7095b9',
                    backgroundColor: 'rgba(112, 149, 185, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#5f7c9d'
                        },
                        grid: {
                            color: 'rgba(177, 196, 210, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#5f7c9d'
                        },
                        grid: {
                            color: 'rgba(177, 196, 210, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#5f7c9d'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Ordini: ${context.parsed.y}`;
                            }
                        },
                        backgroundColor: 'rgba(95, 124, 157, 0.8)'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading sales chart:', error);
    }
}
async function loadCategoriesChart() {
    try {
        const response = await fetch('/admin/stats/categories', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero dati categorie');
        
        const data = await response.json();
        
        const ctx = document.getElementById('categoriesChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#7095b9',  // --palette-primary
                        '#5f7c9d',  // --palette-secondary
                        '#95b0ca',  // --palette-accent
                        '#b1c4d2',  // --palette-light
                        '#7e99b2'   // --palette-medium
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: false // Remove legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} prodotti (${percentage}%)`;
                            }
                        },
                        backgroundColor: 'rgba(95, 124, 157, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading categories chart:', error);
    }
}



// --- USERS ---
async function loadUsers() {
    try {
        const response = await fetch('/admin/users', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli utenti');

        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');
        
        // Function to render the table with filtered data
        function renderTable(filteredUsers) {
            tbody.innerHTML = filteredUsers.map(user => `
                <tr>
                    <td>${user.utente_id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge bg-${user.stato === 'attivo' ? 'success' : 'danger'}">
                            ${user.stato === 'attivo' ? 'Attivo' : 'Sospeso'}
                        </span>
                    </td>
                </tr>
            `).join('');

            if (filteredUsers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">
                            Nessun cliente trovato
                        </td>
                    </tr>
                `;
            }
        }

        // Initial render with all users
        renderTable(users);

        // Add filter functionality
        const filterButtons = document.querySelectorAll('#users .btn-group button');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active button state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Apply filter
                const filter = e.target.dataset.filter;
                let filteredUsers;
                
                switch(filter) {
                    case 'active':
                        filteredUsers = users.filter(user => user.stato === 'attivo');
                        break;
                    case 'suspended':
                        filteredUsers = users.filter(user => user.stato === 'sospeso');
                        break;
                    default: // 'all'
                        filteredUsers = users;
                }

                renderTable(filteredUsers);
            });
        });

    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger">
                    Errore nel caricamento degli utenti: ${error.message}
                </td>
            </tr>
        `;
    }
}
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'attivo' ? 'sospeso' : 'attivo';
    if (!confirm(`Sei sicuro di voler ${newStatus === 'attivo' ? 'riattivare' : 'sospendere'} questo utente?`)) {
        return;
    }

    try {
        const response = await fetch(`/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Errore nella modifica dello stato');

        await loadUsers();
    } catch (error) {
        console.error('Error:', error);
        alert('Errore nella modifica dello stato dell\'utente');
    }
}



// --- ARTISANS ---
async function loadArtisans() {
    try {
        const response = await fetch('/admin/artisans', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli artigiani');

        const artisans = await response.json();
        const tbody = document.getElementById('artisansTableBody');
        
        tbody.innerHTML = artisans.map(artisan => `
            <tr>
                <td>${artisan.artisan_id}</td>
                <td>${artisan.username}</td>
                <td>${artisan.email}</td>
                <td>${artisan.nome_tipologia}</td>
                <td>
                    <span class="badge bg-${artisan.stato === 'attivo' ? 'success' : 'danger'}">
                        ${artisan.stato === 'attivo' ? 'Attivo' : 'Sospeso'}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm ${artisan.stato === 'attivo' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleArtisanStatus(${artisan.artisan_id}, '${artisan.stato}')">
                        <i class="bi bi-${artisan.stato === 'attivo' ? 'pause-fill' : 'play-fill'}"></i>
                        ${artisan.stato === 'attivo' ? 'Sospendi' : 'Ripristina'}
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
async function toggleArtisanStatus(artisanId, currentStatus) {
    if (!confirm(`Sei sicuro di voler ${currentStatus === 'attivo' ? 'sospendere' : 'riattivare'} questo artigiano?`)) {
        return;
    }

    try {
        const response = await fetch(`/admin/artisans/${artisanId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: currentStatus === 'attivo' ? 'sospeso' : 'attivo'
            })
        });

        if (!response.ok) throw new Error('Errore nella modifica dello stato');

        // Update both tables
        await Promise.all([
            loadArtisans(),
            loadSuspendedArtisans()
        ]);
    } catch (error) {
        console.error('Error:', error);
        alert('Errore nella modifica dello stato dell\'artigiano');
    }
}
async function loadSuspendedArtisans() {
    try {
        const response = await fetch('/admin/artisans/suspended', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli artigiani sospesi');

        const artisans = await response.json();
        const tbody = document.getElementById('suspendedArtisansTableBody');
        
        tbody.innerHTML = artisans.map(artisan => `
            <tr>
                <td>${artisan.artisan_id}</td>
                <td>${artisan.username}</td>
                <td>${artisan.email}</td>
                <td>${artisan.nome_tipologia}</td>
                <td>${new Date(artisan.data_ultima_sospensione).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-warning">
                        ${artisan.numero_sospensioni}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-success" 
                            onclick="toggleArtisanStatus(${artisan.artisan_id}, '${artisan.stato}')">
                        <i class="bi bi-play-fill"></i> Ripristina
                    </button>
                </td>
            </tr>
        `).join('');

        if (artisans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        Nessun artigiano sospeso
                    </td>
                </tr>
            `;
        }

    } catch (error) {
        console.error('Error loading suspended artisans:', error);
        const tbody = document.getElementById('suspendedArtisansTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Errore nel caricamento degli artigiani sospesi: ${error.message}
                </td>
            </tr>
        `;
    }
}



// --- PRODUCTS ---
async function loadProducts() {
    try {
        const response = await fetch('/admin/products', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero dei prodotti');

        const data = await response.json();
        const products = data.products;
        
        // Populate filters
        populateFilters(products);

        // Initial render
        renderProducts(products);

        // Setup filter event listeners
        setupFilterListeners(products);

    } catch (error) {
        console.error('Error loading products:', error);
        showError('Errore nel caricamento dei prodotti: ' + error.message);
    }
}
function populateFilters(products) {
    // Populate category filter
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = [...new Set(products.map(p => p.nome_tipologia))].sort();
    categoryFilter.innerHTML = `
        <option value="">Tutte le categorie</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
    `;

    // Populate artisan filter
    const artisanFilter = document.getElementById('artisanFilter');
    const artisans = [...new Set(products.map(p => p.artigiano_nome))].sort();
    artisanFilter.innerHTML = `
        <option value="">Tutti gli artigiani</option>
        ${artisans.map(art => `<option value="${art}">${art}</option>`).join('')}
    `;
}
function setupFilterListeners(products) {
    const categoryFilter = document.getElementById('categoryFilter');
    const artisanFilter = document.getElementById('artisanFilter');

    const filterProducts = () => {
        let filtered = [...products];
        
        const selectedCategory = categoryFilter.value;
        const selectedArtisan = artisanFilter.value;

        if (selectedCategory) {
            filtered = filtered.filter(p => p.nome_tipologia === selectedCategory);
        }
        if (selectedArtisan) {
            filtered = filtered.filter(p => p.artigiano_nome === selectedArtisan);
        }

        renderProducts(filtered);
    };

    categoryFilter.addEventListener('change', filterProducts);
    artisanFilter.addEventListener('change', filterProducts);
}
function renderProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Nessun prodotto trovato</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.prodotto_id}</td>
            <td>${product.nome_prodotto}</td>
            <td>${product.nome_tipologia}</td>
            <td>€${parseFloat(product.prezzo).toFixed(2)}</td>
            <td>${product.quant}</td>
            <td>${product.artigiano_nome}</td>
        </tr>
    `).join('');
}
function showError(message) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger">${message}</td>
        </tr>
    `;
}



// --- ORDERS ---
async function loadOrders() {
    try {
        const response = await fetch('/admin/orders', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli ordini');

        const { orders } = await response.json();
        
        // Populate customer filter
        populateCustomerFilter(orders);
        
        // Initial render
        renderOrders(orders);
        
        // Setup filter listeners
        setupOrderFilters(orders);

    } catch (error) {
        console.error('Error loading orders:', error);
        showOrderError('Errore nel caricamento degli ordini: ' + error.message);
    }
}
function populateCustomerFilter(orders) {
    const customerFilter = document.getElementById('customerFilter');
    const customers = [...new Set(orders.map(o => o.cliente_nome))].sort();
    
    customerFilter.innerHTML = `
        <option value="">Tutti i clienti</option>
        ${customers.map(customer => `
            <option value="${customer}">${customer}</option>
        `).join('')}
    `;
}
function setupOrderFilters(orders) {
    const customerFilter = document.getElementById('customerFilter');
    const statusFilter = document.getElementById('statusFilter');

    const filterOrders = () => {
        let filtered = [...orders];
        
        const selectedCustomer = customerFilter.value;
        const selectedStatus = statusFilter.value;

        if (selectedCustomer) {
            filtered = filtered.filter(o => o.cliente_nome === selectedCustomer);
        }
        if (selectedStatus) {
            filtered = filtered.filter(o => o.stato === selectedStatus);
        }

        renderOrders(filtered);
    };

    customerFilter.addEventListener('change', filterOrders);
    statusFilter.addEventListener('change', filterOrders);
}
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!orders.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Nessun ordine trovato</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.cliente_nome}</td>
            <td>€${parseFloat(order.totale).toFixed(2)}</td>
            <td>${new Date(order.data).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-${getOrderStatusColor(order.stato)}">
                    ${order.stato}
                </span>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.id})">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}
function showOrderError(message) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger">${message}</td>
        </tr>
    `;
}
async function updateOrderStatus(orderId, newStatus, showConfirm = true) {
    if (showConfirm && !confirm(`Sei sicuro di voler aggiornare lo stato dell'ordine?`)) {
        return;
    }

    try {
        const response = await fetch(`/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Errore nell\'aggiornamento dello stato');

        await loadOrders();
    } catch (error) {
        console.error('Error:', error);
        alert('Errore nell\'aggiornamento dello stato dell\'ordine');
    }
}
function getOrderStatusColor(status) {
    const colors = {
        'in attesa': 'warning',
        'in preparazione': 'info',
        'spedito': 'primary',
        'controversia aperta': 'danger',
        'consegnato': 'success'
    };
    return colors[status] || 'secondary';
}
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/details`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero dei dettagli dell\'ordine');

        const order = await response.json();

        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="orderDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Dettagli Ordine #${orderId}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-4">
                                <h6>Cliente</h6>
                                <p>${order.cliente_nome}</p>
                            </div>
                            <div class="mb-4">
                                <h6>Data Ordine</h6>
                                <p>${new Date(order.data).toLocaleDateString()}</p>
                            </div>
                            <div class="mb-4">
                                <h6>Stato</h6>
                                <span class="badge bg-${getOrderStatusColor(order.stato)}">
                                    ${order.stato}
                                </span>
                            </div>
                            <div class="mb-4">
                                <h6>Prodotti</h6>
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Nome</th>
                                                <th>Quantità</th>
                                                <th>Prezzo Unit.</th>
                                                <th>Subtotale</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${order.products.map(product => `
                                                <tr>
                                                    <td>${product.nome_prodotto}</td>
                                                    <td>${product.quantita}</td>
                                                    <td>€${parseFloat(product.prezzo_unitario).toFixed(2)}</td>
                                                    <td>€${(product.quantita * product.prezzo_unitario).toFixed(2)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="3" class="text-end"><strong>Totale</strong></td>
                                                <td><strong>€${parseFloat(order.totale).toFixed(2)}</strong></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('orderDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nel caricamento dei dettagli dell\'ordine');
    }
}


// --- REVIEWS ---
async function loadReviews() {
    try {
        const response = await fetch('/admin/reviews', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero delle recensioni');

        const data = await response.json();
        const tbody = document.getElementById('reviewsTableBody');

        tbody.innerHTML = data.reviews.map(review => `
            <tr>
                <td>${review.recensione_id}</td>
                <td>${review.cliente_nome}</td>
                <td>${review.artigiano_nome}</td>
                <td>${review.valutazione}/5</td>
                <td>${review.testo}</td>
                <td>${new Date(review.data_recensione).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${review.stato === 'attiva' ? 'success' : 'danger'}">
                        ${review.stato === 'attiva' ? 'Attiva' : 'Rimossa'}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${review.segnalazioni > 0 ? 'warning' : 'secondary'}">
                        ${review.segnalazioni}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-info" onclick="viewReviewDetails(${review.recensione_id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading reviews:', error);
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
        const response = await fetch(`/reviews/${reviewId}`);
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
        const response = await fetch(`/reviews/${reviewId}/toggle`, {
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
        const response = await fetch('/admin/reports', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero delle segnalazioni');

        const { reports } = await response.json();
        
        // Populate different tables
        populateReportsTable('artisansReportsTableBody', reports);
        populateReportsTable('ordersReportsTableBody', reports);
        populateReportsTable('reviewsReportsTableBody', reports);

        // Update counters
        const orderReports = reports.filter(r => r.tipo_segnalazione === 'ordine' && r.stato === 'in attesa');
        const artisanReports = reports.filter(r => r.tipo_segnalazione === 'artigiano' && r.stato === 'in attesa');
        const reviewReports = reports.filter(r => r.tipo_segnalazione === 'recensione' && r.stato === 'in attesa');

        // Update counters in navigation
        document.getElementById('reportsCount').textContent = orderReports.length;
        document.getElementById('reportsCount').style.display = orderReports.length > 0 ? 'inline' : 'none';
        
        document.getElementById('artisanReportsCount').textContent = artisanReports.length;
        document.getElementById('artisanReportsCount').style.display = artisanReports.length > 0 ? 'inline' : 'none';
        
        document.getElementById('reviewReportsCount').textContent = reviewReports.length;
        document.getElementById('reviewReportsCount').style.display = reviewReports.length > 0 ? 'inline' : 'none';

    } catch (error) {
        console.error('Error loading reports:', error);
        showErrorInTables('Errore nel caricamento delle segnalazioni');
    }
}

function populateReportsTable(tableId, reports) {
    // Determine which table to populate based on ID
    const tables = {
        'artisansReportsTableBody': reports.filter(r => r.tipo_segnalazione === 'artigiano'),
        'ordersReportsTableBody': reports.filter(r => r.tipo_segnalazione === 'ordine'),
        'reviewsReportsTableBody': reports.filter(r => r.tipo_segnalazione === 'recensione')
    };

    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    // Get all reports for this table type
    let filteredReports = tables[tableId] || [];
    let filterType = 'all'; // Default filter type

    // Add filter functionality for both artisan and order reports
    if (tableId === 'artisansReportsTableBody' || tableId === 'ordersReportsTableBody') {
        const tabId = tableId === 'artisansReportsTableBody' ? 'artisansReportsTab' : 'reportsTab';
        const activeFilter = document.querySelector(`#${tabId} .btn-group button.active`);
        filterType = activeFilter?.dataset.filter || 'all';

        // Add event listeners for filter buttons if they haven't been added yet
        const filterButtons = document.querySelectorAll(`#${tabId} .btn-group button`);
        filterButtons.forEach(button => {
            if (!button.hasListener) {
                button.hasListener = true;
                button.addEventListener('click', (e) => {
                    // Update active state
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Get current filter
                    const currentFilter = e.target.dataset.filter;
                    
                    // Filter reports based on status
                    let currentReports = tables[tableId] || [];
                    switch(currentFilter) {
                        case 'pending':
                            currentReports = currentReports.filter(r => r.stato === 'in attesa');
                            break;
                        case 'resolved':
                            currentReports = currentReports.filter(r => r.stato === 'risolta');
                            break;
                        // 'all' shows everything, no additional filtering needed
                    }

                    // Render filtered reports
                    renderReports(tbody, currentReports, currentFilter);
                });
            }
        });

        // Apply current filter
        switch(filterType) {
            case 'pending':
                filteredReports = filteredReports.filter(r => r.stato === 'in attesa');
                break;
            case 'resolved':
                filteredReports = filteredReports.filter(r => r.stato === 'risolta');
                break;
            // 'all' shows everything, no additional filtering needed
        }
    }

    // Helper function to render reports
    function renderReports(tbody, reports, filterType) {
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.id}</td>
                <td>${report.tipo_segnalazione === 'ordine' ? `#${report.ordine_id}` : 'N/A'}</td>
                <td>${report.segnalatore_nome}</td>
                <td>${report.tipo}</td>
                <td>${report.descrizione}</td>
                <td>${new Date(report.data).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${report.stato === 'in attesa' ? 'warning' : 'success'}">
                        ${report.stato === 'in attesa' ? 'In Attesa' : 'Risolta'}
                    </span>
                </td>
                <td class="text-end">
                    ${report.stato === 'in attesa' ? `
                        <button class="btn btn-sm btn-success" onclick="resolveReport(${report.id})">
                            <i class="bi bi-check-lg"></i> Risolvi
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        ${filterType === 'pending' ? 'Nessuna segnalazione in attesa' : 
                          filterType === 'resolved' ? 'Nessuna segnalazione risolta' : 
                          'Nessuna segnalazione presente'}
                    </td>
                </tr>
            `;
        }
    }

    // Initial render
    renderReports(tbody, filteredReports, filterType);
}

function updateReportCounters(artisanCount, orderCount, reviewCount) {
    const counters = {
        'artisanReportsCount': artisanCount,
        'orderReportsCount': orderCount,
        'reviewReportsCount': reviewCount
    };

    Object.entries(counters).forEach(([id, count]) => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    });
}

// Update the resolve endpoint as well
async function resolveReport(reportId) {
    if (!confirm('Sei sicuro di voler contrassegnare questa segnalazione come risolta?')) {
        return;
    }

    try {
        const response = await fetch(`/reports/admin/${reportId}/resolve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Errore nella risoluzione della segnalazione');
        }

        // After resolving report, check if we need to update order status
        const orderResponse = await fetch(`/reports/${reportId}/order`);
        if (orderResponse.ok) {
            const { orderId } = await orderResponse.json();
            if (orderId) {
                await updateOrderStatus(orderId, 'consegnato', false);
            }
        }

        await loadReports();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Errore nella risoluzione della segnalazione');
    }
}

function showErrorInTables(message) {
    const tables = ['artisansReportsTableBody', 'ordersReportsTableBody', 'reviewsReportsTableBody'];
    tables.forEach(tableId => {
        const tbody = document.getElementById(tableId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Errore nel caricamento delle segnalazioni: ${message}
                    </td>
                </tr>
            `;
        }
    });
}

// --- UTILITY FUNCTIONS ---
async function loadTabData(tabId) {
    switch(tabId) {
        case 'users':
            await loadUsers();
            break;
        case 'artisans':
            await loadArtisans();
            await loadSuspendedArtisans()
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