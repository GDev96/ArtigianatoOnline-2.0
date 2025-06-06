// Keep only one initialization event
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get session user for authorization check
        const rawUser = sessionStorage.getItem('user');
        if (!rawUser) {
            window.location.href = '/login.html';
            return;
        }

        const user = JSON.parse(rawUser);
        if (user.ruolo_id !== 2) {
            window.location.href = '/index.html';
            return;
        }

        // Initialize dashboard
        await Promise.all([
            loadArtisanProfile(user),
            loadArtisanProducts(),
            loadCategories(),
            loadSalesChart(),
            loadArtisanReviews(),
            loadArtisanReports()
        ]);

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        window.location.href = '/login.html';
    }
});

// Update loadArtisanProfile to use passed user data
async function loadArtisanProfile(user) {
    try {
        // Fetch complete artisan data
        const response = await fetch(`/users/api/artisan/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero dei dati artigiano');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Dati artigiano non validi');
        }

        const artisan = data.artisan;

        // Update profile image
        const profilePicture = document.getElementById('profilePicture');
        if (profilePicture) {
            profilePicture.src = artisan.immagine 
                ? `data:image/jpeg;base64,${artisan.immagine}`
                : '/assets/images/wallpaper1.jpg';
        }

        // Update profile name and category
        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl) {
            profileNameEl.textContent = `${artisan.nome} ${artisan.cognome}`;
        }

        // Update category badge
        const categoryBadge = document.getElementById('artisanCategory');
        if (categoryBadge) {
            if (artisan.tipologia_id) {
                categoryBadge.textContent = artisan.nome_tipologia;
                categoryBadge.classList.remove('d-none');
            } else {
                categoryBadge.classList.add('d-none');
            }
        }

        // Update info cards
        const cards = document.querySelectorAll('.card p');
        if (cards.length >= 4) {
            cards[0].textContent = artisan.indirizzo || 'Non specificato';
            cards[1].textContent = artisan.citta || 'Non specificata';
            cards[2].textContent = artisan.numero_telefono || 'Non specificato';
            cards[3].textContent = artisan.email || 'Non specificato';
        }

        // Populate form fields
        const formFields = {
            'editNameInput': artisan.nome,
            'editSurnameInput': artisan.cognome,
            'editEmailInput': artisan.email,
            'editPhoneInput': artisan.numero_telefono || '',
            'editAddressInput': artisan.indirizzo || '',
            'editCityInput': artisan.citta || '',
            'editCategoryInput': artisan.tipologia_id || ''
        };

        Object.entries(formFields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
            }
        });

    } catch (error) {
        console.error('Error loading artisan profile:', error);
        throw error;
    }
}

// Update other functions to use sessionStorage instead of localStorage
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const userId = new URLSearchParams(window.location.search).get('id');
        const formData = {
            nome: document.getElementById('editNameInput').value.trim() || null,
            cognome: document.getElementById('editSurnameInput').value.trim() || null,
            email: document.getElementById('editEmailInput').value.trim() || null,
            numero_telefono: document.getElementById('editPhoneInput').value.trim() || null,
            indirizzo: document.getElementById('editAddressInput').value.trim() || null,
            citta: document.getElementById('editCityInput').value.trim() || null,
            tipologia_id: document.getElementById('editCategoryInput').value || null
        };

        // Filter out null values
        Object.keys(formData).forEach(key => 
            formData[key] === null && delete formData[key]
        );

        const response = await fetch(`/users/update/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nell\'aggiornamento del profilo');
        }

        const data = await response.json();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();

        // Update session user data
        const sessionUser = JSON.parse(sessionStorage.getItem('user'));
        const updatedUser = { ...sessionUser, ...data.user };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));

        // Reload artisan profile
        await loadArtisanProfile(updatedUser);

        // Show success message
        showSuccessMessage('Profilo aggiornato con successo');

    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorMessage(error.message || 'Errore nell\'aggiornamento del profilo');
    }
});

function showSuccessMessage(message) {
    const container = document.createElement('div');
    container.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    container.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 3000);
}

