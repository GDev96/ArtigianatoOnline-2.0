//Recupera i dati dell'artigiano
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const artisanId = urlParams.get('id');

    if (!artisanId) {
        showError('ID artigiano non trovato');
        return;
    }
    
    try {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

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
            throw new Error('Invalid API response format');
        }

        const artisan = artisansData.artisans.find(a => a.id.toString() === artisanId);
        if (!artisan) {
            throw new Error('Artigiano non trovato');
        }

        const category = categoriesData.categories.find(c => c.tipologia_id === artisan.tipologia_id);
        const categoryName = category ? category.nome_tipologia : 'Categoria non specificata';

        // Update UI
        document.getElementById('artisan-name').textContent = `${artisan.nome} ${artisan.cognome}`;
        document.getElementById('artisan-category').textContent = categoryName;
        document.getElementById('artisan-address').textContent = 
            `${artisan.indirizzo || ''} - ${artisan.citta || ''}`;
        document.getElementById('artisan-contact').textContent = 
            `${artisan.email} - ${artisan.numero_telefono || 'Contatto telefonico non specificato'}`;

        // Update profile picture
        const profilePic = document.getElementById('profilePicture');
        if (artisan.immagine) {
            profilePic.src = `data:image/jpeg;base64,${artisan.immagine}`;
        }

        // Update rating
        if (artisan.valutazione_media) {
            updateAverageRating(artisan.valutazione_media, artisan.numero_recensioni);
        }

        // Load artisan's products
        await loadProducts(artisanId);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('artisan-category').textContent = 'Errore nel caricamento della categoria';
    }
});



// Add error handling utility function
function showError(message) {
    const container = document.querySelector('.container.my-5 .row');
    if (container) {
        container.innerHTML = `
            <div class="co-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
            </div>`;
    }
}



// Popola i prodotti dell'artigiano
async function loadProducts(artisanId) {
    try {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Add debug logging
        console.log('Fetching products for artisan:', artisanId);

        // Fetch products with proper error handling
        const productsResponse = await fetch('/products', {
            headers,
            method: 'GET'
        });

        // Log response status
        console.log('Products response status:', productsResponse.status);

        if (!productsResponse.ok) {
            const errorData = await productsResponse.json().catch(() => ({}));
            console.error('Server error response:', errorData);
            throw new Error(
                errorData.message || 
                `Errore nel caricamento dei prodotti (${productsResponse.status})`
            );
        }

        const productsData = await productsResponse.json();
        console.log('Products data received:', productsData);

        if (!productsData.success || !productsData.products) {
            throw new Error('Formato dati prodotti non valido');
        }

        // Filter products by artisan
        const artisanProducts = productsData.products.filter(product => 
            product.artigiano_id && product.artigiano_id.toString() === artisanId
        );

        console.log('Filtered products:', artisanProducts);

        if (artisanProducts.length === 0) {
            showError('Nessun prodotto disponibile per questo artigiano');
            return;
        }

        updateProductsDisplay(artisanProducts);

    } catch (error) {
        console.error('Errore nel caricamento prodotti:', error);
        showError(error.message || 'Si è verificato un errore nel caricamento dei prodotti');
    }
}

// Applicazione dei filtri sui prodotti
function applyFilters(products) {
    const selectedCategory = document.getElementById('filterCategory').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const minPrice = parseFloat(document.getElementById('rangeMin').value) || 0;
    const maxPrice = parseFloat(document.getElementById('rangeMax').value) || Infinity;
    const onlyAvailable = document.getElementById('onlyAvailabily').checked;

    return products.filter(product => {
        const matchSearch = !searchTerm || 
            product.nome_prodotto.toLowerCase().includes(searchTerm) || 
            (product.descrizione && product.descrizione.toLowerCase().includes(searchTerm));
        
        const matchCategory = !selectedCategory || 
            selectedCategory === 'placeholdercategory' || 
            product.tipologia_id.toString() === selectedCategory;

        const productPrice = parseFloat(product.prezzo);
        const matchPrice = (!minPrice || productPrice >= minPrice) && 
                         (!maxPrice || productPrice <= maxPrice);

        const matchAvailability = !onlyAvailable || product.quantita > 0;

        return matchCategory && matchSearch && matchPrice && matchAvailability;
    });
}

