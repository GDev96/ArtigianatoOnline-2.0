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



async function loadProducts(artisanId) {
    try {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        console.log('Fetching products for artisan:', artisanId);

        const response = await fetch('/products', { 
            headers,
            method: 'GET'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error details:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Products data received:', data);
        
        if (!data.success || !data.products) {
            throw new Error('Formato dati prodotti non valido');
        }

        // Filter products by artisan ID
        const artisanProducts = data.products.filter(product => 
            product.artigiano_id && product.artigiano_id.toString() === artisanId
        );

        if (artisanProducts.length === 0) {
            const container = document.querySelector('.container.my-5 .row');
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="card text-center p-5">
                            <div class="card-body">
                                <h3 class="card-title text-muted">
                                    <i class="fas fa-box-open mb-3 d-block" style="font-size: 3rem;"></i>
                                    Nessun prodotto disponibile
                                </h3>
                                <p class="card-text text-muted">
                                    Questo artigiano non ha ancora inserito prodotti.
                                </p>
                            </div>
                        </div>
                    </div>`;
            }
            return;
        }

        // Update display with fetched products
        updateProductsDisplay(artisanProducts);

    } catch (error) {
        console.error('Errore nel caricamento prodotti:', error);
        showError(error.message || 'Si è verificato un errore nel caricamento dei prodotti');
    }
}

function updateProductsDisplay(products) {
    const productsContainer = document.querySelector('.container.my-5 .row');
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (!productsContainer) return;

    productsContainer.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card h-60">
                <img src="${product.immagine ? `data:image/jpeg;base64,${product.immagine}` : '/assets/images/wallpaper3.jpg'}" 
                    class="card-img-top" 
                    alt="${product.nome_prodotto}"
                    style="height: 200px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.nome_prodotto}</h5>
                    <div class="mt-auto">
                        <p class="card-category text-muted mb-2">
                            <small>${product.nome_tipologia || 'Categoria non specificata'}</small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">€${parseFloat(product.prezzo).toFixed(2)}</h5>
                            ${product.quantita > 0 ? 
                                `<div class="btn-group">
                                    ${!user ? 
                                        `<a href="/login.html" class="btn btn-outline-primary">
                                            <i class="fas fa-sign-in-alt"></i> Accedi
                                        </a>` :
                                        `<button class="btn btn-primary add-to-cart" 
                                            data-product-id="${product.prodotto_id}"
                                            data-max-quantity="${product.quantita}">
                                            <i class="fas fa-cart-plus"></i> Aggiungi
                                        </button>`
                                    }
                                </div>` : 
                                `<span class="badge bg-danger">Non disponibile</span>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners for add to cart buttons
    if (user) {
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.productId;
                const maxQuantity = parseInt(e.target.closest('button').dataset.maxQuantity);
                showQuantitySelector(productId, maxQuantity);
            });
        });
    }
}

function showQuantitySelector(productId, maxQuantity) {
    const modalHtml = `
        <div class="modal fade" id="quantityModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Seleziona quantità</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="number" class="form-control" id="quantityInput" 
                            min="1" max="${maxQuantity}" value="1">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                        <button type="button" class="btn btn-primary" onclick="addToCart(${productId})">
                            Aggiungi al carrello
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('quantityModal'));
    modal.show();

    // Clean up modal after hiding
    document.getElementById('quantityModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
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


// Nascondi i pulsanti di recensione e segnalazione se l'utente non è loggato - corretta
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

// Popola le recensioni - corretta
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
                <div class="card bg-light w-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title">${review.cliente_nome} ${review.cliente_cognome}</h5>
                            <button class="btn btn-outline-danger btn-sm" onclick="openReviewReport(${review.recensione_id})">
                                <i class="fas fa-flag"></i>
                            </button>
                        </div>
                        <div class="stars mb-2 d-flex align-items-center">
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
async function submitReview() {
    try {
        const rating = document.getElementById('ratingValue').value;
        const reviewText = document.getElementById('reviewText').value;
        const urlParams = new URLSearchParams(window.location.search);
        const artisanId = urlParams.get('id');
        const user = JSON.parse(sessionStorage.getItem('user'));
        const token = sessionStorage.getItem('token');

        // Validazione input e controllo autenticazione
        if (!user || !token) {
            throw new Error('Devi essere loggato per lasciare una recensione');
        }
        if (!rating) {
            throw new Error('Per favore seleziona una valutazione');
        }
        if (!reviewText.trim()) {
            throw new Error('Per favore scrivi una recensione');
        }
        if (!artisanId) {
            throw new Error('ID artigiano non valido');
        }

        // Prepara i dati della recensione
        const reviewData = {
            artigiano_id: parseInt(artisanId),
            valutazione: parseInt(rating),
            descrizione: reviewText.trim()
        };

        // Invia la recensione al server
        const response = await fetch('/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nel salvataggio della recensione');
        }

        // Chiudi il modale
        const reviewModal = document.getElementById('addReviewModal');
        const modalInstance = bootstrap.Modal.getInstance(reviewModal);
        modalInstance.hide();

        // Reset form
        resetReviewForm();

        // Mostra messaggio di successo
        showSuccessMessage('Recensione pubblicata con successo!');

        // Ricarica la pagina dopo un breve delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Errore nella sottomissione della recensione:', error);
        showErrorMessage(error.message);
    }
}

function resetReviewForm() {
    const form = document.getElementById('reviewForm');
    if (form) {
        form.reset();
        document.getElementById('ratingValue').value = '';
        
        // Reset stars
        const stars = document.querySelectorAll('.rating-input .fa-star');
        stars.forEach(star => {
            star.classList.remove('fas');
            star.classList.add('far');
        });
    }
}

// Utility function per mostrare messaggi di successo
function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.style.zIndex = '1050';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);

    // Rimuovi automaticamente dopo 3 secondi
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Gestione delle stelle per la valutazione
document.addEventListener('DOMContentLoaded', function() {
    const ratingStars = document.querySelectorAll('.rating-input .fa-star');
    const ratingValue = document.getElementById('ratingValue');

    // Gestione hover
    ratingStars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = this.dataset.rating;
            highlightStars(rating);
        });

        star.addEventListener('mouseout', function() {
            const currentRating = ratingValue.value;
            highlightStars(currentRating);
        });

        // Gestione click
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            ratingValue.value = rating;
            highlightStars(rating);
        });
    });

    // Funzione per evidenziare le stelle
    function highlightStars(rating) {
        ratingStars.forEach(star => {
            const starRating = star.dataset.rating;
            if (starRating <= rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }
});

// Aggiorna anche la funzione resetReviewForm esistente
function resetReviewForm() {
    document.getElementById('reviewForm').reset();
    document.getElementById('ratingValue').value = '';
    
    // Reset stelle
    const ratingStars = document.querySelectorAll('.rating-input .fa-star');
    ratingStars.forEach(star => {
        star.classList.remove('fas');
        star.classList.add('far');
    });
}

function resetReviewForm() {
    // Reset form
    document.getElementById('reviewForm').reset();
    document.getElementById('ratingValue').value = '';
    
    // Reset stars
    const ratingStars = document.querySelectorAll('.rating-input .fa-star');
    ratingStars.forEach(star => {
        star.classList.remove('fas', 'hover');
        star.classList.add('far');
    });
}

function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);

    // Auto remove after 3 seconds
    setTimeout(() => alertDiv.remove(), 3000);
}

function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => alertDiv.remove(), 5000);
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