//Caricamento immagine profilo
function uploadProfilePicture(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      // Aggiorna l'immagine profilo con l'anteprima
      document.getElementById('profilePicture').src = e.target.result;
    };
    reader.readAsDataURL(file);

    // TODO: Salva il file nel db
    console.log('Immagine caricata:', file.name);
  }
}
// Update the profile image upload endpoint //FIXME: non salva l'immagine nuova a db
document.getElementById('profilePictureInput')?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
        const response = await fetch('/users/profile/image', { // Update endpoint path
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Use sessionStorage
            },
            body: formData
        });

        // ...rest of the function...
    } catch (error) {
        console.error('Errore durante l\'upload dell\'immagine:', error);
        showErrorMessage('Errore durante l\'upload dell\'immagine'); // Use showErrorMessage
    }
});



// --- GESTIONE GRAFICI E STATISTICHE ---
//Gestione dei grafici
async function loadSalesChart() {
    try {
        const response = await fetch('/orders/artisan/sales', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero dei dati delle vendite');
        }

        const data = await response.json();
    

        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Numero Ordini',
                    data: data.data,
                    borderColor: '#7095b9', // Main color from palette
                    backgroundColor: 'rgba(112, 149, 185, 0.1)', // Same color with transparency
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#5f7c9d' // Secondary color for axis labels
                        },
                        grid: {
                            color: 'rgba(177, 196, 210, 0.1)' // Light color from palette for grid
                        }
                    },
                    x: {
                        ticks: {
                            color: '#5f7c9d' // Secondary color for axis labels
                        },
                        grid: {
                            color: 'rgba(177, 196, 210, 0.1)' // Light color from palette for grid
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#5f7c9d' // Secondary color for legend
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Ordini: ${context.parsed.y}`;
                            }
                        },
                        backgroundColor: 'rgba(95, 124, 157, 0.8)' // Secondary color with transparency
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading sales chart:', error);
        const container = document.getElementById('salesChart').parentElement;
        container.innerHTML = '<p class="text-center text-danger">Errore nel caricamento del grafico vendite</p>';
    }
}

// Aggiungi una variabile globale per tenere traccia del grafico delle recensioni
let reviewsChart = null;

function updateReviewsChart(reviews) {
    // Count reviews by rating
    const ratings = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    reviews.forEach(review => {
        ratings[review.valutazione] = (ratings[review.valutazione] || 0) + 1;
    });

    const ctx = document.getElementById('reviewsChart').getContext('2d');
    
    // Distruggi il grafico esistente se presente
    if (reviewsChart) {
        reviewsChart.destroy();
    }

    // Crea il nuovo grafico
    reviewsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['5 stelle', '4 stelle', '3 stelle', '2 stelle', '1 stella'],
            datasets: [{
                data: [
                    ratings[5],
                    ratings[4],
                    ratings[3],
                    ratings[2],
                    ratings[1]
                ],
                backgroundColor: [
                    '#7095b9', // --palette-primary
                    '#5f7c9d', // --palette-secondary
                    '#95b0ca', // --palette-accent
                    '#b1c4d2', // --palette-light
                    '#7e99b2'  // --palette-medium
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#000000',
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${value} recensioni (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}




// --- GESTIONE CATEGORIE ---
async function loadCategories() {
    try {
        const response = await fetch('/categories', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero delle categorie');
        }

        const data = await response.json();
        if (!data.categories) {
            throw new Error('Formato dati categorie non valido');
        }

        // Store categories in a global variable for later use
        window.categoryOptions = [
            '<option value="">Seleziona una categoria</option>',
            ...data.categories.map(category => 
                `<option value="${category.tipologia_id}">${category.nome_tipologia}</option>`
            )
        ];

        // Get all select elements that need categories
        const selectElements = [
            document.getElementById('productCategoryInput'),
            document.getElementById('editProductCategoryInput'),
            document.getElementById('editCategoryInput')
        ].filter(Boolean);
        
        // Populate all select elements with the same options
        selectElements.forEach(select => {
            if (select) {
                select.innerHTML = window.categoryOptions.join('');
            }
        });

    } catch (error) {
        console.error('Errore nel caricamento delle categorie:', error);
        showErrorMessage('Errore nel caricamento delle categorie');
    }
}
function getCategoryName(tipologia_id) {
    const categories = {
        1: 'Ceramica',
        2: 'Legno',
        3: 'Tessuti',
        4: 'Gioielli',
        5: 'Vetro',
        6: 'Arredamento',
        7: 'Elettronica',
        8: 'Metallo',
        9: 'Decorazioni',
        10: 'Altro'
    };
    return categories[tipologia_id] || 'Non specificata';
}



// --- GESTIONE PRODOTTI ---
async function loadArtisanProducts() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user')); // Change localStorage to sessionStorage
        const response = await fetch('/products', { // Change from /api/products to /products
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Change localStorage to sessionStorage
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero dei prodotti');
        }

        const data = await response.json();
        if (!data.products) {
            console.error('Formato dati non valido:', data);
            return;
        }

        const artisanProducts = data.products.filter(p => p.artigiano_id === user.id);
        
        const tbody = document.getElementById('productTable');
        if (!tbody) {
            console.error('Elemento productTable non trovato');
            return;
        }

        tbody.innerHTML = artisanProducts.length === 0 
            ? `<tr><td colspan="5" class="text-center">Nessun prodotto disponibile</td></tr>`
            : artisanProducts.map(product => `
                <tr>
                    <td>${product.nome_prodotto || ''}</td>
                    <td>${getCategoryName(product.tipologia_id)}</td>
                    <td>€${parseFloat(product.prezzo || 0).toFixed(2)}</td>
                    <td>${product.quantita || 0}</td>
                    <td class="d-flex justify-content-evenly align-items-center">
                        <button class="btn" onclick="editProduct(${product.prodotto_id})" data-bs-toggle="modal" data-bs-target="#editProductModal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96995 20.5056 2.10012C20.8289 2.23029 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="btn" onclick="deleteProduct(${product.prodotto_id})">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.7007C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.7007C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6" stroke="#000000" stroke-width="1.5" stroke-linecap="round"></path>
                            </svg>
                        </button>
                    </td>
                </tr>
            `).join('');

    } catch (error) {
        console.error('Errore nel caricamento dei prodotti:', error);
        const tbody = document.getElementById('productTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Errore nel caricamento dei prodotti</td></tr>`;
        }
    }
}

