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

//Funzione di registrazione
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const passwordInput = document.getElementById('passwordInput');
        const confirmPasswordInput = document.getElementById('confirmPasswordInput');
        const passwordError = document.getElementById('passwordError');

        // Reset classi e messaggi d'errore precedenti
        passwordInput.classList.remove('is-invalid');
        confirmPasswordInput.classList.remove('is-invalid');
        passwordError.textContent = '';

        const userCheck = document.getElementById('userCheck');
        const artisanCheck = document.getElementById('artisanCheck');

        if (!userCheck.checked && !artisanCheck.checked) {
            userCheck.checked = true;
            return;
        }

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Verifica i criteri della password usando regex
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            passwordInput.classList.add('is-invalid');
            passwordError.textContent = 'La password deve avere almeno 8 caratteri, una lettera maiuscola, un numero e un simbolo';
            passwordError.style.display = 'block';
            return;
        } else if (password !== confirmPassword) {
            passwordInput.classList.add('is-invalid');
            confirmPasswordInput.classList.add('is-invalid');
            passwordError.textContent = 'Le password non coincidono';
            passwordError.style.display = 'block';
            return;
        } else {
            passwordInput.classList.remove('is-invalid');
            confirmPasswordInput.classList.remove('is-invalid');
            passwordError.textContent = '';
            passwordError.style.display = 'none';
        }

        // Prepara i dati base dell'utente
        const formData = {
            nome_utente: document.getElementById('usernameInput').value,
            email: document.getElementById('emailInput').value,
            nome: document.getElementById('nameInput').value,
            cognome: document.getElementById('surnameInput').value,
            password: password,
            indirizzo: document.getElementById('addressInput').value,
            citta: document.getElementById('cityInput').value,
            numero_telefono: document.getElementById('phoneNumberInput').value,
            isArtigiano: artisanCheck.checked
        };
      
        // Aggiungi i dati dell'artigiano se necessario
        if (artisanCheck.checked) {
            formData.iban = document.getElementById('vatNumberInput').value;
            formData.tipologia_id = getCategoryId(document.getElementById('categoryInput').value);

            // Gestione dell'immagine del profilo
            if (profileImageInput.files && profileImageInput.files[0]) {
                const file = profileImageInput.files[0];
                
                // Controlla dimensione file (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('L\'immagine è troppo grande. Dimensione massima: 5MB');
                    return;
                }
            
                const reader = new FileReader();
                reader.onload = async function(e) {
                    // Comprimi l'immagine prima dell'upload
                    const img = new Image();
                    img.src = e.target.result;
                    
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
            
                        // Calcola le nuove dimensioni mantenendo l'aspect ratio
                        let width = img.width;
                        let height = img.height;
                        const maxSize = 800;
            
                        if (width > height) {
                            if (width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                            }
                        }
            
                        canvas.width = width;
                        canvas.height = height;
            
                        // Disegna l'immagine ridimensionata
                        ctx.drawImage(img, 0, 0, width, height);
            
                        // Converti in base64 con qualità ridotta
                        const compressedImage = canvas.toDataURL('image/jpeg', 0.7);
                        formData.immagine = compressedImage.split(',')[1];
                        
                        sendRegistrationRequest(formData);
                    };
                };
                reader.readAsDataURL(file);
            } else {
                await sendRegistrationRequest(formData);
            }
        }
          
    // Funzione helper per ottenere l'ID della categoria
    function getCategoryId(categoryName) {
        const categoryMap = {
            'ceramica': 1,
            'legno': 2,
            'tessuti': 3,
            'gioielli': 4,
            'vetro': 5,
            'arredamento': 6,
            'elettronica': 7,
            'metallo': 8,
            'decorazioni': 9,
            'altro': 10
        };
        return categoryMap[categoryName.toLowerCase()] || 10;
    }
    
    // Update the sendRegistrationRequest function
    async function sendRegistrationRequest(formData) {
        try {
            // Fix 1: Correct endpoint URL
            const response = await fetch('/users/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Fix 2: Match the expected backend data structure
                body: JSON.stringify({
                    username: formData.nome_utente,
                    email: formData.email,
                    nome: formData.nome,
                    cognome: formData.cognome,
                    password: formData.password,
                    indirizzo: formData.indirizzo,
                    citta: formData.citta,
                    numero_telefono: formData.numero_telefono,
                    isArtigiano: formData.isArtigiano,
                    iban: formData.iban,
                    tipologia_id: parseInt(formData.tipologia_id),
                    immagine: formData.immagine
                })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore durante la registrazione');
            }
    
            const data = await response.json();
            console.log('Registrazione avvenuta con successo:', data);
            
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
            
            setTimeout(() => {
                successModal.hide();
                window.location.href = '/login.html';
            }, 5000);
    
            document.getElementById('successModal').addEventListener('hidden.bs.modal', function () {
                window.location.href = '/login.html';
            });
    
        } catch (error) {
            console.error('Errore durante la registrazione:', error);
            alert(error.message || 'Errore durante la registrazione. Riprova più tardi.');
        }
    }
  });
});
