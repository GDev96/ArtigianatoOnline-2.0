document.addEventListener('DOMContentLoaded', async () => {
    const rawUser = sessionStorage.getItem('user');
    if (!rawUser) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const user = JSON.parse(rawUser);
        if (user.ruolo_id !== 2) {
            window.location.href = '/index.html';
            return;
        }
        // Continue with dashboard initialization...
    } catch (error) {
        console.error('Error loading dashboard:', error);
        sessionStorage.clear();
        window.location.href = '/login.html';
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.ruolo_id !== 2) {
        window.location.href = '/login.html';
        return;
    }

    await Promise.all([
        loadArtisanProfile(),
        loadArtisanProducts(),
        loadCategories()
    ]);
});

// --- GESTIONE ARTIGIANO ---
async function loadArtisanProfile() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Carica i dati del profilo
        document.getElementById('profilePicture').src = user.immagine || '/assets/images/wallpaper1.jpg';
        document.getElementById('profileName').textContent = `${user.nome} ${user.cognome}`;
        
        // Aggiungi la categoria dell'artigiano
        const categoryBadge = document.getElementById('artisanCategory');
        if (user.tipologia_id) {
            categoryBadge.textContent = getCategoryName(user.tipologia_id);
            categoryBadge.style.display = 'inline-block';
        } else {
            categoryBadge.style.display = 'none';
        }

        // Aggiorna le card con i dati dell'utente
        const cards = document.querySelectorAll('.card p');
        cards[0].textContent = user.indirizzo || 'Non specificato';
        cards[1].textContent = user.citta || 'Non specificata';
        cards[2].textContent = user.numero_telefono || 'Non specificato';
        cards[3].textContent = user.email || 'Non specificata';

        // Precompila i campi del form di modifica
        document.getElementById('editNameInput').value = user.nome || '';
        document.getElementById('editSurnameInput').value = user.cognome || '';
        document.getElementById('editEmailInput').value = user.email || '';
        document.getElementById('editPhoneInput').value = user.numero_telefono || '';
        document.getElementById('editAddressInput').value = user.indirizzo || '';
        document.getElementById('editCityInput').value = user.citta || '';
        document.getElementById('editIbanInput').value = user.iban || '';
        document.getElementById('editCategoryInput').value = user.tipologia_id || '';

    } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
    }
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

//Gestione dei grafici
document.addEventListener('DOMContentLoaded', () => {
  // Grafico vendite
  const ctx = document.getElementById('salesChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
      datasets: [{
        label: 'Vendite Mensili (€)',
        data: [500, 700, 1000, 800, 1200, 1500, 1300, 1600, 1400, 1700, 1900, 2000],
        borderColor: 'rgba(139, 94, 60, 1)',
        backgroundColor: 'rgba(139, 94, 60, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  });

  // Grafico delle recensioni
  const reviewCtx = document.getElementById('reviewsChart').getContext('2d');
  new Chart(reviewCtx, {
    type: 'doughnut',
    data: {
      labels: ['5 stelle', '4 stelle', '3 stelle', '2 stelle', '1 stella'],
      datasets: [{
        label: 'Valutazioni',
        data: [50, 25, 15, 7, 3], // Esempio di distribuzione %
        backgroundColor: [
          '#A97B5D', // 5 stelle - marrone chiaro
          '#C2A385', // 4 stelle - beige
          '#D6BFAF', // 3 stelle - beige chiaro
          '#E8D7C8', // 2 stelle - sabbia
          '#F5EFE9'  // 1 stella - quasi bianco
        ],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      cutout: '50%', // Effetto "ciambella"
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#5C3D2E',
            font: {
              size: 14
            }
          }
        }
      }
    }
  });
});

document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const updatedProfile = {
        nome: document.getElementById('editNameInput').value,
        cognome: document.getElementById('editSurnameInput').value,
        email: document.getElementById('editEmailInput').value,
        numero_telefono: document.getElementById('editPhoneInput').value,
        indirizzo: document.getElementById('editAddressInput').value,
        citta: document.getElementById('editCityInput').value,
        iban: document.getElementById('editIbanInput').value,
        tipologia_id: document.getElementById('editCategoryInput').value
    };

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updatedProfile)
        });

        if (response.ok) {
            const user = JSON.parse(localStorage.getItem('user'));
            const updatedUser = { ...user, ...updatedProfile };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            await loadArtisanProfile();
            bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
        }
    } catch (error) {
        console.error('Errore durante l\'aggiornamento del profilo:', error);
    }
});