// Update the add product form handler
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData();
        
        // Get form values
        const nome_prodotto = document.getElementById('productNameInput').value.trim();
        const tipologia_id = document.getElementById('productCategoryInput').value;
        const prezzo = document.getElementById('productPriceInput').value;
        const quantita = document.getElementById('productQuantityInput').value || '1';
        const imageFile = document.getElementById('productImageInput').files[0];

        // Validation
        if (!nome_prodotto || !tipologia_id || !prezzo) {
            throw new Error('Compila tutti i campi obbligatori');
        }

        // Append all form data
        formData.append('nome_prodotto', nome_prodotto);
        formData.append('tipologia_id', tipologia_id);
        formData.append('prezzo', prezzo);
        formData.append('quantita', quantita);
        
        if (imageFile) {
            formData.append('immagine', imageFile);
        }

        const response = await fetch('/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante l\'aggiunta del prodotto');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        modal.hide();
        
        // Reload products and show success message
        await loadArtisanProducts();
        document.getElementById('addProductForm').reset();
        showSuccessMessage('Prodotto aggiunto con successo');

    } catch (error) {
        console.error('Errore durante l\'aggiunta del prodotto:', error);
        showErrorMessage(error.message || 'Errore durante l\'aggiunta del prodotto');
    }
});

