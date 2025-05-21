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
        
        // Fetch categories data first - MODIFICATO per nuova API
        const categoriesResponse = await fetch('/api/categories', { headers });
        if (!categoriesResponse.ok) {
            throw new Error(`Errore nel caricamento delle categorie! Status: ${categoriesResponse.status}`);
        }
            
        const { data: categoriesData } = await categoriesResponse.json(); // MODIFICATO per nuova struttura

        // Populate category filter - MODIFICATO per nuova struttura
        const categorySelect = document.getElementById('filterCategory');
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id; // MODIFICATO da tipologia_id a id
            option.textContent = category.name; // MODIFICATO da nome_tipologia a name
            categorySelect.appendChild(option);
        });

        // Create category map for later use - MODIFICATO
        const categoryMap = {};
        categoriesData.forEach(cat => {
            categoryMap[cat.id] = cat.name; // MODIFICATO chiavi da tipologia_id a id e nome_tipologia a name
        });

        // Fetch artisans data - RIMANE INVARIATO
        const response = await fetch('/api/users/artisans', { headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Errore ${response.status} nel caricamento artigiani`);
        }
        const { artisans } = await response.json();

        // Populate city filter - RIMANE INVARIATO
        const uniqueCities = [...new Set(artisans.map(artisan => artisan.citta))].filter(Boolean);
        const citySelect = document.getElementById('filterCity');
        uniqueCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });

        // Update filter handler - MODIFICATO solo la chiave tipologia_id a id
        document.getElementById('applyFilters').addEventListener('click', () => {
            const selectedCategory = categorySelect.value;
            const selectedCity = citySelect.value;

            const filteredArtisans = artisans.filter(artisan => {
                const matchCategory = !selectedCategory || artisan.tipologia_id.toString() === selectedCategory;
                const matchCity = !selectedCity || artisan.citta === selectedCity;
                return matchCategory && matchCity;
            });

            updateArtisansDisplay(filteredArtisans, categoryMap);
        });

        // Initial display - RIMANE INVARIATO
        updateArtisansDisplay(artisans, categoryMap);

    } catch (error) {
        console.error('Error loading home page:', error);
        const artisansContainer = document.getElementById('artisans-container');
        if (artisansContainer) {
            artisansContainer.innerHTML = `
                <div class="col-12">
                    <div class="card">
                        <div class="card-body text-center p-5">
                            <i class="bi bi-exclamation-triangle mb-3" style="font-size: 2rem; color: #dc3545;"></i>
                            <h5 class="card-title">Si è verificato un errore</h5>
                            <p class="card-text text-muted">
                                Non è stato possibile caricare gli artigiani.
                                <br>Dettaglio: ${error.message}
                            </p>
                            <button onclick="location.reload()" class="btn btn-outline-secondary mt-3">
                                <i class="bi bi-arrow-clockwise me-2"></i>Riprova
                            </button>
                        </div>
                    </div>
                </div>`;
        }
    }
});

function updateArtisansDisplay(artisans, categoryMap) {
    const container = document.getElementById('artisans-container');

    if (artisans.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center p-5">
                        <i class="bi bi-search mb-3" style="font-size: 2rem; color: #b99570;"></i>
                        <h5 class="card-title">Nessun artigiano trovato</h5>
                        <p class="card-text text-muted">
                            Non ci sono artigiani che corrispondono ai filtri selezionati.
                            <br>Prova a modificare i criteri di ricerca.
                        </p>
                    </div>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = artisans.map(artisan => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <img src="${artisan.immagine ? 'data:image/jpeg;base64,' + artisan.immagine : '/assets/images/wallpaper2.jpg'}" 
                    class="card-img-top" 
                    alt="${artisan.username}"
                    style="height: 200px; object-fit: cover;"
                    onerror="this.src='/assets/images/wallpaper2.jpg'">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${artisan.nome} ${artisan.cognome}</h5>
                    <p class="card-text">
                        <i class="bi bi-geo-alt"></i> ${artisan.citta || 'Città non specificata'}
                    </p>
                    <p class="card-text">
                        <i class="bi bi-tag"></i> ${categoryMap[artisan.tipologia_id] || 'Categoria non specificata'}
                    </p>
                    <div class="mt-auto d-flex justify-content-end">
                        <a href="/catalog.html?id=${artisan.id}" class="btn btn-outline-primary">
                            <i class="bi bi-shop me-2"></i>Vedi catalogo
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}