// Funzione per aggiornare la visualizzazione dei prodotti
function updateProductsDisplay(products) {
    const productsContainer = document.querySelector('.container.my-5 .row');
    
    if (!products || products.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-12">
                <div class="card text-center p-5">
                    <div class="card-body">
                        <h3 class="card-title text-muted">
                            <i class="fas fa-box-open mb-3 d-block" style="font-size: 3rem;"></i>
                            Nessun prodotto disponibile
                        </h3>
                        <p class="card-text text-muted">
                            Non sono stati trovati prodotti.
                        </p>
                    </div>
                </div>
            </div>`;
        return;
    }

    productsContainer.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card" data-product-id="${product.prodotto_id}">
                <img src="data:image/jpeg;base64,${product.immagine}" 
                    class="card-img-top" 
                    alt="${product.nome_prodotto}"
                    onerror="this.src='/assets/images/wallpaper3.jpg'">
                <div class="card-body">
                    <h5 class="card-title">${product.nome_prodotto}</h5>
                    <p class="card-text">${product.descrizione || ''}</p>
                    <p class="card-category">${product.nome_tipologia || 'Categoria non specificata'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="m-0 me-1">€${parseFloat(product.prezzo).toFixed(2)}</p>
                        ${product.quantita > 0 ? 
                            `<div class="d-flex">
                                <a class="btn guest-button" href="/login.html">
                                    <i class="fas fa-sign-in-alt"></i> Accedi
                                </a>
                                <div class="quantity-counter d-none user-button">
                                    <button class="btn" onclick="showQuantityInput(this)">
                                        <i class="fas fa-cart-plus"></i> Aggiungi
                                    </button>
                                    <div class="quantity-controls" style="display: none;">
                                        <input type="number" class="quantity-input" value="1" min="1" max="${product.quantita}">
                                        <button class="btn ms-2" onclick="updateCart(this)">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>` : 
                            `<span class="text-danger">Non disponibile</span>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Update button visibility based on authentication
    const user = JSON.parse(sessionStorage.getItem('user'));
    const guestButtons = document.querySelectorAll('.guest-button');
    const userButtons = document.querySelectorAll('.user-button');

    if (user) {
        guestButtons.forEach(btn => btn.classList.add('d-none'));
        userButtons.forEach(btn => btn.classList.remove('d-none'));
    }
}



// FIXME: Pulsante aggiunta prodotto al carrello
document.addEventListener('DOMContentLoaded', function() {
    // Controlla se l'utente è loggato
    const user = JSON.parse(localStorage.getItem('user'));
    const guestButtons = document.querySelectorAll('.guest-button');
    const userButtons = document.querySelectorAll('.user-button');

    if (user) {
        // Utente loggato: mostra i contatori
        guestButtons.forEach(btn => btn.classList.add('d-none'));
        userButtons.forEach(btn => btn.classList.remove('d-none'));
    } else {
        // Utente non loggato: mostra i pulsanti di login
        guestButtons.forEach(btn => btn.classList.remove('d-none'));
        userButtons.forEach(btn => btn.classList.add('d-none'));
    }
});

//FIXME
function addToCart(button) {
    const card = button.closest('.card');
    const product = {
        id: card.dataset.productId,
        name: card.querySelector('.card-title').textContent,
        price: card.querySelector('.product-price').textContent,
        quantity: parseInt(card.querySelector('.quantity-input').value)
    };

    // Recupera il carrello esistente o crea uno nuovo
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Controlla se il prodotto è già nel carrello
    const existingProduct = cart.find(item => item.id === product.id);
    if (existingProduct) {
        existingProduct.quantity += product.quantity;
    } else {
        cart.push(product);
    }

    // Salva il carrello aggiornato
    localStorage.setItem('cart', JSON.stringify(cart));

    // Feedback visivo
    alert('Prodotto aggiunto al carrello!');
}


// Nascondi i pulsanti di recensione e segnalazione se l'utente non è loggato
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const addReviewButton = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#addReviewModal"]');
    const reportButtons = document.querySelectorAll('.btn-outline-danger');
    const reportArtisanButton = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#reportArtisanModal"]');

    if (!user) {
        // Hide add review button
        if (addReviewButton) {
            addReviewButton.style.display = 'none';
        }
        
        // Hide report buttons
        reportButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        // Hide report artisan button
        if (reportArtisanButton) {
            reportArtisanButton.style.display = 'none';
        }
    }
});