// Update editProduct function
async function editProduct(productId) {
    try {
        // Check if categories are loaded
        if (!window.categoryOptions) {
            await loadCategories();
        }

        const formElements = {
            nameInput: document.getElementById('editProductNameInput'),
            categoryInput: document.getElementById('editProductCategoryInput'),
            priceInput: document.getElementById('editProductPriceInput'),
            quantityInput: document.getElementById('editProductQuantityInput'),
            imagePreview: document.getElementById('editProductImagePreview'),
            form: document.getElementById('editProductForm')
        };

        // Verify all form elements exist
        const missingElements = Object.entries(formElements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            throw new Error(`Elementi mancanti nel form: ${missingElements.join(', ')}`);
        }

        const response = await fetch(`/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero del prodotto');
        }

        const data = await response.json();
        const product = data.product;

        // Populate form fields
        formElements.nameInput.value = product.nome_prodotto || '';
        formElements.priceInput.value = product.prezzo || '';
        formElements.quantityInput.value = product.quantita || '';
        
        // Update category select with current product category
        if (formElements.categoryInput) {
            formElements.categoryInput.innerHTML = window.categoryOptions.join('');
            formElements.categoryInput.value = product.tipologia_id || '';
        }
        
        // Store product ID in form
        formElements.form.dataset.productId = productId;

        // Handle image preview
        if (product.immagine) {
            formElements.imagePreview.src = `data:image/jpeg;base64,${product.immagine}`;
            formElements.imagePreview.classList.remove('d-none');
        } else {
            formElements.imagePreview.classList.add('d-none');
        }

    } catch (error) {
        console.error('Errore nel caricamento del prodotto:', error);
        showErrorMessage('Errore nel caricamento del prodotto: ' + error.message);
    }
}


// Aggiungi questo dopo la definizione di editProduct
document.getElementById('editProductModal').addEventListener('shown.bs.modal', function (event) {
    // Ottieni il productId dal pulsante che ha attivato il modale
    const button = event.relatedTarget;
    const productId = button.getAttribute('data-product-id');
    if (productId) {
        editProduct(productId);
    }
});

document.getElementById('editProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const productId = e.target.dataset.productId;
        const formData = new FormData();
        
        // Get form values
        const nome_prodotto = document.getElementById('editProductNameInput').value.trim();
        const tipologia_id = document.getElementById('editProductCategoryInput').value;
        const prezzo = document.getElementById('editProductPriceInput').value;
        const quantita = document.getElementById('editProductQuantityInput').value || '1';
        const imageFile = document.getElementById('editProductImageInput').files[0];

        // Validation
        if (!nome_prodotto || !tipologia_id || !prezzo) {
            throw new Error('Compila tutti i campi obbligatori');
        }

        // Append form data
        formData.append('nome_prodotto', nome_prodotto);
        formData.append('tipologia_id', tipologia_id);
        formData.append('prezzo', prezzo);
        formData.append('quantita', quantita);
        
        if (imageFile) {
            formData.append('immagine', imageFile);
        }

        const response = await fetch(`/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante la modifica del prodotto');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
        modal.hide();
        
        // Reload products and show success message
        await loadArtisanProducts();
        document.getElementById('editProductForm').reset();
        showSuccessMessage('Prodotto modificato con successo');

    } catch (error) {
        console.error('Errore durante la modifica del prodotto:', error);
        showErrorMessage(error.message || 'Errore durante la modifica del prodotto');
    }
});

async function deleteProduct(productId) {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) {
        return;
    }

    try {
        const response = await fetch(`/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante l\'eliminazione del prodotto');
        }

        // Reload products and show success message
        await loadArtisanProducts();
        showSuccessMessage('Prodotto eliminato con successo');

    } catch (error) {
        console.error('Errore durante l\'eliminazione:', error);
        showErrorMessage('Errore durante l\'eliminazione del prodotto');
    }
}

// --- GESTIONE RECENSIONI ---

// Add these functions after the loadArtisanProfile function
async function loadArtisanReviews() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const tbody = document.getElementById('reviewsTableBody');
        if (!tbody) return;

        // Fetch reviews from server
        const response = await fetch('/reviews', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero delle recensioni');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Formato dati recensioni non valido');
        }

        // Filter reviews for the current artisan
        const artisanReviews = data.reviews.filter(r => r.artigiano_id === user.id);

        // Calculate average rating
        const averageRating = artisanReviews.length > 0 
            ? artisanReviews.reduce((acc, rev) => acc + parseFloat(rev.valutazione), 0) / artisanReviews.length 
            : 0;

        // Update header with average rating stars
        const ratingContainer = document.querySelector('#reviews .rating small');
        const starsContainer = document.querySelector('#reviews .stars');
        
        if (ratingContainer && starsContainer) {
            starsContainer.innerHTML = generateStars(averageRating);
            ratingContainer.textContent = `${artisanReviews.length} recensioni (${averageRating.toFixed(1)})`;
        }

        // Clear and populate table
        if (artisanReviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessuna recensione disponibile</td></tr>';
            return;
        }

        tbody.innerHTML = artisanReviews.map(review => `
            <tr>
                <td>${review.cliente_nome} ${review.cliente_cognome}</td>
                <td class="text-center">
                    <small class="text-muted ms-2">${review.valutazione}/5</small>
                </td>
                <td>${review.descrizione}</td>
                <td>${new Date(review.data_recensione).toLocaleDateString()}</td>
                <td class="text-center">
                    <button class="btn btn-sm" 
                            onclick="openReportModal(${review.recensione_id})"
                            data-bs-toggle="modal"
                            data-bs-target="#reportReviewModal"
                            title="Segnala recensione">
                        <i class="fas fa-flag"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update reviews chart
        updateReviewsChart(artisanReviews);

    } catch (error) {
        console.error('Error loading reviews:', error);
        const tbody = document.getElementById('reviewsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Errore nel caricamento delle recensioni</td></tr>';
        }
    }
}

