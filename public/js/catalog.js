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

async function updateProductsDisplay(products) {
    const productsContainer = document.querySelector('.container.my-5 .row');
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (!productsContainer) return;

    // Fetch current cart items for the user if logged in
    let cartItems = [];
    if (user) {
        try {
            const response = await fetch('/cart', {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                cartItems = data.items || [];
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        }
    }

    productsContainer.innerHTML = products.map(product => {
        const cartItem = cartItems.find(item => item.prodotto_id === product.prodotto_id);
        const quantity = cartItem ? cartItem.quantita : 0;

        return `
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
                                            quantity === 0 ?
                                            `<button class="btn btn-primary add-to-cart" 
                                                onclick="addToCart(${product.prodotto_id})">
                                                <i class="fas fa-cart-plus"></i> Aggiungi
                                            </button>` :
                                            `<div class="input-group cart-quantity-group">
                                                <button class="btn btn-outline-primary" 
                                                    onclick="updateCartQuantity(${product.prodotto_id}, ${quantity - 1})">
                                                    <i class="fas fa-minus"></i>
                                                </button>
                                                <span class="input-group-text">${quantity}</span>
                                                <button class="btn btn-outline-primary" 
                                                    onclick="updateCartQuantity(${product.prodotto_id}, ${quantity + 1}, ${product.quantita})">
                                                    <i class="fas fa-plus"></i>
                                                </button>
                                            </div>`
                                        }
                                    </div>` : 
                                    `<span class="badge bg-danger">Non disponibile</span>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function addToCart(productId) {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('Utente non autenticato');
        }

        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                prodotto_id: productId,
                quantita: 1
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nell\'aggiunta al carrello');
        }

        const cartResponse = await fetch('/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!cartResponse.ok) {
            throw new Error('Errore nel recupero del carrello');
        }

        const cartData = await cartResponse.json();
        
        if (!cartData.success) {
            throw new Error(cartData.message || 'Errore nel recupero del carrello');
        }

        const cartItem = cartData.items.find(item => item.prodotto_id === productId);
        
        // Update UI
        const addButton = document.querySelector(`button[onclick="addToCart(${productId})"]`);
        if (addButton && cartItem) {
            const btnGroup = addButton.closest('.btn-group');
            if (btnGroup) {
                btnGroup.innerHTML = `
                    <div class="input-group cart-quantity-group">
                        <button class="btn btn-outline-primary" 
                            onclick="updateCartQuantity(${productId}, ${cartItem.quantita - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="input-group-text">${cartItem.quantita}</span>
                        <button class="btn btn-outline-primary" 
                            onclick="updateCartQuantity(${productId}, ${cartItem.quantita + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>`;
            }
        }

        showSuccessMessage('Prodotto aggiunto al carrello');

    } catch (error) {
        console.error('Error adding to cart:', error);
        showErrorMessage(error.message);
    }
}

async function updateCartQuantity(productId, newQuantity, maxQuantity) {
    if (newQuantity < 0) return;
    if (maxQuantity && newQuantity > maxQuantity) {
        showErrorMessage('Quantità non disponibile');
        return;
    }

    try {
        if (newQuantity === 0) {
            // Remove from cart
            await fetch(`/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });
        } else {
            // Update quantity
            await fetch('/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    prodotto_id: productId,
                    quantita: newQuantity
                })
            });
        }

        // Refresh the products display
        await loadProducts(new URLSearchParams(window.location.search).get('id'));

    } catch (error) {
        console.error('Error updating cart:', error);
        showErrorMessage(error.message);
    }
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
            //TODO: aggiungi pulsante per modificare ed per eliminare recensione se l'id dell'utente loggato corrisponde a quello dell'utente che ha scritto la recensione
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



//Funzioni per segnalazioni - funzionano tutti
function openReviewReport(reviewId) {
    document.getElementById('reportedReviewId').value = reviewId;
    const modal = new bootstrap.Modal(document.getElementById('reportReviewModal'));
    modal.show();
}

async function submitArtisanReport() {
    try {
        const reason = document.getElementById('reportArtisanReason').value;
        const description = document.getElementById('reportArtisanDescription').value;
        const urlParams = new URLSearchParams(window.location.search);
        const artisanId = urlParams.get('id');
        const token = sessionStorage.getItem('token');

        if (!token) {
            throw new Error('Devi essere loggato per inviare una segnalazione');
        }

        if (!reason || !description) {
            throw new Error('Per favore compila tutti i campi');
        }

        const response = await fetch('/reports/artisan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                artisan_id: artisanId,
                reason: reason,
                description: description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nell\'invio della segnalazione');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportArtisanModal'));
        modal.hide();

        // Reset form
        document.getElementById('reportArtisanForm').reset();

        // Show success message
        showSuccessMessage('Segnalazione inviata con successo');

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message);
    }
}

async function submitReviewReport() {
    try {
        const reviewId = document.getElementById('reportedReviewId').value;
        const reason = document.getElementById('reportReviewReason').value;
        const description = document.getElementById('reportReviewDescription').value;
        const token = sessionStorage.getItem('token');

        if (!token) {
            throw new Error('Devi essere loggato per inviare una segnalazione');
        }

        if (!reason || !description) {
            throw new Error('Per favore compila tutti i campi');
        }

        const response = await fetch('/reports/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                review_id: reviewId,
                reason: reason,
                description: description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nell\'invio della segnalazione');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportReviewModal'));
        modal.hide();

        // Reset form
        document.getElementById('reportReviewForm').reset();

        // Show success message
        showSuccessMessage('Segnalazione inviata con successo');

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message);
    }
}


// Messaggi di successo e errore
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
