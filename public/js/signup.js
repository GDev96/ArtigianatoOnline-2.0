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

function validatePassword(password) {
    const validations = {
        upperCase: /[A-Z]/.test(password),
        lowerCase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        length: password.length >= 8
    };

    // Update validation UI
    Object.keys(validations).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (validations[key]) {
                element.classList.remove('text-danger');
                element.classList.add('text-success');
                element.querySelector('i').classList.remove('fa-times-circle');
                element.querySelector('i').classList.add('fa-check-circle');
            } else {
                element.classList.remove('text-success');
                element.classList.add('text-danger');
                element.querySelector('i').classList.remove('fa-check-circle');
                element.querySelector('i').classList.add('fa-times-circle');
            }
        }
    });

    return Object.values(validations).every(Boolean);
}

// Add password validation on input
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('passwordInput');
    const passwordValidation = document.getElementById('passwordValidation');
    const ibanInput = document.getElementById('vatNumberInput');

    if (ibanInput) {
        ibanInput.addEventListener('input', (e) => {
            const iban = e.target.value.replace(/\s/g, '');
            const isValid = iban === '' || validateIBAN(iban);
            
            ibanInput.classList.toggle('is-invalid', !isValid);
            ibanInput.classList.toggle('is-valid', isValid && iban !== '');
        });
    }

    if (passwordInput && passwordValidation) {
        passwordInput.addEventListener('focus', () => {
            passwordValidation.classList.remove('d-none');
        });

        passwordInput.addEventListener('input', () => {
            validatePassword(passwordInput.value);
        });

        passwordInput.addEventListener('blur', () => {
            if (!passwordInput.value) {
                passwordValidation.classList.add('d-none');
            }
        });
    }
});

// Add this after the validatePassword function
function validateIBAN(iban) {
    // Remove spaces and convert to uppercase
    iban = iban.replace(/\s/g, '').toUpperCase();
    
    // Check basic format for Italian IBAN
    if (!/^IT\d{2}[A-Z]\d{10}[0-9A-Z]{12}$/.test(iban)) {
        return false;
    }

    // Convert letters to numbers (A=10, B=11, ...)
    const ibanNum = iban.slice(4) + iban.slice(0, 4).replace(/[A-Z]/g, letter => 
        (letter.charCodeAt(0) - 55).toString()
    );

    // Calculate mod-97
    let remainder = ibanNum.split('')
        .reduce((acc, digit) => (acc * 10 + (isNaN(digit) ? digit.charCodeAt(0) - 55 : parseInt(digit))) % 97, 0);

    return remainder === 1;
}

//Funzione per processare l'immagine
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
    const formError = document.getElementById('formError');
    formError.classList.add('d-none');

    try {
        const password = document.getElementById('passwordInput').value;
        
        // Validate password requirements
        if (!validatePassword(password)) {
            throw new Error('La password non soddisfa i requisiti minimi di sicurezza');
        }

        const formData = {
            username: document.getElementById('usernameInput').value.trim(),
            email: document.getElementById('emailInput').value.trim(),
            password: password,
            nome: document.getElementById('nameInput').value.trim(),
            cognome: document.getElementById('surnameInput').value.trim(),
            numero_telefono: document.getElementById('phoneInput').value.trim(),
            indirizzo: document.getElementById('addressInput').value.trim(),
            citta: document.getElementById('cityInput').value.trim(),
            ruolo_id: document.getElementById('artisanCheck').checked ? 2 : 1
        };

        // Add artisan specific fields if artisan registration
        if (formData.ruolo_id === 2) {
            const iban = document.getElementById('vatNumberInput').value.trim();
            const tipologia_id = document.getElementById('categoryInput').value;

            if (!iban || !validateIBAN(iban)) {
                throw new Error('IBAN non valido');
            }

            if (!tipologia_id) {
                throw new Error('Seleziona una categoria');
            }

            formData.iban = iban;
            formData.tipologia_id = parseInt(tipologia_id);
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
        showErrorMessage(error.message);
    }
});