document.getElementById('profilePictureInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
        const response = await fetch('/api/profile/image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('profilePicture').src = data.imageUrl;
            
            const user = JSON.parse(localStorage.getItem('user'));
            user.immagine = data.imageUrl;
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (error) {
        console.error('Errore durante l\'upload dell\'immagine:', error);
    }
});

// --- GESTIONE CATEGORIE ---
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error('Errore nel recupero delle categorie');
        }

        const data = await response.json();
        const selectElements = [
            document.getElementById('productCategoryInput'),
            document.getElementById('editProductModal').querySelector('#productCategoryInput'),
            document.getElementById('editCategoryInput') // Aggiunto il select del form artigiano
        ];
        
        const options = [
            '<option value="">Seleziona una categoria</option>',
            ...data.categories.map(category => 
                `<option value="${category.tipologia_id}">${category.nome_tipologia}</option>`
            )
        ];

        // Popola tutti i select con le stesse opzioni
        selectElements.forEach(select => {
            if (select) {
                select.innerHTML = options.join('');
            }
        });

    } catch (error) {
        console.error('Errore nel caricamento delle categorie:', error);
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
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch('/api/products', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
                    <td>${product.quant || 0}</td>
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

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData();
        
        // Get form values
        const nome_prodotto = document.getElementById('productNameInput').value;
        const tipologia_id = document.getElementById('productCategoryInput').value;
        const prezzo = document.getElementById('productPriceInput').value;
        const descrizione = document.getElementById('productDescriptionInput').value;
        const quant = document.getElementById('productQuantityInput').value || '1';
        const imageFile = document.getElementById('productImageInput').files[0];

        // Append all form data
        formData.append('nome_prodotto', nome_prodotto);
        formData.append('tipologia_id', tipologia_id);
        formData.append('prezzo', prezzo);
        formData.append('descrizione', descrizione);
        formData.append('quant', quant);
        
        if (imageFile) {
            formData.append('immagine', imageFile);
        }

        // Log FormData contents for debugging
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore durante l\'aggiunta del prodotto');
        }

        bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
        await loadArtisanProducts();
        document.getElementById('addProductForm').reset();
        alert('Prodotto aggiunto con successo!');

    } catch (error) {
        console.error('Errore durante l\'aggiunta del prodotto:', error);
        alert(error.message || 'Errore durante l\'aggiunta del prodotto');
    }
});

async function editProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero del prodotto');
        }

        const product = await response.json();
        
        const modal = document.getElementById('editProductModal');
        modal.querySelector('#productNameInput').value = product.nome_prodotto;
        modal.querySelector('#productCategoryInput').value = product.tipologia_id;
        modal.querySelector('#productPriceInput').value = product.prezzo;
        modal.querySelector('#productQuantityInput').value = product.quant;
        modal.querySelector('#productDescriptionInput').value = product.descrizione;

        const editForm = modal.querySelector('form');
        editForm.onsubmit = async (e) => {
            e.preventDefault();

            const formData = {
                nome_prodotto: editForm.querySelector('#productNameInput').value,
                tipologia_id: parseInt(editForm.querySelector('#productCategoryInput').value),
                prezzo: parseFloat(editForm.querySelector('#productPriceInput').value),
                quant: parseInt(editForm.querySelector('#productQuantityInput').value),
                descrizione: editForm.querySelector('#productDescriptionInput').value
            };

            try {
                const updateResponse = await fetch(`/api/products/${productId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (!updateResponse.ok) {
                    throw new Error('Errore durante l\'aggiornamento del prodotto');
                }

                bootstrap.Modal.getInstance(modal).hide();
                await loadArtisanProducts();
                alert('Prodotto aggiornato con successo!');

            } catch (error) {
                console.error('Errore durante l\'aggiornamento:', error);
                alert('Errore durante l\'aggiornamento del prodotto');
            }
        };

    } catch (error) {
        console.error('Errore nel caricamento del prodotto:', error);
        alert('Errore nel caricamento del prodotto');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Errore durante l\'eliminazione del prodotto');
        }

        await loadArtisanProducts();
        alert('Prodotto eliminato con successo!');

    } catch (error) {
        console.error('Errore durante l\'eliminazione:', error);
        alert('Errore durante l\'eliminazione del prodotto');
    }
}