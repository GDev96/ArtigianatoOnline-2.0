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
        
        reader.onload = () => {
            // Add proper image data prefix based on file type
            let prefix;
            switch (file.type) {
                case 'image/jpeg':
                case 'image/jpg':
                    prefix = 'data:image/jpeg;base64,';
                    break;
                case 'image/png':
                    prefix = 'data:image/png;base64,';
                    break;
                default:
                    reject(new Error('Formato immagine non supportato'));
                    return;
            }
            
            // Get base64 part only
            const base64 = reader.result.split(',')[1];
            // Return complete data URL
            resolve(prefix + base64);
        };

        reader.onerror = () => reject(new Error('Errore nella lettura del file'));
        reader.readAsDataURL(file);
    });
}

// Registration function
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const formData = {
            nome_utente: document.getElementById('usernameInput').value.trim(),
            email: document.getElementById('emailInput').value.trim(),
            nome: document.getElementById('nameInput').value.trim(),
            cognome: document.getElementById('surnameInput').value.trim(),
            password: document.getElementById('passwordInput').value,
            indirizzo: document.getElementById('addressInput').value.trim(),
            citta: document.getElementById('cityInput').value.trim(),
            isArtigiano: document.getElementById('artisanCheck').checked
        };

        // Validate password confirmation
        if (formData.password !== document.getElementById('confirmPasswordInput').value) {
            throw new Error('Le password non coincidono');
        }

        // Add artisan specific fields if artisan registration
        if (formData.isArtigiano) {
            const artisanData = {
                iban: document.getElementById('vatNumberInput').value.trim(),
                numero_telefono: document.getElementById('phoneNumberInput').value.trim(),
                tipologia_id: parseInt(document.getElementById('categoryInput').value)
            };

            // Process profile image
            const imageFile = document.getElementById('profileImageInput').files[0];
            if (imageFile) {
                try {
                    const imageData = await processImage(imageFile);
                    if (imageData) {
                        formData.immagine = imageData;
                    }
                } catch (error) {
                    throw new Error(`Errore immagine: ${error.message}`);
                }
            }

            Object.assign(formData, artisanData);
        }

        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Errore durante la registrazione');
        }

        // Show success modal and redirect
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);

    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message);
    }
});