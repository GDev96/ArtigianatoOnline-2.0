//Recupera i dati dell'artigiano
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const artisanId = urlParams.get('id');

    if (!artisanId) {
        showErrorMessage('ID artigiano non trovato');
        return;
    }
    
    try {
        // Get artisan details
        const response = await fetch(`/users/api/artisan/${artisanId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success || !data.artisan) {
            throw new Error('Formato risposta API non valido');
        }

        const artisan = data.artisan;

        // Update UI with artisan info
        document.getElementById('artisan-name').textContent = `${artisan.nome} ${artisan.cognome}`;
        document.getElementById('artisan-category').textContent = artisan.nome_tipologia || 'Categoria non specificata';
        document.getElementById('artisan-address').textContent = 
            `${artisan.indirizzo || ''} - ${artisan.citta || ''}`;
        document.getElementById('artisan-contact').textContent = 
            `${artisan.email} - ${artisan.numero_telefono || 'Contatto telefonico non specificato'}`;

        // Update profile picture
        const profilePic = document.getElementById('profilePicture');
        if (artisan.immagine) {
            profilePic.src = `data:image/jpeg;base64,${artisan.immagine}`;
        }

        // Load artisan's products
        await setupFilters();
        await loadProducts(artisanId);

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Errore nel caricamento dei dati dell\'artigiano');
    }
});

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



/** SEZIONE PRODOTTI */
// Funzione per caricare i prodotti dell'artigiano
let allProducts = [];
async function loadProducts(artisanId) {
    try {
        const token = sessionStorage.getItem('token');
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const productsResponse = await fetch(`/products/artisan/${artisanId}`);
        let cartData = null;

        if (token) {
            const cartResponse = await fetch('/cart', { 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (cartResponse.ok) {
                const cartResult = await cartResponse.json();
                if (cartResult.success) {
                    cartData = cartResult.items;
                }
            }
        }

        if (!productsResponse.ok) {
            throw new Error(`HTTP error! status: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();
        if (!productsData.success) {
            throw new Error('Formato dati prodotti non valido');
        }

        // Merge cart quantities with products
        allProducts = productsData.products.map(product => ({
            ...product,
            cart_quantity: cartData?.find(item => 
                item.prodotto_id === product.prodotto_id
            )?.quantita || 0
        }));

        updateProductsDisplay(allProducts);

    } catch (error) {
        console.error('Errore nel caricamento prodotti:', error);
        showErrorMessage(error.message);
    }
}

// Update product display function
function updateProductsDisplay(products) {
    const productsContainer = document.querySelector('.container.my-5 .row');
    if (!productsContainer) return;

    const user = JSON.parse(sessionStorage.getItem('user'));
    const isLoggedIn = !!sessionStorage.getItem('token');
    const isArtisanOrAdmin = user && (user.ruolo_id === 2 || user.ruolo_id === 3);

    if (products.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-bg-light body text-center p-5">
                        <i class="bi bi-search mb-3" style="font-size: 2rem; color: var(--palette-primary);"></i>
                        <h5 class="card-title">Nessun prodotto trovato</h5>
                        <p class="card-text text-muted">
                            Non ci sono prodotti disponibili al momento.
                            <br>Riprova più tardi o contatta l'artigiano.
                        </p>
                    </div>
                </div>
            </div>`;
        return;
    }


    productsContainer.innerHTML = products.map(product => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <img src="${product.immagine ? `data:image/jpeg;base64,${product.immagine}` : '/assets/images/default/product.jpg'}" 
                    class="card-img-top" 
                    alt="${product.nome_prodotto}"
                    style="height: 200px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="card-title mb-0">${product.nome_prodotto}</h5>
                        <h5 class="mb-0">€${parseFloat(product.prezzo).toFixed(2)}</h5>
                    </div>
                    <span class="card-category align-self-start">
                        ${product.nome_tipologia || 'Categoria non specificata'}
                    </span>
                    ${!isArtisanOrAdmin && !isLoggedIn ? 
                        `<div class="mt-auto d-flex justify-content-end">
                            <a href="/login.html" class="btn btn-outline-primary">
                                <i class="fas fa-sign-in-alt"></i> Accedi
                            </a>
                        </div>` :
                        !isArtisanOrAdmin && product.quantita > 0 ?
                        `<div class="mt-auto d-flex justify-content-end" id="product-${product.prodotto_id}-controls">
                            ${product.cart_quantity ? 
                                `<div class="quantity-controls">
                                    <button class="btn btn-outline-primary btn-sm" onclick="updateCartQuantity(${product.prodotto_id}, ${product.cart_quantity - 1}, ${product.quantita})">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <span class="fw-bold">${product.cart_quantity}</span>
                                    <button class="btn btn-outline-primary btn-sm" onclick="updateCartQuantity(${product.prodotto_id}, ${product.cart_quantity + 1}, ${product.quantita})">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>` :
                                `<button class="btn btn-primary" onclick="addToCart(${product.prodotto_id})">
                                    <i class="fas fa-cart-plus"></i> Aggiungi
                                </button>`
                            }
                        </div>` :
                        !isArtisanOrAdmin ?
                        `<div class="mt-auto d-flex justify-content-end">
                            <span class="badge bg-danger">Non disponibile</span>
                        </div>` :
                        ''
                    }
                </div>
            </div>
        </div>`
    ).join('');
}

