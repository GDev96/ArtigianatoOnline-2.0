// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        if (user) {
            const token = sessionStorage.getItem('token');
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        // Recupera gli artigiani attivi e le categorie in parallelo
        const [artisansResponse, categoriesResponse] = await Promise.all([
            fetch('/users/artisans', { headers }),
            fetch('/categories', { headers })
        ]);

        if (!artisansResponse.ok || !categoriesResponse.ok) {
            throw new Error(`HTTP error! status: ${artisansResponse.status || categoriesResponse.status}`);
        }

        const [artisansData, categoriesData] = await Promise.all([
            artisansResponse.json(),
            categoriesResponse.json()
        ]);

        if (!artisansData.success || !categoriesData.success) {
            throw new Error('Formato risposta API non valido');
        }

        // Popola il select delle categorie
        const categorySelect = document.getElementById('filterCategory');
        if (!categorySelect) {
            throw new Error('Elemento select delle categorie non trovato');
        }

        categorySelect.innerHTML = '<option value="">Tutte le categorie</option>';
        categoriesData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.tipologia_id;
            option.textContent = category.nome_tipologia;
            categorySelect.appendChild(option);
        });

        // Crea mappa delle categorie per riferimento veloce
        const categoryMap = {};
        categoriesData.categories.forEach(cat => {
            categoryMap[cat.tipologia_id] = cat.nome_tipologia;
        });

        // Popola il select delle città
        const uniqueCities = [...new Set(artisansData.artisans
            .map(artisan => artisan.citta)
            .filter(Boolean))]
            .sort();

        const citySelect = document.getElementById('filterCity');
        if (!citySelect) {
            throw new Error('Elemento select delle città non trovato');
        }

        citySelect.innerHTML = '<option value="">Tutte le città</option>';
        uniqueCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });

        // Gestione filtri
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            const selectedCategory = categorySelect.value;
            const selectedCity = citySelect.value;

            const filteredArtisans = artisansData.artisans.filter(artisan => {
                const matchCategory = !selectedCategory || artisan.tipologia_id.toString() === selectedCategory;
                const matchCity = !selectedCity || artisan.citta === selectedCity;
                return matchCategory && matchCity;
            });

            updateArtisansDisplay(filteredArtisans, categoryMap);
        });

        // Visualizzazione iniziale
        updateArtisansDisplay(artisansData.artisans, categoryMap);

    } catch (error) {
        console.error('Error loading home page:', error);
        showErrorMessage(error.message);
    }
});

// Funzione per aggiornare la visualizzazione degli artigiani
function updateArtisansDisplay(artisans, categoryMap) {
    const container = document.getElementById('artisans-container');

    if (artisans.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center p-5">
                        <i class="bi bi-search mb-3" style="font-size: 2rem; color: var(--palette-primary);"></i>
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

    container.innerHTML = artisans.map(artisan => {
        let imageSource = '/assets/images/default/artisan-default.jpg';
        if (artisan.immagine) {
            imageSource = `data:image/jpeg;base64,${artisan.immagine}`;
        }

        return `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <img src="${imageSource}" 
                    class="card-img-top" 
                    alt="${artisan.nome} ${artisan.cognome}"
                    onerror="this.src='/assets/images/default/artisan-default.jpg'"
                    style="object-fit: cover; height: 200px;">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="card-title mb-0">${artisan.nome} ${artisan.cognome}</h5>
                        <p class="card-text mb-0">${artisan.citta || ''}</p>
                    </div>
                    <span class="card-category align-self-start">
                        ${categoryMap[artisan.tipologia_id] || 'Categoria non specificata'}
                    </span>
                    <div class="mt-auto d-flex justify-content-end">
                        <a href="/catalog.html?id=${artisan.id}" class="btn btn-outline-primary">Vedi catalogo</a>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}
