//Recupera i dati dell'artigiano
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const artisanId = urlParams.get('id');

    if (!artisanId) {
        showErrorMessage('ID artigiano non trovato');
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
        await setupFilters();
        await loadProducts(artisanId);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('artisan-category').textContent = 'Errore nel caricamento della categoria';
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
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const response = await fetch('/products', { headers });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.products) {
            throw new Error('Formato dati prodotti non valido');
        }

        // Store all products for the artisan globally
        allProducts = data.products.filter(product => 
            product.artigiano_id && product.artigiano_id.toString() === artisanId
        );

        // Initial display of all products
        updateProductsDisplay(allProducts);

    } catch (error) {
        console.error('Errore nel caricamento prodotti:', error);
        showErrorMessage(error.message);
    }
}

// Funzione per applicare i filtri sui prodotti
async function setupFilters() {
    try {
        // Fetch categories
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
        
        // Populate category select
        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory && data.categories) {
            filterCategory.innerHTML = `
                <option value="placeholdercategory">Tutte le categorie</option>
                ${data.categories.map(category => `
                    <option value="${category.tipologia_id}">
                        ${category.nome_tipologia}
                    </option>
                `).join('')}
            `;
        }

        // Add event listener only for price input validation
        const priceInputs = [
            document.getElementById('rangeMin'),
            document.getElementById('rangeMax')
        ];

        priceInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', function() {
                    let value = parseFloat(this.value);
                    if (isNaN(value) || value < 0) {
                        this.value = 0;
                    }
                });
            }
        });

        // Add event listener for apply filters button
        document.getElementById('applyFilters')?.addEventListener('click', applyFilters);

    } catch (error) {
        console.error('Error setting up filters:', error);
        showErrorMessage('Errore nel caricamento delle categorie');
    }
}

