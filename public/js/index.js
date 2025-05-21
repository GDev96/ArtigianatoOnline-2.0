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
            throw new Error(`HTTP error! status: ${categoriesResponse.status}`);
        }
        const categoriesData = await categoriesResponse.json();

        // Populate category filter
        const categorySelect = document.getElementById('filterCategory');
        categoriesData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.tipologia_id;
            option.textContent = category.nome_tipologia;
            categorySelect.appendChild(option);
        });

        // Create category map for later use
        const categoryMap = {};
        categoriesData.categories.forEach(cat => {
            categoryMap[cat.tipologia_id] = cat.nome_tipologia;
        });

        // Fetch artisans data
        const response = await fetch('/api/users/artisans', { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Populate city filter
        const uniqueCities = [...new Set(data.artisans.map(artisan => artisan.citta))].filter(Boolean);
        const citySelect = document.getElementById('filterCity');
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

            const filteredArtisans = data.artisans.filter(artisan => {
                const matchCategory = !selectedCategory || artisan.tipologia_id.toString() === selectedCategory;
                const matchCity = !selectedCity || artisan.citta === selectedCity;
                return matchCategory && matchCity;
            });

            updateArtisansDisplay(filteredArtisans, categoryMap);
        });

        // Initial display
        updateArtisansDisplay(data.artisans, categoryMap);

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
            <div class="card">
                <img src="${artisan.immagine || '/assets/images/wallpaper2.jpg'}" 
                    class="card-img-top" 
                    alt="${artisan.nome_utente}"
                    onerror="this.src='/assets/images/wallpaper2.jpg'">
                <div class="card-body">
                    <h5 class="card-title">${artisan.nome_utente}</h5>
                    <p class="card-category">${categoryMap[artisan.tipologia_id] || 'Categoria non specificata'}</p>
                    <div class="d-flex justify-content-end">
                        <a href="/catalog.html?id=${artisan.id}" class="btn">Vedi catalogo</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}