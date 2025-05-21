
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

//POpola il select delle categorie
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/categories', {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const categorySelect = document.getElementById('categoryInput');
        
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
            const profileImageInput = document.getElementById('profileImageInput');
            if (profileImageInput.files && profileImageInput.files[0]) {
              const reader = new FileReader();
              reader.onload = async function(e) {
                formData.immagine = e.target.result.split(',')[1]; // Prendi solo i dati base64
                await sendRegistrationRequest(formData);
              };
              reader.readAsDataURL(profileImageInput.files[0]);
            } else {
              await sendRegistrationRequest(formData);
            }
        } else {
            await sendRegistrationRequest(formData);
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
    
    // Funzione per inviare la richiesta di registrazione
    async function sendRegistrationRequest(formData) {
      try {
        const response = await fetch('/api/users/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
    
        const data = await response.json();
    
        if (response.ok) {
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
        } else {
          alert(data.error || 'Errore durante la registrazione');
        }
      } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante la registrazione');
      }
    }
  });
});
