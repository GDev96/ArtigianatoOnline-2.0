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

        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalClients').textContent = result.data.clientsCount || 0;
            document.getElementById('totalArtisans').textContent = result.data.artisansCount || 0;
        } else {
            throw new Error(result.message || 'Errore nei dati ricevuti');
        }

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
        
        const result = await response.json();
        const monthlyData = result.success ? result.data : [];
        
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
        
        const result = await response.json();
        const data = result.success ? result.data : { labels: [], values: [] };
        
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
                        display: false
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



async function loadUsers() {
    try {
        const response = await fetch('/admin/users', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli utenti');

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero degli utenti');
        }

        const users = result.data.users;
        const tbody = document.getElementById('usersTableBody');
        
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
                    <td>
                        ${user.stato === 'sospeso' ? 
                            new Date(user.data_sospensione).toLocaleDateString() : 
                            '-'}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-success" 
                                onclick="toggleUserStatus(${user.utente_id}, '${user.stato}')"
                                ${user.stato === 'attivo' ? 'disabled' : ''}>
                            <i class="bi bi-play-fill"></i>
                            Riattiva
                        </button>
                    </td>
                </tr>
            `).join('');

            if (filteredUsers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">
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
                <td colspan="6" class="text-center text-danger">
                    Errore nel caricamento degli utenti: ${error.message}
                </td>
            </tr>
        `;
    }
}
async function checkUserReportsAndSuspend(userId) {
    try {
        // First check if user is already suspended
        const userResponse = await fetch(`/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        const userResult = await userResponse.json();
        
        if (!userResult.success) {
            console.error('Error fetching user data:', userResult.message);
            return;
        }

        const userData = userResult.data;
        if (userData.stato === 'sospeso') return; // Skip if already suspended

        const response = await fetch(`/admin/users/${userId}/reports-count`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        const reportResult = await response.json();
        
        if (reportResult.success && reportResult.data.reportCount > 3) {
            await fetch(`/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'sospeso' })
            });

            showSuccessMessage('Utente sospeso automaticamente per eccesso di segnalazioni');
            await loadUsers();
        }
    } catch (error) {
        console.error('Error checking user reports:', error);
    }
}
async function checkUserReportsAndReactivate(userId) {
    try {
        const response = await fetch(`/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero dei dati utente');
        }

        const userData = result.data;
        
        if (userData.stato === 'sospeso') {
            const updateResponse = await fetch(`/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'attivo' })
            });

            if (!updateResponse.ok) {
                throw new Error(`HTTP error! status: ${updateResponse.status}`);
            }

            showSuccessMessage('Utente riattivato automaticamente: segnalazioni sotto soglia');
            await Promise.all([loadUsers(), loadReports()]);
        }
    } catch (error) {
        console.error('Error checking user for reactivation:', error);
        showErrorMessage('Errore durante la verifica dello stato utente');
    }
}


// Nel file admin.js, sostituisci la funzione toggleArtisanStatus con questa versione che usa Bootstrap correttamente:

async function toggleArtisanStatus(artisanId, currentStatus) {
    const newStatus = currentStatus === 'attivo' ? 'sospeso' : 'attivo';
    
    if (newStatus === 'attivo') {
        // Per la riattivazione, controlla le segnalazioni
        try {
            const reportsResponse = await fetch(`/admin/artisans/${artisanId}/reports-count`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const result = await reportsResponse.json();
            
            if (result.success && result.data.reportCount > 3) {
                showErrorMessage('Impossibile riattivare: troppe segnalazioni attive');
                return;
            }

            // Usa Bootstrap Modal correttamente per riattivazione
            document.getElementById('artisanIdToReactivate').value = artisanId;
            const modal = new bootstrap.Modal(document.getElementById('reactivateArtisanModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Errore nel controllo delle segnalazioni');
        }
    } else {
        // Usa Bootstrap Modal correttamente per sospensione
        document.getElementById('artisanIdToSuspend').value = artisanId;
        const modal = new bootstrap.Modal(document.getElementById('suspendArtisanConfirmModal'));
        modal.show();
    }
}

// Aggiorna le funzioni di conferma per chiudere correttamente i modali
async function confirmSuspendArtisan() {
    const artisanId = document.getElementById('artisanIdToSuspend').value;
    
    // Chiudi il modale usando Bootstrap
    const modalElement = document.getElementById('suspendArtisanConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
    
    // Esegui l'azione
    await updateArtisanStatus(artisanId, 'sospeso');
}

async function confirmReactivateArtisan() {
    const artisanId = document.getElementById('artisanIdToReactivate').value;
    
    // Chiudi il modale usando Bootstrap
    const modalElement = document.getElementById('reactivateArtisanModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
    
    // Esegui l'azione
    await updateArtisanStatus(artisanId, 'attivo');
}

// Aggiorna anche toggleUserStatus
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'attivo' ? 'sospeso' : 'attivo';
    
    if (newStatus === 'attivo') {
        try {
            const reportsResponse = await fetch(`/admin/users/${userId}/reports-count`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const result = await reportsResponse.json();
            
            if (result.success && result.data.reportCount > 3) {
                showErrorMessage('Impossibile riattivare: troppe segnalazioni attive');
                return;
            }

            // Usa Bootstrap Modal correttamente per utenti
            document.getElementById('userIdToReactivate').value = userId;
            const modal = new bootstrap.Modal(document.getElementById('reactivateUserModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Errore nel controllo delle segnalazioni');
        }
    } else {
        showErrorMessage('Gli utenti non possono essere sospesi manualmente');
    }
}

// Aggiorna confirmReactivateUser
async function confirmReactivateUser() {
    const userId = document.getElementById('userIdToReactivate').value;
    
    // Chiudi il modale usando Bootstrap
    const modalElement = document.getElementById('reactivateUserModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
    
    await updateUserStatus(userId, 'attivo');
}


async function updateUserStatus(userId, newStatus) {
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

        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage(result.message || `Utente ${newStatus === 'attivo' ? 'riattivato' : 'sospeso'} con successo`);
            await loadUsers();
        } else {
            throw new Error(result.message || 'Errore nella risposta del server');
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Errore nella modifica dello stato dell\'utente');
    }
}



async function loadArtisans() {
    try {
        const response = await fetch('/admin/artisans', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli artigiani');

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero degli artigiani');
        }

        const artisans = result.data.artisans;
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
                <td class="text-center">
                    <button class="btn btn-sm ${artisan.stato === 'attivo' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleArtisanStatus(${artisan.artisan_id}, '${artisan.stato}')">
                        <i class="bi bi-${artisan.stato === 'attivo' ? 'pause-fill' : 'play-fill'}"></i>
                        ${artisan.stato === 'attivo' ? 'Sospendi' : 'Riattiva'}
                    </button>
                </td>
            </tr>
        `).join('');

        if (artisans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        Nessun artigiano trovato
                    </td>
                </tr>
            `;
        }

    } catch (error) {
        console.error('Error loading artisans:', error);
        showErrorMessage('Errore nel caricamento degli artigiani: ' + error.message);
    }
}




async function resolveReport(reportId, withAction = false) {
    try {
        const response = await fetch(`/admin/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel recupero della segnalazione');
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero della segnalazione');
        }

        const reportData = result.data;
        
        if (reportData.artigiano_id) {
            await showArtisanReportResolution(reportId, reportData);
            return;
        } else if (reportData.ordine_id) {
            await showOrderReportResolution(reportId, reportData);
            return;
        } else if (reportData.recensione_id) {
            await showReviewReportResolution(reportId, reportData);
            return;
        }

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message || 'Errore nella risoluzione della segnalazione');
    }
}

async function showArtisanReportResolution(reportId, reportData) {
    try {
        // Get report details if not already present
        if (!reportData.artigiano_nome) {
            const response = await fetch(`/admin/reports/${reportId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Errore nel recupero dettagli segnalazione');
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Errore nel recupero dettagli segnalazione');
            }
            
            reportData = result.data;
        }

        // Populate modal with report details
        document.getElementById('reportedArtisanName').textContent = reportData.artigiano_nome || '';
        document.getElementById('reporterName').textContent = reportData.utente_nome || reportData.segnalatore_nome || '';
        document.getElementById('reportType').textContent = reportData.motivazione || reportData.tipo || '';
        document.getElementById('reportDescription').textContent = reportData.testo || reportData.descrizione || '';
        document.getElementById('reportDate').textContent = reportData.data_segnalazione ? 
            new Date(reportData.data_segnalazione).toLocaleDateString() : 
            new Date(reportData.data).toLocaleDateString();

        // Get modal element
        const modalElement = document.getElementById('artisanReportResolutionModal');
        
        // Clean up any existing modal instances
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
            existingModal.dispose();
        }

        // Create new modal instance
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });
        
        // Clean up previous event listeners by cloning buttons
        const suspendBtn = document.getElementById('suspendArtisanBtn');
        const resolveBtn = document.getElementById('resolveWithoutActionBtn');
        
        const newSuspendBtn = suspendBtn.cloneNode(true);
        const newResolveBtn = resolveBtn.cloneNode(true);
        
        suspendBtn.parentNode.replaceChild(newSuspendBtn, suspendBtn);
        resolveBtn.parentNode.replaceChild(newResolveBtn, resolveBtn);
        
        // Add new event listeners
        newSuspendBtn.addEventListener('click', async () => {
            modal.hide();
            
            const confirmed = await showCustomConfirm(
                'Conferma Sospensione', 
                `Sei sicuro di voler sospendere <strong>${reportData.artigiano_nome}</strong>? La sospensione durerà 3 giorni.`
            );
            
            if (confirmed) {
                try {
                    // Suspend artisan
                    const suspendResponse = await fetch(`/admin/artisans/${reportData.artigiano_id}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'sospeso' })
                    });
                    
                    if (!suspendResponse.ok) throw new Error('Errore nella sospensione dell\'artigiano');
                    
                    // Resolve report
                    await resolveReportRequest(reportId, true);
                    
                    showSuccessMessage('Artigiano sospeso e segnalazione risolta');
                    await Promise.all([loadArtisans(), loadReports()]);
                    
                } catch (error) {
                    console.error('Error:', error);
                    showErrorMessage('Errore durante la sospensione dell\'artigiano');
                }
            }
        });

        newResolveBtn.addEventListener('click', async () => {
            modal.hide();
            
            const confirmed = await showCustomConfirm(
                'Conferma Risoluzione', 
                `Sei sicuro di voler risolvere la segnalazione per <strong>${reportData.artigiano_nome}</strong> senza conseguenze?`
            );
            
            if (confirmed) {
                try {
                    await resolveReportRequest(reportId, false);
                
                    await loadReports();
                } catch (error) {
                    console.error('Error:', error);
                    showErrorMessage('Errore nella risoluzione della segnalazione');
                }
            }
        });

        // Show modal
        modal.show();
        
    } catch (error) {
        console.error('Error showing report resolution modal:', error);
        showErrorMessage('Errore nel caricamento dei dettagli della segnalazione');
    }
}

async function toggleArtisanStatus(artisanId, currentStatus) {
    const newStatus = currentStatus === 'attivo' ? 'sospeso' : 'attivo';
    
    if (newStatus === 'attivo') {
        // Per la riattivazione, controlla le segnalazioni
        try {
            const reportsResponse = await fetch(`/admin/artisans/${artisanId}/reports-count`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const result = await reportsResponse.json();
            
            if (result.success && result.data.reportCount > 3) {
                showErrorMessage('Impossibile riattivare: troppe segnalazioni attive');
                return;
            }

            // Usa Bootstrap Modal per riattivazione
            document.getElementById('artisanIdToReactivate').value = artisanId;
            const modal = new bootstrap.Modal(document.getElementById('reactivateArtisanModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Errore nel controllo delle segnalazioni');
        }
    } else {
        // Usa Bootstrap Modal per sospensione
        document.getElementById('artisanIdToSuspend').value = artisanId;
        const modal = new bootstrap.Modal(document.getElementById('suspendArtisanConfirmModal'));
        modal.show();
    }
}

async function confirmSuspendArtisan() {
    const artisanId = document.getElementById('artisanIdToSuspend').value;
    
    // Chiudi il modal Bootstrap
    const modalElement = document.getElementById('suspendArtisanConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
    
    // Esegui l'azione
    await updateArtisanStatus(artisanId, 'sospeso');
}

async function confirmReactivateArtisan() {
    const artisanId = document.getElementById('artisanIdToReactivate').value;
    
    // Chiudi il modal Bootstrap
    const modalElement = document.getElementById('reactivateArtisanModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
    
    // Esegui l'azione
    await updateArtisanStatus(artisanId, 'attivo');
}

async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'attivo' ? 'sospeso' : 'attivo';
    
    if (newStatus === 'attivo') {
        try {
            const reportsResponse = await fetch(`/admin/users/${userId}/reports-count`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            const result = await reportsResponse.json();
            
            if (result.success && result.data.reportCount > 3) {
                showErrorMessage('Impossibile riattivare: troppe segnalazioni attive');
                return;
            }

            // Usa Bootstrap Modal per utenti
            document.getElementById('userIdToReactivate').value = userId;
            const modal = new bootstrap.Modal(document.getElementById('reactivateUserModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Errore nel controllo delle segnalazioni');
        }
    } else {
        showErrorMessage('Gli utenti non possono essere sospesi manualmente');
    }
}

async function confirmReactivateUser() {
    const userId = document.getElementById('userIdToReactivate').value;
    
    // Chiudi il modal Bootstrap
    const modalElement = document.getElementById('reactivateUserModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
    
    await updateUserStatus(userId, 'attivo');
}

async function showOrderReportResolution(reportId, reportData) {
    try {
        // Populate modal with report details
        document.getElementById('reportedOrderId').textContent = `#${reportData.ordine_id}`;
        document.getElementById('orderReporterName').textContent = reportData.utente_nome;
        document.getElementById('orderReportType').textContent = reportData.tipo;
        document.getElementById('orderReportDescription').textContent = reportData.descrizione;
        document.getElementById('orderReportDate').textContent = new Date(reportData.data).toLocaleDateString();

        // Get modal instance
        const modalElement = document.getElementById('orderReportResolutionModal');
        
        // Clean up any existing modal instances
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
            existingModal.dispose();
        }

        const modal = new bootstrap.Modal(modalElement);
        
        // Setup resolve button listener
        const resolveBtn = document.getElementById('resolveOrderReportBtn');
        const newResolveBtn = resolveBtn.cloneNode(true);
        resolveBtn.parentNode.replaceChild(newResolveBtn, resolveBtn);
        
        newResolveBtn.addEventListener('click', async () => {
            modal.hide();
            
            const confirmed = await showCustomConfirm(
                'Conferma Risoluzione', 
                `Sei sicuro di voler risolvere la segnalazione per l'ordine <strong>#${reportData.ordine_id}</strong>?`
            );
            
            if (confirmed) {
                try {
                    await resolveReportRequest(reportId, false);
                    showSuccessMessage('Segnalazione risolta con successo');
                    await loadReports();
                } catch (error) {
                    console.error('Error:', error);
                    showErrorMessage('Errore nella risoluzione della segnalazione');
                }
            }
        });

        // Show modal
        modal.show();
    } catch (error) {
        console.error('Error showing order report resolution modal:', error);
        showErrorMessage('Errore nel caricamento dei dettagli della segnalazione');
    }
}

async function showReviewReportResolution(reportId, reportData) {
    try {
        // Se necessario, recupera i dettagli completi della segnalazione
        if (!reportData.motivazione || !reportData.utente_nome) {
            const response = await fetch(`/admin/reports/${reportId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Errore nel recupero dettagli segnalazione');
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Errore nel recupero dettagli segnalazione');
            }
            
            reportData = result.data;
        }

        // Popola il modal con i dettagli della segnalazione
        document.getElementById('reportedReviewId').textContent = `#${reportData.recensione_id}`;
        document.getElementById('reviewReporterName').textContent = reportData.utente_nome || reportData.segnalatore_nome;
        document.getElementById('reviewReportMotivation').textContent = reportData.motivazione || reportData.tipo;
        document.getElementById('reviewReportDescription').textContent = reportData.descrizione || reportData.testo;
        document.getElementById('reviewReportDate').textContent = new Date(reportData.data).toLocaleDateString();

        // Get modal instance
        const modalElement = document.getElementById('reviewReportResolutionModal');
        
        // Clean up any existing modal instances
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
            existingModal.dispose();
        }

        const modal = new bootstrap.Modal(modalElement);
        
        // Setup hide button listener
        const hideBtn = document.getElementById('hideReviewBtn');
        const newHideBtn = hideBtn.cloneNode(true);
        hideBtn.parentNode.replaceChild(newHideBtn, hideBtn);
        
        newHideBtn.addEventListener('click', async () => {
            modal.hide();
            
            const confirmed = await showCustomConfirm(
                'Conferma Nascondimento', 
                `Sei sicuro di voler nascondere la recensione <strong>#${reportData.recensione_id}</strong> e risolvere la segnalazione?`
            );
            
            if (confirmed) {
                try {
                    // Prima nascondi la recensione
                    const hideResponse = await fetch(`/admin/reviews/${reportData.recensione_id}/toggle-visibility`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!hideResponse.ok) {
                        throw new Error('Errore nel nascondere la recensione');
                    }

                    // Poi risolvi la segnalazione
                    await resolveReportRequest(reportId, true);
                    
                    showSuccessMessage('Segnalazione risolta e recensione nascosta');
                    await loadReviews();
                    await loadReports();
                } catch (error) {
                    console.error('Error:', error);
                    showErrorMessage('Errore nella risoluzione della segnalazione');
                }
            }
        });

        // Show modal
        modal.show();
    } catch (error) {
        console.error('Error showing review report resolution modal:', error);
        showErrorMessage('Errore nel caricamento dei dettagli della segnalazione');
    }
}

function showSuccessMessage(message) {
    console.log('SUCCESS:', message);
    
    const toastHtml = `
        <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '10100';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = toastContainer.lastElementChild;
    
    try {
        const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } catch (e) {
        console.error('Toast error:', e);
        alert('✅ ' + message);
        toastElement.remove();
    }
}

function showErrorMessage(message) {
    console.error('ERROR:', message);
    
    const toastHtml = `
        <div class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-triangle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '10100';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = toastContainer.lastElementChild;
    
    try {
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } catch (e) {
        console.error('Toast error:', e);
        alert('❌ ' + message);
        toastElement.remove();
    }
}

function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10050;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create confirmation dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            min-width: 400px;
            max-width: 500px;
            z-index: 10051;
            overflow: hidden;
        `;

        dialog.innerHTML = `
            <div style="background: var(--palette-primary, #7095b9); color: white; padding: 1.5rem; font-weight: 500; font-size: 1.1rem;">
                <i class="bi bi-exclamation-triangle me-2"></i>${title}
            </div>
            <div style="padding: 2rem 1.5rem; text-align: center;">
                <p style="margin-bottom: 2rem; font-size: 1rem; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">
                        <i class="bi bi-x-lg me-1"></i>Annulla
                    </button>
                    <button type="button" class="btn btn-warning" id="confirmBtn">
                        <i class="bi bi-check-lg me-1"></i>Conferma
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Add event listeners
        const cancelBtn = dialog.querySelector('#cancelBtn');
        const confirmBtn = dialog.querySelector('#confirmBtn');

        function cleanup() {
            document.body.removeChild(overlay);
        }

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        });
    });
}