// Update cart functions
async function addToCart(productId) {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
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

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore nell\'aggiunta al carrello');
        }

        // Reload products to update quantities
        const artisanId = new URLSearchParams(window.location.search).get('id');
        await loadProducts(artisanId);

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage(error.message);
    }
}

// Update filter setup function
async function setupFilters() {
    try {
        const response = await fetch('/categories', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero delle categorie');
        }

        const data = await response.json();
        
        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory && data.categories) {
            filterCategory.innerHTML = `
                <option value="">Tutte le categorie</option>
                ${data.categories.map(category => `
                    <option value="${category.tipologia_id}">
                        ${category.nome_tipologia}
                    </option>
                `).join('')}
            `;
        }

        // Setup price filters
        const priceInputs = ['rangeMin', 'rangeMax'].map(id => 
            document.getElementById(id)
        ).filter(Boolean);

        priceInputs.forEach(input => {
            input.addEventListener('input', function() {
                const value = parseFloat(this.value);
                if (isNaN(value) || value < 0) {
                    this.value = 0;
                }
            });
        });

        // Setup filter button
        document.getElementById('applyFilters')?.addEventListener('click', applyFilters);

    } catch (error) {
        console.error('Error setting up filters:', error);
        showErrorMessage('Errore nel caricamento delle categorie');
    }
}

// Update filter application function
function applyFilters() {
    if (!allProducts.length) return;

    let filteredProducts = [...allProducts];

    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    const selectedCategory = document.getElementById('filterCategory')?.value;
    const minPrice = parseFloat(document.getElementById('rangeMin')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('rangeMax')?.value) || Infinity;
    const onlyAvailable = document.getElementById('onlyAvailabily')?.checked;

    // Apply filters
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.nome_prodotto.toLowerCase().includes(searchTerm)
        );
    }

    if (selectedCategory) {
        filteredProducts = filteredProducts.filter(product => 
            product.tipologia_id.toString() === selectedCategory
        );
    }

    filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.prezzo);
        return price >= minPrice && (maxPrice === Infinity || price <= maxPrice);
    });

    if (onlyAvailable) {
        filteredProducts = filteredProducts.filter(product => product.quantita > 0);
    }

    updateProductsDisplay(filteredProducts);
}

// Funzione per aggiornare la quantità del prodotto nel carrello
async function updateCartQuantity(productId, newQuantity, maxQuantity) {
    if (newQuantity < 0) return;
    if (maxQuantity && newQuantity > maxQuantity) {
        showErrorMessage('Quantità non disponibile');
        return;
    }

    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        if (newQuantity === 0) {
            await removeFromCart(productId);
        } else {
            const response = await fetch('/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prodotto_id: productId,
                    quantita: newQuantity
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Errore nell\'aggiornamento della quantità');
            }
        }

        // Refresh the products display
        await loadProducts(new URLSearchParams(window.location.search).get('id'));

    } catch (error) {
        console.error('Error updating cart:', error);
        showErrorMessage(error.message);
    }
}



/** SEZIONE RECENSIONI */
// Add event listener for review form submission
document.addEventListener('DOMContentLoaded', function() {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitReview();
        });
    }

    // Setup rating stars for both add and edit modals
    setupRatingStars('#addReviewModal');
    setupRatingStars('#editReviewModal');
});

