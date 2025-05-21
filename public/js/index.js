document.addEventListener('DOMContentLoaded', async () => {
    try {
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        if (auth.token) {
            headers.Authorization = `Bearer ${auth.token}`;
        }

        // Fetch categories data first
        const categoriesResponse = await fetch('/api/categories', { headers });
        if (!categoriesResponse.ok) {
            throw new Error(`Errore nel caricamento delle categorie! Status: ${categoriesResponse.status}`);
        }
        const categoriesData = await categoriesResponse.json(); // Ora riceverai direttamente l'array

        // Populate category filter
        const categorySelect = document.getElementById('filterCategory');
        // Aggiungi opzione vuota
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Tutte le categorie';
        categorySelect.appendChild(emptyOption);
        
        // Aggiungi categorie
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.tipologia_id;
            option.textContent = category.nome_tipologia;
            categorySelect.appendChild(option);
        });

        // Create category map for later use
        const categoryMap = {};
        categoriesData.forEach(cat => {
            categoryMap[cat.tipologia_id] = cat.nome_tipologia;
        });

        // Fetch artisans data
        const response = await fetch('/api/users/artisans', { headers });
        if (!response.ok) {
            throw new Error(`Errore nel caricamento degli artigiani! Status: ${response.status}`);
        }
        const { artisans } = await response.json();

        // Populate city filter
        const citySelect = document.getElementById('filterCity');
        // Aggiungi opzione vuota
        const emptyCityOption = document.createElement('option');
        emptyCityOption.value = '';
        emptyCityOption.textContent = 'Tutte le città';
        citySelect.appendChild(emptyCityOption);
        
        // Aggiungi città uniche
        const uniqueCities = [...new Set(artisans.map(artisan => artisan.citta).filter(Boolean))];
        uniqueCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });

        // Update filter handler
        document.getElementById('applyFilters').addEventListener('click', () => {
            const selectedCategory = categorySelect.value;
            const selectedCity = citySelect.value;

            const filteredArtisans = artisans.filter(artisan => {
                const matchCategory = !selectedCategory || 
                    (artisan.tipologia_id && artisan.tipologia_id.toString() === selectedCategory);
                const matchCity = !selectedCity || artisan.citta === selectedCity;
                return matchCategory && matchCity;
            });

            updateArtisansDisplay(filteredArtisans, categoryMap);
        });

        // Initial display
        updateArtisansDisplay(artisans, categoryMap);

    } catch (error) {
        console.error('Error loading page:', error);
        showError(error);
    }
});

function updateArtisansDisplay(artisans, categoryMap) {
    const container = document.getElementById('artisans-container');
    if (!container) return;

    if (!artisans || artisans.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center p-5">
                        <i class="bi bi-search mb-3" style="font-size: 2rem; color: #b99570;"></i>
                        <h5 class="card-title">Nessun artigiano trovato</h5>
                        <p class="card-text text-muted">
                            Non ci sono artigiani disponibili o che corrispondono ai filtri selezionati.
                        </p>
                    </div>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = artisans.map(artisan => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <img src="${artisan.immagine ? `/uploads/${artisan.immagine}` : '/assets/images/default-artisan.jpg'}" 
                    class="card-img-top img-fluid" 
                    alt="${artisan.username || 'Artigiano'}"
                    style="height: 200px; object-fit: cover;"
                    onerror="this.src='/assets/images/default-artisan.jpg'">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${artisan.nome || ''} ${artisan.cognome || ''}</h5>
                    <p class="card-text text-muted">
                        <i class="bi bi-geo-alt"></i> ${artisan.citta || 'Città non specificata'}
                    </p>
                    <p class="card-text">
                        <span class="badge bg-light text-dark">
                            ${categoryMap[artisan.tipologia_id] || 'Categoria non specificata'}
                        </span>
                    </p>
                    <div class="mt-auto">
                        <a href="/artisan-details.html?id=${artisan.id}" class="btn btn-outline-primary w-100">
                            Vedi dettagli
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function showError(error) {
    const container = document.getElementById('artisans-container') || document.body;
    container.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-body text-center p-5">
                    <i class="bi bi-exclamation-triangle mb-3" style="font-size: 2rem; color: #dc3545;"></i>
                    <h5 class="card-title">Si è verificato un errore</h5>
                    <p class="card-text text-muted">
                        ${error.message || 'Errore durante il caricamento dei dati'}
                    </p>
                    <button onclick="location.reload()" class="btn btn-outline-secondary mt-3">
                        <i class="bi bi-arrow-clockwise me-2"></i>Riprova
                    </button>
                </div>
            </div>
        </div>`;
}