async function confirmSuspendArtisan() {
    const artisanId = document.getElementById('artisanIdToSuspend').value;
    const modal = bootstrap.Modal.getInstance(document.getElementById('suspendArtisanConfirmModal'));
    modal.hide();
    
    await updateArtisanStatus(artisanId, 'sospeso');
}

// Funzione per gestire la conferma di riattivazione
async function confirmReactivateArtisan() {
    const artisanId = document.getElementById('artisanIdToReactivate').value;
    const modal = bootstrap.Modal.getInstance(document.getElementById('reactivateArtisanModal'));
    modal.hide();
    
    await updateArtisanStatus(artisanId, 'attivo');
}

async function updateArtisanStatus(artisanId, newStatus) {
    try {
        const response = await fetch(`/admin/artisans/${artisanId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Errore HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage(result.message || `Artigiano ${newStatus === 'attivo' ? 'riattivato' : 'sospeso'} con successo`);
            
            // Aggiorna le tabelle
            await Promise.all([
                loadArtisans(),
                loadSuspendedArtisans()
            ]);
        } else {
            throw new Error(result.message || 'Errore nella risposta del server');
        }
    } catch (error) {
        console.error('Error updating artisan status:', error);
        showErrorMessage('Errore nella modifica dello stato dell\'artigiano: ' + error.message);
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

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero degli artigiani sospesi');
        }

        const artisans = result.data;
        const tbody = document.getElementById('suspendedArtisansTableBody');
        
        if (!artisans || artisans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        Nessun artigiano sospeso
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = artisans.map(artisan => `
            <tr>
                <td>${artisan.artisan_id}</td>
                <td>${artisan.username}</td>
                <td>${artisan.email}</td>
                <td>${artisan.nome_tipologia}</td>
                <td>${artisan.data_ultima_sospensione ? new Date(artisan.data_ultima_sospensione).toLocaleDateString() : '-'}</td>
                <td>
                    <span class="badge bg-warning">
                        ${artisan.numero_sospensioni || 0}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success" 
                            onclick="toggleArtisanStatus(${artisan.artisan_id}, 'sospeso')">
                        <i class="bi bi-play-fill"></i> Riattiva
                    </button>
                </td>
            </tr>
        `).join('');

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



async function loadProducts() {
    try {
        const response = await fetch('/admin/products', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero dei prodotti');

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero dei prodotti');
        }

        const products = result.data.products;
        
        // Populate filters
        populateFilters(products);

        // Initial render
        renderProducts(products);

        // Setup filter event listeners
        setupFilterListeners(products);

    } catch (error) {
        console.error('Error loading products:', error);
        showErrorMessage('Errore nel caricamento dei prodotti: ' + error.message);
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

async function loadOrders() {
    try {
        const response = await fetch('/admin/orders', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero degli ordini');

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero degli ordini');
        }

        const orders = result.data.orders;
        
        // Populate customer filter
        populateCustomerFilter(orders);
        
        // Initial render
        renderOrders(orders);
        
        // Setup filter listeners
        setupOrderFilters(orders);

    } catch (error) {
        console.error('Error loading orders:', error);
        showErrorMessage('Errore nel caricamento degli ordini: ' + error.message);
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

    tbody.innerHTML = orders.map(order => {
        // Get the correct status color
        const statusColors = {
            'in preparazione': 'info',
            'spedito': 'primary',
            'controversia aperta': 'danger',
            'consegnato': 'success'
        };

        return `
            <tr>
                <td>${order.id}</td>
                <td>${order.cliente_nome}</td>
                <td>€${parseFloat(order.totale).toFixed(2)}</td>
                <td>${new Date(order.data).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${statusColors[order.stato] || 'secondary'}">
                        ${order.stato}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
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

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero dei dettagli dell\'ordine');
        }

        const order = result.data;

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



// Funzione helper per mostrare modali generici
function showModal(modalId) {
    cleanupModals();
    
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;
    
    // Crea backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '1050';
    backdrop.style.opacity = '0.5';
    document.body.appendChild(backdrop);
    
    // Mostra modale
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        modalElement.classList.add('show');
        modalElement.style.display = 'block';
        modalElement.style.zIndex = '1060';
        
        const modalContent = modalElement.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.zIndex = '1062';
        }
    }, 10);
    
    // Gestione chiusura
    const closeModal = () => {
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        backdrop.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    };
    
    // Event listeners per chiusura
    backdrop.addEventListener('click', closeModal);
    modalElement.querySelector('.btn-close')?.addEventListener('click', closeModal);
    modalElement.querySelector('[data-bs-dismiss="modal"]')?.addEventListener('click', closeModal);
}
async function showOrderReportResolution(reportId, reportData) {
    try {
        // Populate modal with report details
        document.getElementById('reportedOrderId').textContent = `#${reportData.ordine_id}`;
        document.getElementById('orderReporterName').textContent = reportData.utente_nome;
        document.getElementById('orderReportType').textContent = reportData.tipo;
        document.getElementById('orderReportDescription').textContent = reportData.descrizione;
        document.getElementById('orderReportDate').textContent = new Date(reportData.data).toLocaleDateString();

        // Get modal instance
        const modalElement = document.getElementById('orderReportResolutionModal');
        const modal = new bootstrap.Modal(modalElement);
        
        // Setup resolve button listener
        const resolveBtn = document.getElementById('resolveOrderReportBtn');
        resolveBtn.replaceWith(resolveBtn.cloneNode(true));
        
        document.getElementById('resolveOrderReportBtn').addEventListener('click', async () => {
            try {
                await resolveReportRequest(reportId, false);
                modal.hide();
                modalElement.addEventListener('hidden.bs.modal', async () => {
                    showSuccessMessage('Segnalazione risolta con successo');
                    await loadReports();
                }, { once: true });
            } catch (error) {
                console.error('Error:', error);
                showErrorMessage('Errore nella risoluzione della segnalazione');
            }
        });

        // Show modal
        modal.show();
    } catch (error) {
        console.error('Error showing order report resolution modal:', error);
        showErrorMessage('Errore nel caricamento dei dettagli della segnalazione');
    }
}
async function resolveReportRequest(reportId, withAction) {
    try {
        const response = await fetch(`/admin/reports/${reportId}/resolve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ withAction })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Errore nella risoluzione della segnalazione');
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nella risoluzione della segnalazione');
        }

        await loadOrders(); // Aggiorna la tabella ordini
        await loadReports(); // Aggiorna la tabella segnalazioni

    } catch (error) {
        console.error('Error resolving report:', error);
        throw new Error('Errore nella risoluzione della segnalazione');
    }
}
function showSuccessMessage(message) {
    console.log('SUCCESS:', message);
    
    // Usa un semplice alert se Bootstrap non è disponibile
    if (typeof bootstrap === 'undefined') {
        alert('✅ ' + message);
        return;
    }
    
    // Implementazione toast migliorata
    const toastHtml = `
        <div class="toast align-items-center text-white bg-success border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = toastContainer.lastElementChild;
    
    try {
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } catch (e) {
        console.error('Toast error:', e);
        alert('✅ ' + message);
    }
}

function showErrorMessage(message) {
    console.error('ERROR:', message);
    
    // Usa un semplice alert se Bootstrap non è disponibile
    if (typeof bootstrap === 'undefined') {
        alert('❌ ' + message);
        return;
    }
    
    const toastHtml = `
        <div class="toast align-items-center text-white bg-danger border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = toastContainer.lastElementChild;
    
    try {
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } catch (e) {
        console.error('Toast error:', e);
        alert('❌ ' + message);
    }
}

async function loadReviews() {
    try {
        const response = await fetch('/admin/reviews', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero delle recensioni');

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero delle recensioni');
        }

        const reviews = result.data.reviews;

        // Setup filter functionality
        setupReviewFilters(reviews);

    } catch (error) {
        console.error('Error loading reviews:', error);
        showReviewsError(error.message);
    }
}




function setupReviewFilters(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    const filterButtons = document.querySelectorAll('#reviewsTab .btn-group button');
    
    function renderFilteredReviews(filteredReviews) {
        if (!filteredReviews.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">Nessuna recensione trovata</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredReviews.map(review => `
            <tr>
                <td>${review.recensione_id}</td>
                <td>${review.cliente_nome}</td>
                <td>${review.artigiano_nome}</td>
                <td>${review.valutazione}/5</td>
                <td>${review.testo}</td>
                <td>${new Date(review.data_recensione).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${review.stato === 'attiva' ? 'success' : 'danger'}">
                        ${review.stato}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${review.segnalazioni > 0 ? 'warning' : 'secondary'}">
                        ${review.segnalazioni}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-info" onclick="viewReviewDetails(${review.recensione_id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Add click event listeners to filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active button state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Apply filter
            const filter = e.target.dataset.filter;
            let filteredReviews;

            switch(filter) {
                case 'active':
                    filteredReviews = reviews.filter(review => review.stato === 'attiva');
                    break;
                case 'hidden':
                    filteredReviews = reviews.filter(review => review.stato === 'nascosta');
                    break;
                case 'reported':
                    filteredReviews = reviews.filter(review => review.segnalazioni > 0);
                    break;
                default: // 'all'
                    filteredReviews = reviews;
                    break;
            }

            renderFilteredReviews(filteredReviews);
        });
    });

    // Initial render with all reviews
    renderFilteredReviews(reviews);
}

function showReviewsError(message) {
    const tbody = document.getElementById('reviewsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center text-danger">
                Errore nel caricamento delle recensioni: ${message}
            </td>
        </tr>
    `;
}

function generateStars(rating) {
    return Array(5).fill(0).map((_, index) => 
        `<i class="bi bi-star${index < rating ? '-fill' : ''} text-warning"></i>`
    ).join('');
}
async function viewReviewDetails(reviewId) {
    try {
        const response = await fetch(`/admin/reviews/${reviewId}/details`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero dei dettagli della recensione');
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero dei dettagli della recensione');
        }

        const review = result.data;

        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="reviewDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Dettagli Recensione #${reviewId}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-4">
                                <h6>Cliente</h6>
                                <p>${review.cliente_nome}</p>
                            </div>
                            <div class="mb-4">
                                <h6>Artigiano</h6>
                                <p>${review.artigiano_nome}</p>
                            </div>
                            <div class="mb-4">
                                <h6>Data Recensione</h6>
                                <p>${new Date(review.data_recensione).toLocaleDateString()}</p>
                            </div>
                            <div class="mb-4">
                                <h6>Valutazione</h6>
                                <div class="stars">
                                    ${generateStars(review.valutazione)}
                                </div>
                            </div>
                            <div class="mb-4">
                                <h6>Testo</h6>
                                <p>${review.testo}</p>
                            </div>
                            <div class="mb-4">
                                <h6>Stato</h6>
                                <span class="badge bg-${review.stato === 'attiva' ? 'success' : 'danger'}">
                                    ${review.stato === 'attiva' ? 'Attiva' : 'Nascosta'}
                                </span>
                            </div>
                            ${review.segnalazioni > 0 ? `
                                <div class="mb-4">
                                    <h6>Segnalazioni</h6>
                                    <span class="badge bg-warning">${review.segnalazioni}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('reviewDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reviewDetailsModal'));
        modal.show();

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

async function showReviewReportResolution(reportId, reportData) {
    try {
        // Se necessario, recupera i dettagli completi della segnalazione
        if (!reportData.motivazione || !reportData.utente_nome) {
            const response = await fetch(`/admin/reports/${reportId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Errore nel recupero dettagli segnalazione');
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Errore nel recupero dettagli segnalazione');
            }
            
            reportData = result.data;
        }

        // Popola il modale con i dettagli della segnalazione
        document.getElementById('reportedReviewId').textContent = `#${reportData.recensione_id}`;
        document.getElementById('reviewReporterName').textContent = reportData.utente_nome || reportData.segnalatore_nome;
        document.getElementById('reviewReportMotivation').textContent = reportData.motivazione || reportData.tipo;
        document.getElementById('reviewReportDescription').textContent = reportData.descrizione || reportData.testo;
        document.getElementById('reviewReportDate').textContent = new Date(reportData.data).toLocaleDateString();

        // Get modal instance
        const modalElement = document.getElementById('reviewReportResolutionModal');
        const modal = new bootstrap.Modal(modalElement);
        
        // Setup hide button listener
        const hideBtn = document.getElementById('hideReviewBtn');
        hideBtn.replaceWith(hideBtn.cloneNode(true));
        
        document.getElementById('hideReviewBtn').addEventListener('click', async () => {
            try {
                // Prima nascondi la recensione
                const hideResponse = await fetch(`/admin/reviews/${reportData.recensione_id}/toggle-visibility`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!hideResponse.ok) {
                    throw new Error('Errore nel nascondere la recensione');
                }

                // Poi risolvi la segnalazione
                await resolveReportRequest(reportId, true);
                
                modal.hide();
                modalElement.addEventListener('hidden.bs.modal', async () => {
                    showSuccessMessage('Segnalazione risolta e recensione nascosta');
                    await loadReviews();
                    await loadReports();
                }, { once: true });
            } catch (error) {
                console.error('Error:', error);
                showErrorMessage('Errore nella risoluzione della segnalazione');
            }
        });

        // Show modal
        modal.show();
    } catch (error) {
        console.error('Error showing review report resolution modal:', error);
        showErrorMessage('Errore nel caricamento dei dettagli della segnalazione');
    }
}


async function loadReports() {
    try {
        const response = await fetch('/admin/reports', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nel recupero delle segnalazioni');

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Errore nel recupero delle segnalazioni');
        }

        const reports = result.data.reports;
        
        // Populate different tables
        populateReportsTable('artisansReportsTableBody', reports);
        populateReportsTable('ordersReportsTableBody', reports);
        populateReportsTable('reviewsReportsTableBody', reports);

        // Update counters
        const orderReports = reports.filter(r => r.ordine_id && r.stato === 'in attesa');
        const artisanReports = reports.filter(r => r.artigiano_id && r.stato === 'in attesa');
        const reviewReports = reports.filter(r => r.recensione_id && r.stato === 'in attesa');

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
        'artisansReportsTableBody': reports.filter(r => r.artigiano_id !== null),
        'ordersReportsTableBody': reports.filter(r => r.ordine_id !== null),
        'reviewsReportsTableBody': reports.filter(r => r.recensione_id !== null)
    };

    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    if (tableId === 'reviewsReportsTableBody') {
        // Group reports by user and count only unresolved ones
        const userReports = reports.reduce((acc, report) => {
            if (report.cliente_id && report.stato === 'in attesa') {
                acc[report.cliente_id] = acc[report.cliente_id] || [];
                acc[report.cliente_id].push(report);
            }
            return acc;
        }, {});

        // Check users for automatic suspension only
        Object.entries(userReports).forEach(([userId, userReports]) => {
            if (userReports.length > 3) {
                checkUserReportsAndSuspend(userId);
            }
        });
    }

    let filteredReports = tables[tableId] || [];
    let filterType = 'all';

    // Add filter functionality for all report types
    if (['artisansReportsTableBody', 'ordersReportsTableBody', 'reviewsReportsTableBody'].includes(tableId)) {
        const tabId = {
            'artisansReportsTableBody': 'artisansReportsTab',
            'ordersReportsTableBody': 'reportsTab',
            'reviewsReportsTableBody': 'reviewsReportsTab'
        }[tableId];

        const activeFilter = document.querySelector(`#${tabId} .btn-group button.active`);
        filterType = activeFilter?.dataset.filter || 'all';

        // Add event listeners for filter buttons if they haven't been added yet
        const filterButtons = document.querySelectorAll(`#${tabId} .btn-group button`);
        filterButtons.forEach(button => {
            if (!button.hasListener) {
                button.hasListener = true;
                button.addEventListener('click', (e) => {
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    const currentFilter = e.target.dataset.filter;
                    let currentReports = tables[tableId] || [];
                    
                    switch(currentFilter) {
                        case 'pending':
                            currentReports = currentReports.filter(r => r.stato === 'in attesa');
                            break;
                        case 'resolved':
                            currentReports = currentReports.filter(r => r.stato === 'risolta');
                            break;
                    }

                    renderReports(tbody, currentReports, currentFilter, tableId);
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
        }
    }

    // Inside the renderReports function in populateReportsTable
    function renderReports(tbody, reports, filterType, tableId) {
        tbody.innerHTML = reports.map(report => {
            // Determine which ID to show based on table type
            let linkedId = '';
            switch(tableId) {
                case 'ordersReportsTableBody':
                    linkedId = `
                        <td>
                            <a href="#" onclick="viewOrderDetails(${report.ordine_id}); return false;">
                                #${report.ordine_id}
                            </a>
                        </td>`;
                    break;
                case 'artisansReportsTableBody':
                    linkedId = `<td>${report.artigiano_nome}</td>`;
                    break;
                case 'reviewsReportsTableBody':
                    linkedId = `<td>#${report.recensione_id}</td>`;  // Changed to simple text
                    break;
            }
    
            // Modify the table row structure for reviews reports
            if (tableId === 'reviewsReportsTableBody') {
                return `
                    <tr>
                        ${linkedId}
                        <td>${report.utente_nome}</td>
                        <td>${report.tipo}</td>
                        <td>${report.descrizione}</td>
                        <td>${new Date(report.data).toLocaleDateString()}</td>
                        <td>
                            <span class="badge bg-${report.stato === 'in attesa' ? 'warning' : 'success'}">
                                ${report.stato === 'in attesa' ? 'In Attesa' : 'Risolta'}
                            </span>
                        </td>
                        <td class="text-center">
                            ${report.stato === 'in attesa' ? `
                                <button class="btn btn-sm btn-success" onclick="resolveReport(${report.id})">
                                    <i class="bi bi-check-lg"></i> Risolvi
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            }
    
            // Return original structure for other tables
            return `
                <tr>
                    <td>${report.id}</td>
                    ${linkedId}
                    <td>${report.utente_nome}</td>
                    <td>${report.tipo}</td>
                    <td>${report.descrizione}</td>
                    <td>${new Date(report.data).toLocaleDateString()}</td>
                    <td>
                        <span class="badge bg-${report.stato === 'in attesa' ? 'warning' : 'success'}">
                            ${report.stato === 'in attesa' ? 'In Attesa' : 'Risolta'}
                        </span>
                    </td>
                    <td class="text-center">
                        ${report.stato === 'in attesa' ? `
                            <button class="btn btn-sm btn-success" onclick="resolveReport(${report.id})">
                                <i class="bi bi-check-lg"></i> Risolvi
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Initial render
    renderReports(tbody, filteredReports, filterType, tableId);
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