// Se l'utente è già loggato, reindirizzalo alla home page
document.addEventListener('DOMContentLoaded', () => {
        // Check if user is already logged in
        const user = localStorage.getItem('user');
        if (user) {
            window.location.href = '/index.html';
            return;
        }
    });

// Funzione per mostrare/nascondere la sezione artigiano
function toggleArtisanSection(isArtisan) {
    console.log('funzione chiamata', isArtisan);
    const artisanSection = document.getElementById('artisanSection');
    if (isArtisan) {
        artisanSection.classList.remove('d-none');
        artisanSection.classList.add('d-block');
    } else {
        artisanSection.classList.remove('d-block');
        artisanSection.classList.add('d-none');
    }
}

// Popola le categorie del select
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/categories', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        console.log('Categorie ricevute:', data);
        
        if (!data.success || !data.categories) {
            throw new Error('Invalid API response format');
        }

        const categorySelect = document.getElementById('categoryInput');
        
        // Reset select to empty state
        categorySelect.innerHTML = '<option value="" selected disabled>Seleziona una categoria</option>';

        // Add all categories without filtering
        data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.tipologia_id;
            option.textContent = category.nome_tipologia;
            categorySelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading categories:', error);
        const categorySelect = document.getElementById('categoryInput');
        categorySelect.innerHTML = '<option value="" selected disabled>Errore nel caricamento delle categorie</option>';
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-2';
        errorDiv.textContent = 'Errore nel caricamento delle categorie. Riprova più tardi.';
        categorySelect.parentNode.appendChild(errorDiv);
    }
});


async function processImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            reject(new Error('Formato immagine non valido. Sono accettati solo JPEG, JPG e PNG.'));
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('L\'immagine è troppo grande. Dimensione massima: 5MB'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Errore nella lettura del file'));
        reader.readAsDataURL(file);
    });
}

// Registration function
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        // Basic form data
        const formData = {
            nome_utente: document.getElementById('usernameInput').value.trim(),
            email: document.getElementById('emailInput').value.trim(),
            nome: document.getElementById('nameInput').value.trim(),
            cognome: document.getElementById('surnameInput').value.trim(),
            password: document.getElementById('passwordInput').value,
            conferma_password: document.getElementById('confirmPasswordInput').value,
            indirizzo: document.getElementById('addressInput').value.trim(),
            citta: document.getElementById('cityInput').value.trim(),
            isArtigiano: document.getElementById('artisanCheck').checked
        };

        // Validate passwords match
        if (formData.password !== formData.conferma_password) {
            throw new Error('Le password non coincidono');
        }

        // Add artisan specific fields
        if (formData.isArtigiano) {
            formData.iban = document.getElementById('vatNumberInput').value.trim();
            formData.numero_telefono = document.getElementById('phoneNumberInput').value.trim();
            formData.tipologia_id = document.getElementById('categoryInput').value;

            // Process image if present
            const imageInput = document.getElementById('profileImageInput');
            if (imageInput.files[0]) {
                try {
                    formData.immagine = await processImage(imageInput.files[0]);
                } catch (error) {
                    throw new Error(`Errore immagine: ${error.message}`);
                }
            }
        }

        // Send registration request
        const response = await fetch('/users/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Errore durante la registrazione');
        }

        // Show success modal
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();

        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);

    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        alert(error.message);
    }
});