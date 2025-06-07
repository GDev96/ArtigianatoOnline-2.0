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

        // Recupera gli artigiani attivi
        const response = await fetch('/users/artisans', { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (!data.success || !data.artisans) {
            throw new Error('Formato risposta artigiani non valido');
        }

        // Filtra le categorie solo degli artigiani attivi
        const uniqueCategories = [...new Set(data.artisans.map(artisan => ({
            tipologia_id: artisan.tipologia_id,
            nome_tipologia: artisan.nome_tipologia
        })))].filter(cat => cat.tipologia_id && cat.nome_tipologia)
        .sort((a, b) => a.nome_tipologia.localeCompare(b.nome_tipologia));

        // Popola il filtro delle categorie
        const categorySelect = document.getElementById('filterCategory');
        if (!categorySelect) {
            throw new Error('Elemento select delle categorie non trovato');
        }

        categorySelect.innerHTML = '<option value="">Tutte le categorie</option>';
        uniqueCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.tipologia_id;
            option.textContent = category.nome_tipologia;
            categorySelect.appendChild(option);
        });

        const categoryMap = {};
        uniqueCategories.forEach(cat => {
            categoryMap[cat.tipologia_id] = cat.nome_tipologia;
        });

        // Popula il filtro delle città
        const uniqueCities = [...new Set(data.artisans.map(artisan => artisan.citta))]
            .filter(Boolean)
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

        // Applica i filtri
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

        // Inizializza la visualizzazione degli artigiani
        updateArtisansDisplay(data.artisans, categoryMap);

    } catch (error) {
        console.error('Error loading home page:', error);
        showErrorMessage(error);
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
        // Convert binary data to base64 if needed
        let imageSource = '/assets/images/default/artisan-default.jpg';
        if (artisan.immagine) {
            // Check if immagine is already base64
            if (typeof artisan.immagine === 'string') {
                imageSource = `data:image/jpeg;base64,${artisan.immagine}`;
            } else {
                // Convert binary data to base64
                const uint8Array = new Uint8Array(artisan.immagine.data);
                const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                const base64String = btoa(binaryString);
                imageSource = `data:image/jpeg;base64,${base64String}`;
            }
        }

        return `
        <div class="col-md-4 mb-4">
            <div class="card">
                <img src="${imageSource}" 
                    class="card-img-top" 
                    alt="${artisan.username}"
                    onerror="this.src='/assets/images/default/artisan-default.jpg'"
                    style="object-fit: cover; height: 200px;">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="card-title">${artisan.nome} ${artisan.cognome}</h5>
                        <p class="card-text mb-2">${artisan.citta || ''} </p>
                    </div>
                    <p class="card-category">${categoryMap[artisan.tipologia_id] || 'Categoria non specificata'}</p>
                    <div class="d-flex justify-content-end">
                        <a href="/catalog.html?id=${artisan.id}" class="btn">Vedi catalogo</a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}