// Funzione per applicare i filtri sui prodotti
function applyFilters() {
    if (!allProducts.length) return;

    let filteredProducts = [...allProducts];

    // Get filter values
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    const selectedCategory = document.getElementById('filterCategory')?.value;
    const minPrice = parseFloat(document.getElementById('rangeMin')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('rangeMax')?.value) || Infinity;
    const onlyAvailable = document.getElementById('onlyAvailabily')?.checked;

    // Apply search filter
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.nome_prodotto.toLowerCase().includes(searchTerm)
        );
    }

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'placeholdercategory') {
        filteredProducts = filteredProducts.filter(product => 
            product.tipologia_id.toString() === selectedCategory
        );
    }

    // Apply price range filter
    filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.prezzo);
        return price >= minPrice && (maxPrice === Infinity || price <= maxPrice);
    });

    // Apply availability filter
    if (onlyAvailable) {
        filteredProducts = filteredProducts.filter(product => product.quantita > 0);
    }

    // Check if any products match the filters
    if (filteredProducts.length === 0) {
        const productsContainer = document.querySelector('.container.my-5 .row');
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        Nessun prodotto corrisponde ai filtri selezionati.
                    </div>
                </div>
            `;
        }
        return;
    }

    // Update display with filtered products
    updateProductsDisplay(filteredProducts);
}

// Funzione per aggiornare la visualizzazione dei prodotti
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
                    <img src="${product.immagine ? `data:image/jpeg;base64,${product.immagine}` : '/assets/images/default/product.jpg'}" 
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

// Funzione per mostrare un messaggio di errore
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

// Funzione per aggiornare la quantità del prodotto nel carrello
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



/** SEZIONE RECENSIONI */
// Popola le recensioni
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const artisanId = urlParams.get('id');
        
        // Get user info at the start
        const user = JSON.parse(sessionStorage.getItem('user'));

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
            reviewsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        Non ci sono ancora recensioni per questo artigiano.
                    </div>
                </div>`;
            updateAverageRating(0, 0);
            return;
        }

        // Calcola la valutazione media
        const averageRating = artisanReviews.reduce((acc, review) => 
            acc + parseFloat(review.valutazione), 0) / artisanReviews.length;
        
        // Aggiorna la sezione della valutazione media
        updateAverageRating(averageRating, artisanReviews.length);

        // Popola le recensioni con controllo proprietario
        reviewsContainer.innerHTML = artisanReviews.map(review => `
            <div class="col-9 mb-4">
                <div class="card bg-light w-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title">${review.cliente_nome} ${review.cliente_cognome}</h5>
                            ${user && user.id !== review.cliente_id ? 
                                `<button class="btn btn-outline-danger btn-sm" 
                                        onclick="openReviewReport(${review.recensione_id})"
                                        title="Segnala questa recensione">
                                    <i class="fas fa-flag"></i>
                                </button>` : 
                                ''
                            }
                        </div>
                        <div class="stars mb-2 d-flex align-items-center">
                            ${generateStars(review.valutazione)}
                            <small class="text-muted ms-2">
                                ${new Date(review.data_recensione).toLocaleDateString()}
                            </small>
                        </div>
                        <p class="card-text">${review.descrizione}</p>
                        ${user && user.id === review.cliente_id ? 
                            `<div class="d-flex justify-content-end mt-3">
                                <button class="btn-review bg-light btn-link text-primary" 
                                        onclick="editReview(${review.recensione_id})"
                                        title="Modifica recensione">
                                    modifica
                                </button>
                                <hr style="border: 1px solid; margin: 0.5rem 0;">
                                <button class="btn-review bg-light btn-link text-danger" 
                                        onclick="deleteReview(${review.recensione_id})"
                                        title="Elimina recensione">
                                    elimina
                                </button>
                            </div>` : 
                            ''
                        }
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

async function editReview(reviewId) {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('Devi essere loggato per modificare una recensione');
        }

        // Fetch existing review data
        const response = await fetch(`/reviews/${reviewId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Errore nel recupero della recensione');
        }

        // Populate edit modal with existing data
        document.getElementById('editReviewId').value = reviewId;
        document.getElementById('editReviewText').value = data.review.descrizione;
        
        // Set rating stars
        const ratingStars = document.querySelectorAll('#editReviewModal .rating-input .fa-star');
        ratingStars.forEach(star => {
            const starRating = parseInt(star.dataset.rating);
            if (starRating <= data.review.valutazione) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
        document.getElementById('editRatingValue').value = data.review.valutazione;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
        modal.show();

    } catch (error) {
        console.error('Error fetching review:', error);
        showErrorMessage(error.message);
    }
}

async function updateReview() {
    try {
        const reviewId = document.getElementById('editReviewId').value;
        const rating = document.getElementById('editRatingValue').value;
        const reviewText = document.getElementById('editReviewText').value;
        const token = sessionStorage.getItem('token');

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

        // Show success message
        showSuccessMessage('Recensione modificata con successo');

        // Reload reviews after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error updating review:', error);
        showErrorMessage(error.message);
    }
}

function deleteReview(reviewId) {
    try {
        // Get the modal element
        const deleteModal = document.getElementById('deleteReviewModal');
        if (!deleteModal) {
            throw new Error('Modal element not found');
        }

        // Set the review ID in the hidden input
        const hiddenInput = deleteModal.querySelector('#deleteReviewId');
        if (!hiddenInput) {
            throw new Error('Hidden input not found');
        }
        hiddenInput.value = reviewId;

        // Create and show the modal
        const modal = new bootstrap.Modal(deleteModal);
        modal.show();

    } catch (error) {
        console.error('Error showing delete modal:', error);
        showErrorMessage('Errore nell\'apertura del modale di conferma');
    }
}

async function confirmDeleteReview() {
    let modal = null;
    try {
        const reviewId = document.getElementById('deleteReviewId').value;
        const token = sessionStorage.getItem('token');
        
        if (!token) {
            throw new Error('Devi essere loggato per eliminare una recensione');
        }

        if (!reviewId) {
            throw new Error('ID recensione non valido');
        }

        const response = await fetch(`/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore durante l\'eliminazione della recensione');
        }

        // Get the modal instance before closing
        modal = bootstrap.Modal.getInstance(document.getElementById('deleteReviewModal'));
        if (modal) {
            modal.hide();
        }

        // Show success message
        showSuccessMessage('Recensione eliminata con successo');

        // Reload reviews after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error deleting review:', error);
        showErrorMessage(error.message);
        // Make sure to close modal even on error
        if (modal) {
            modal.hide();
        }
    }
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