// Update the review display function to conditionally show report buttons
function updateReviewsDisplay(reviews) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const reviewsContainer = document.querySelector('.container-review .row');
    
    reviewsContainer.innerHTML = reviews.map(review => `
        <div class="col-9 mb-4">
            <div class="card w-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h5 class="card-title">${review.cliente_nome} ${review.cliente_cognome}</h5>
                        ${user ? 
                            `<button class="btn btn-outline-danger btn-sm" onclick="openReviewReport(${review.recensione_id})">
                                <i class="fas fa-flag"></i>
                            </button>` : 
                            ''
                        }
                    </div>
                    <div class="stars mb-2 d-flex justify-content-between align-items-center">
                        ${generateStars(review.valutazione)}
                        <small class="text-muted ms-2">${new Date(review.data_recensione).toLocaleDateString()}</small>
                    </div>
                    <p class="card-text">${review.descrizione}</p>
                </div>
            </div>
        </div>
    `).join('');
}
// Popolare recensioni
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const artisanId = urlParams.get('id');

        if (!artisanId) {
            console.error('ID artigiano non trovato');
            return;
        }

        // Fetch delle recensioni
        const response = await fetch('/reviews', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error('Formato risposta API non valido');
        }

        // Filtra le recensioni per l'artigiano specifico
        const artisanReviews = data.reviews.filter(review => 
            review.artigiano_id && review.artigiano_id.toString() === artisanId
        );

        const reviewsContainer = document.querySelector('.container-review .row');
        if (!reviewsContainer) {
            throw new Error('Container recensioni non trovato');
        }

        if (artisanReviews.length === 0) {
            const user = JSON.parse(sessionStorage.getItem('user'));

            reviewsContainer.innerHTML = `
                <div class="col-9">
                    <div class="card text-center p-5">
                        <div class="card-body">
                            <h3 class="card-title text-muted">
                                <i class="far fa-comment-dots mb-3 d-block" style="font-size: 3rem;"></i>
                                Nessuna recensione disponibile
                            </h3>
                            <p class="card-text text-muted">
                                Questo artigiano non ha ancora ricevuto recensioni.
                            </p>
                            ${user ? 
                                `<button class="btn btn-brown mt-3" data-bs-toggle="modal" data-bs-target="#addReviewModal">
                                    <i class="fas fa-star me-2"></i>Scrivi la prima recensione
                                </button>` :
                                `<a href="/login.html" class="btn btn-brown mt-3">
                                    <i class="fas fa-sign-in-alt me-2"></i>Accedi per recensire
                                </a>`
                            }
                        </div>
                    </div>
                </div>`;
            
            updateAverageRating(0, 0);
            return;
        }

        // Calcola la valutazione media
        const averageRating = artisanReviews.reduce((acc, review) => acc + parseFloat(review.valutazione), 0) / artisanReviews.length;
        
        // Aggiorna la sezione della valutazione media
        updateAverageRating(averageRating, artisanReviews.length);

        // Popola le recensioni
        reviewsContainer.innerHTML = artisanReviews.map(review => `
            <div class="col-9 mb-4">
                <div class="card w-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title">${review.cliente_nome} ${review.cliente_cognome}</h5>
                            <button class="btn btn-outline-danger btn-sm" onclick="openReviewReport(${review.recensione_id})">
                                <i class="fas fa-flag"></i>
                            </button>
                        </div>
                        <div class="stars mb-2 d-flex justify-content-between align-items-center">
                            ${generateStars(review.valutazione)}
                            <small class="text-muted ms-2">${new Date(review.data_recensione).toLocaleDateString()}</small>
                        </div>
                        <p class="card-text">${review.descrizione}</p>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Errore nel caricamento recensioni:', error);
        const reviewsContainer = document.querySelector('.container-review .row');
        if (reviewsContainer) {
            reviewsContainer.innerHTML = `
                <div class="col-9 mb-4">
                    <div class="alert alert-danger" role="alert">
                        Si è verificato un errore nel caricamento delle recensioni. 
                        <br>Dettaglio: ${error.message}
                    </div>
                </div>`;
        }
    }
});

// Funzione per generare le stelle della valutazione
function generateStars(rating) {
    return Array(5).fill(0).map((_, index) => 
        `<i class="fa${index < Math.round(parseFloat(rating)) ? 's' : 'r'} fa-star" aria-hidden="true"></i>`
    ).join('');
}

// Funzione per aggiornare la valutazione media nella header
function updateAverageRating(averageRating, totalReviews) {
    const ratingSection = document.querySelector('.rating');
    if (ratingSection) {
        const rating = parseFloat(averageRating) || 0;
        const reviews = parseInt(totalReviews) || 0;
        const stars = generateStars(rating);
        
        ratingSection.innerHTML = `
            <div class="heading">Valutazione media</div>
            <div class="stars">
                ${stars}
            </div>
            <p>${rating.toFixed(1)} su 5 basato su ${reviews} ${reviews === 1 ? 'recensione' : 'recensioni'}.</p>
        `;
    }
}

// Aggiungere nuova recensione al db
function submitReview() {
    const rating = document.getElementById('ratingValue').value;
    const reviewText = document.getElementById('reviewText').value;
    const urlParams = new URLSearchParams(window.location.search);
    const artisanId = urlParams.get('id');
    const user = JSON.parse(sessionStorage.getItem('user'));

    if (!user) {
        alert('Devi essere loggato per lasciare una recensione');
        return;
    }
    if (!rating) {
        alert('Per favore seleziona una valutazione');
        return;
    }
    if (!reviewText.trim()) {
        alert('Per favore scrivi una recensione');
        return;
    }

    // Prepara i dati della recensione
    const reviewData = {
        cliente_id: user.id,
        artigiano_id: parseInt(artisanId),
        valutazione: parseInt(rating),
        descrizione: reviewText
    };

    // Invia la recensione al server
    fetch('/reviews', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(reviewData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Errore nel salvataggio della recensione');
        }
        return response.json();
    })
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Errore nel salvataggio della recensione');
        }

        // Chiudi il modale
        const modal = bootstrap.Modal.getInstance(document.getElementById('addReviewModal'));
        modal.hide();

        // Reset form
        document.getElementById('reviewForm').reset();
        document.getElementById('ratingValue').value = '';
        const ratingStars = document.querySelectorAll('.rating-input .fa-star');
        ratingStars.forEach(star => {
            star.classList.remove('fas', 'hover');
            star.classList.add('far');
        });

        // Ricarica le recensioni
        location.reload();
    })
    .catch(error => {
        console.error('Errore:', error);
        alert('Si è verificato un errore nel salvataggio della recensione');
    });
}



// FIXME Segnalazione recensione
function openReviewReport(reviewId) {
    document.getElementById('reportedReviewId').value = reviewId;
    const modal = new bootstrap.Modal(document.getElementById('reportReviewModal'));
    modal.show();
}


async function submitArtisanReport() {
    const reason = document.getElementById('reportArtisanReason').value;
    const description = document.getElementById('reportArtisanDescription').value;
    const urlParams = new URLSearchParams(window.location.search);
    const artisanId = urlParams.get('id');

    if (!reason || !description) {
        alert('Per favore compila tutti i campi');
        return;
    }

    try {
        const response = await fetch('/api/reports/artisan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                artisan_id: artisanId,
                reason: reason,
                description: description
            })
        });

        if (!response.ok) throw new Error('Errore nell\'invio della segnalazione');

        const modal = bootstrap.Modal.getInstance(document.getElementById('reportArtisanModal'));
        modal.hide();
        alert('Segnalazione inviata con successo');
        document.getElementById('reportArtisanForm').reset();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nell\'invio della segnalazione');
    }
}

async function submitReviewReport() {
    const reviewId = document.getElementById('reportedReviewId').value;
    const reason = document.getElementById('reportReviewReason').value;
    const description = document.getElementById('reportReviewDescription').value;

    if (!reason || !description) {
        alert('Per favore compila tutti i campi');
        return;
    }

    try {
        const response = await fetch('/api/reports/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                review_id: reviewId,
                reason: reason,
                description: description
            })
        });

        if (!response.ok) throw new Error('Errore nell\'invio della segnalazione');

        const modal = bootstrap.Modal.getInstance(document.getElementById('reportReviewModal'));
        modal.hide();
        alert('Segnalazione inviata con successo');
        document.getElementById('reportReviewForm').reset();

    } catch (error) {
        console.error('Error:', error);
        alert('Errore nell\'invio della segnalazione');
    }
}