// Update the stars setup function
function setupRatingStars(modalId) {
    const ratingStars = document.querySelectorAll(`${modalId} .rating-input .fa-star`);
    const ratingValue = document.querySelector(`${modalId} #ratingValue`);

    if (!ratingStars.length || !ratingValue) return;

    ratingStars.forEach(star => {
        star.addEventListener('mouseover', function() {
            highlightStars(this.dataset.rating, ratingStars);
        });

        star.addEventListener('mouseout', function() {
            highlightStars(ratingValue.value, ratingStars);
        });

        star.addEventListener('click', function() {
            ratingValue.value = this.dataset.rating;
            highlightStars(this.dataset.rating, ratingStars);
        });
    });
}

// Update the review submission function
async function submitReview() {
    try {
        const rating = document.getElementById('ratingValue').value;
        const reviewText = document.getElementById('reviewText').value;
        const urlParams = new URLSearchParams(window.location.search);
        const artisanId = urlParams.get('id');
        const token = sessionStorage.getItem('token');

        // Validation
        if (!token) {
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

        const response = await fetch('/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                artigiano_id: parseInt(artisanId),
                valutazione: parseInt(rating),
                descrizione: reviewText.trim()
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore nel salvataggio della recensione');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addReviewModal'));
        modal.hide();
        resetReviewForm();

        showSuccessMessage('Recensione pubblicata con successo!');
        setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
        console.error('Error submitting review:', error);
        showErrorMessage(error.message);
    }
}

// Update the review edit function
async function editReview(reviewId) {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('Devi essere loggato per modificare una recensione');
        }

        const response = await fetch(`/reviews/${reviewId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore nel recupero della recensione');
        }

        // Populate edit modal
        document.getElementById('editReviewId').value = reviewId;
        document.getElementById('editReviewText').value = data.review.descrizione;
        document.getElementById('editRatingValue').value = data.review.valutazione;

        // Update stars
        const ratingStars = document.querySelectorAll('#editReviewModal .rating-input .fa-star');
        highlightStars(data.review.valutazione, ratingStars);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
        modal.show();

    } catch (error) {
        console.error('Error fetching review:', error);
        showErrorMessage(error.message);
    }
}

// Update the review update function
async function updateReview() {
    try {
        const reviewId = document.getElementById('editReviewId').value;
        const rating = document.getElementById('editRatingValue').value;
        const reviewText = document.getElementById('editReviewText').value;
        const token = sessionStorage.getItem('token');

        // Validation
        if (!token) {
            throw new Error('Devi essere loggato per modificare una recensione');
        }
        if (!rating) {
            throw new Error('Per favore seleziona una valutazione');
        }
        if (!reviewText.trim()) {
            throw new Error('Per favore scrivi una recensione');
        }

        const response = await fetch(`/reviews/${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                valutazione: parseInt(rating),
                descrizione: reviewText.trim()
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore durante la modifica della recensione');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
        modal.hide();

        showSuccessMessage('Recensione modificata con successo');
        setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
        console.error('Error updating review:', error);
        showErrorMessage(error.message);
    }
}

// Helper functions remain mostly the same
function highlightStars(rating, stars) {
    stars.forEach(star => {
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

function resetReviewForm() {
    const form = document.getElementById('reviewForm');
    const ratingValue = document.getElementById('ratingValue');
    const ratingStars = document.querySelectorAll('#addReviewModal .rating-input .fa-star');

    if (form) form.reset();
    if (ratingValue) ratingValue.value = '';
    
    ratingStars.forEach(star => {
        star.classList.remove('fas');
        star.classList.add('far');
    });
}




/** SEGNALAZIONI */
//Funzioni per segnalazioni
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

        // Updated API endpoint and request structure
        const response = await fetch('/reports/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                review_id: parseInt(reviewId),
                reason: reason,
                description: description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nell\'invio della segnalazione');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportReviewModal'));
        modal.hide();
        document.getElementById('reportReviewForm').reset();

        // Show success message
        showSuccessMessage('Segnalazione inviata con successo');

    } catch (error) {
        console.error('Error submitting review report:', error);
        showErrorMessage(error.message);
    }
}