function openReportModal(reviewId) {
    document.getElementById('reportedReviewId').value = reviewId;
    const modal = new bootstrap.Modal(document.getElementById('reportReviewModal'));
    modal.show();

    // Add event listener for modal close
    document.getElementById('reportReviewModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('reportReviewForm').reset();
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    });
}

// Update form submission handler
document.getElementById('reportReviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const reviewId = document.getElementById('reportedReviewId').value;
        const reason = document.getElementById('reportReason').value;
        const description = document.getElementById('reportDescription').value;

        // Validate all required fields
        if (!reviewId || !reason || !description.trim()) {
            throw new Error('Tutti i campi sono richiesti');
        }

        const response = await fetch('/reports/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify({
                review_id: parseInt(reviewId),
                reason: reason,
                description: description.trim()
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Errore durante la segnalazione');
        }

        // Close modal properly
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportReviewModal'));
        if (modal) {
            modal.hide();
        }
        
        e.target.reset();
        showSuccessMessage('Segnalazione inviata con successo');

        // Reload the page after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Error reporting review:', error);
        showErrorMessage(error.message || 'Errore durante la segnalazione');
    }
});

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return [
        ...Array(fullStars).fill('<i class="fas fa-star"></i>'),
        hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : '',
        ...Array(emptyStars).fill('<i class="far fa-star"></i>')
    ].join('');
}

function openReviewReport(reviewId) {
    document.getElementById('reportedReviewId').value = reviewId;
    const modal = new bootstrap.Modal(document.getElementById('reportReviewModal'));
    modal.show();
}

// --- GESTIONE SEGNALAZIONI ---
async function loadArtisanReports() {
    try {
        const response = await fetch('/reports/user', {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento delle segnalazioni');
        
        const reports = await response.json();
        console.log('Reports data:', reports); // Debug: log the reports data
        
        const reportsContainer = document.querySelector('#reports-container');
        
        // If no reports, hide the entire container and return
        if (!reports || !Array.isArray(reports) || reports.length === 0) {
            if (reportsContainer) {
                reportsContainer.style.display = 'none';
            }
            return;
        }

        // Show the container if there are reports
        if (reportsContainer) {
            reportsContainer.style.display = 'block';
            reportsContainer.classList.remove('d-none');
        }

        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.recensione_id ? `#${report.recensione_id}` : 'N/A'}</td>
                <td>${new Date(report.data_segnalazione).toLocaleDateString()}</td>
                <td>${getReportReasonText(report.motivazione)}</td>
                <td>
                    <span class="badge bg-${getReportStatusColor(report.stato_segnalazione)}">
                        ${getReportStatusText(report.stato_segnalazione)}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger" onclick="deleteReport(${report.segnalazione_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        const reportsContainer = document.querySelector('#reports-container');
        if (reportsContainer) {
            reportsContainer.style.display = 'none';
        }
    }
}

async function deleteReport(reportId) {
    if (!confirm('Sei sicuro di voler eliminare questa segnalazione?')) return;

    try {
        const response = await fetch(`/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Errore nell\'eliminazione della segnalazione');

        await loadArtisanReports();
        showSuccessMessage('Segnalazione eliminata con successo');

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Errore nell\'eliminazione della segnalazione');
    }
}

// Helper functions per stato e motivo segnalazione
function getReportStatusColor(status) {
    const colors = {
        'in attesa': 'warning',
        'in lavorazione': 'info',
        'risolta': 'success',
        'chiusa': 'secondary',
        'rifiutata': 'danger'
    };
    return colors[status] || 'secondary';
}

function getReportStatusText(status) {
    const statuses = {
        'in attesa': 'In attesa',
        'in lavorazione': 'In lavorazione',
        'risolta': 'Risolta',
        'chiusa': 'Chiusa',
        'rifiutata': 'Rifiutata'
    };
    return statuses[status] || status;
}

function getReportReasonText(reason) {
    const reasons = {
        'fake': 'Recensione falsa',
        'inappropriate': 'Contenuti inappropriati',
        'spam': 'Spam',
        'other': 'Altro'
    };
    return reasons[reason] || reason;
}