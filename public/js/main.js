// Add fetch interceptor for authentication
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    try {
        const [resource, config = {}] = args;
        
        // Don't add token for login/signup/public routes
        const publicRoutes = ['/', '/index.html', '/auth/login', '/auth/signup', '/categories', '/users/artisans'];
        const isPublicRoute = publicRoutes.some(route => resource.includes(route));
        
        if (!isPublicRoute) {
            const token = sessionStorage.getItem('token');
            if (!token) {
                sessionStorage.clear();
                window.location.href = '/login.html';
                return null;
            }

            // Add token to headers
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${token}`
            };
        }

        const response = await originalFetch(resource, config);

        // Check for authentication errors
        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '/login.html';
            return null;
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

// Array di immagini per lo sfondo
const backgroundImages = [
  '/assets/images/wallpaper1.jpg',
  '/assets/images/wallpaper2.jpg',
  '/assets/images/wallpaper3.jpg',
  '/assets/images/wallpaper4.jpg',
];

let currentIndex = 0;

// Funzione per cambiare lo sfondo
function changeBackground() {
  document.body.style.backgroundImage = `url(${backgroundImages[currentIndex]})`;
  currentIndex = (currentIndex + 1) % backgroundImages.length; // Ciclo infinito
}

// Cambia lo sfondo ogni 10 secondi
setInterval(changeBackground, 10000);

// Imposta l'immagine iniziale
changeBackground();

// Caricamento dei componenti
function loadComponent(selector, file, callback) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.querySelector(selector).innerHTML = data;

      // Esegui callback dopo che l'HTML è stato iniettato nel DOM
      if (typeof callback === 'function') {
        setTimeout(callback, 0); // garantisce che il DOM sia aggiornato
      }
    })
    .catch(error => console.error('Errore nel caricamento:', error));
}

// Update updateNavbar function to include user ID in profile link
function updateNavbar(user) {
    if (!user) return;

    // Update cart and profile links with user ID
    const navLinks = {
        cart: document.querySelector('.client-only a[href="/cart.html"]'),
        profile: document.querySelector('.client-only a[href="/profile.html"]'),
        dashboard: document.querySelector('.artisan-only a[href="/dashboard.html"]'),
        admin: document.querySelector('.admin-only a[href="/admin.html"]')
    };

    if (user.ruolo_id === 1) {
        if (navLinks.cart) navLinks.cart.href = `/cart.html?id=${user.id}`;
        if (navLinks.profile) navLinks.profile.href = `/profile.html?id=${user.id}`;
    } else if (user.ruolo_id === 2 && navLinks.dashboard) {
        navLinks.dashboard.href = `/dashboard.html?id=${user.id}`;
    } else if (user.ruolo_id === 3 && navLinks.admin) {
        navLinks.admin.href = `/admin.html?id=${user.id}`;
    }

    // Update username in navbar
    const usernameElement = document.querySelector('#username');
    if (usernameElement) {
        usernameElement.textContent = user.username;
    }
}

// Update initNavbar function
async function initNavbar() {
    try {
        const navbarResponse = await fetch('/components/navbar.html');
        const navbarHtml = await navbarResponse.text();
        document.getElementById('navbar').innerHTML = navbarHtml;

        const rawUser = sessionStorage.getItem('user');
        if (rawUser) {
            const user = JSON.parse(rawUser);
            updateNavbar(user);

            // Show appropriate menu
            const userMenu = document.getElementById('userMenu');
            const guestMenu = document.getElementById('guestMenu');
            
            if (userMenu && guestMenu) {
                userMenu.classList.remove('d-none');
                guestMenu.classList.add('d-none');

                // Update navigation links visibility
                const clientLinks = document.querySelectorAll('.client-only');
                const artisanLinks = document.querySelectorAll('.artisan-only');
                const adminLinks = document.querySelectorAll('.admin-only');

                if (user.ruolo_id === 1) {
                    clientLinks.forEach(link => link.classList.remove('d-none'));
                } else if (user.ruolo_id === 2) {
                    artisanLinks.forEach(link => link.classList.remove('d-none'));
                } else if (user.ruolo_id === 3) {
                    adminLinks.forEach(link => link.classList.remove('d-none'));
                }
            }
        }
    } catch (error) {
        console.error('Error initializing navbar:', error);
    }
}

// Handle logout
document.getElementById('logoutButton')?.addEventListener('click', async function(e) {
    e.preventDefault();
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Errore durante il logout');
        }

        // Clear session storage
        sessionStorage.clear();
        console.log('Logout successful');
        
        // Redirect to login page
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Errore durante il logout. Riprova più tardi.');
    }
});

// Add navigation handlers
document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', function(e) {
        const path = this.getAttribute('href');
        const protectedPaths = ['profile.html', 'dashboard.html', 'admin.html', 'cart.html'];
        
        if (protectedPaths.some(p => path.includes(p))) {
            e.preventDefault();
            const rawUser = sessionStorage.getItem('user');
            
            if (!rawUser) {
                window.location.href = '/login.html';
                return;
            }

            try {
                const user = JSON.parse(rawUser);
                // Always allow cart for authenticated users
                if (path.includes('cart.html')) {
                    window.location.href = path;
                    return;
                }

                // Check role-based access
                if ((path.includes('profile.html') && user.ruolo_id === 1) ||
                    (path.includes('dashboard.html') && user.ruolo_id === 2) ||
                    (path.includes('admin.html') && user.ruolo_id === 3)) {
                    window.location.href = path;
                } else {
                    window.location.href = '/index.html';
                }
            } catch (error) {
                console.error('Navigation error:', error);
                sessionStorage.clear();
                window.location.href = '/login.html';
            }
        }
    });
});


//Gestione dei permessi di navigazione
function checkAuthForNavigation() {
    const protectedPages = {
        '/profile.html': [1],     // Cliente
        '/dashboard.html': [2],   // Artigiano
        '/admin.html': [3],      // Admin
        '/cart.html': [1, 2, 3]  // Tutti gli utenti autenticati
    };

    const currentPath = window.location.pathname;
    
    // Debug log
    console.log('Checking auth for:', currentPath);
    
    // Get user from session storage
    const rawUser = sessionStorage.getItem('user');
    console.log('Session user:', rawUser);

    // For protected pages, check authentication
    const isProtectedPage = Object.keys(protectedPages).some(page => 
        currentPath.toLowerCase().includes(page.toLowerCase())
    );

    if (isProtectedPage) {
        if (!rawUser) {
            console.log('No user found, redirecting to login');
            window.location.href = '/login.html';
            return;
        }

        try {
            const user = JSON.parse(rawUser);
            console.log('User role:', user.ruolo_id);

            // Find matching protected page
            const matchingPage = Object.keys(protectedPages).find(page => 
                currentPath.toLowerCase().includes(page.toLowerCase())
            );

            if (matchingPage && !protectedPages[matchingPage].includes(user.ruolo_id)) {
                console.log('Unauthorized access attempt');
                window.location.href = '/index.html';
                return;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            sessionStorage.clear();
            window.location.href = '/login.html';
            return;
        }
    }
}

// Carica la navbar e il footer
loadComponent('#navbar', '/components/navbar.html', initNavbar);
loadComponent('#footer', '/components/footer.html');

// Add this line after loadComponent calls
document.addEventListener('DOMContentLoaded', checkAuthForNavigation);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
});


/***********Pagina Catalogo ******************/
// Funzione per generare le stelle in base alla valutazione
function generateStars(rating) {
  let starsHTML = '';
  for (let i = 1; i <= 5; i++) {
    starsHTML += `<d class="fa fa-star ${i <= rating ? 'checked' : ''}"></d>`;
  }
  return starsHTML;
}

// Funzione per caricare e visualizzare le recensioni
function loadReviews(containerSelector, jsonFile) {
  fetch(jsonFile)
    .then((response) => response.json())
    .then((recensioni) => {
      const container = document.querySelector(containerSelector);

      // Filtra le recensioni visibili
      const recensioniVisibili = recensioni.filter((recensione) => recensione.visibilità);

      // Genera il contenuto HTML per ogni recensione
      recensioniVisibili.forEach((recensione) => {
        const recensioneHTML = `
          <div class="col-10 mb-4">
            <div class="card">
              <div class="card-body">
                <h5 class="card-title">${recensione.nome_utente}</h5>
                <div class="stars mb-2">
                  ${generateStars(recensione.valutazione)}
                </div>
                <p class="card-text">"${recensione.descrizione}"</p>
                <div class="card-footer d-flex justify-content-end align-items-center">
                  <p class="card-text"><small class="text-muted">${recensione.data}</small></p>
                </div>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', recensioneHTML);
      });
    })
    .catch((error) => console.error('Errore nel caricamento delle recensioni:', error));
}


/************** Modale Conferma ordine **************/
//Gestione del metodo di pagamento
document.addEventListener('DOMContentLoaded', () => {
  const paymentDetails = document.getElementById('paymentDetails');

  // Funzione per aggiornare i dettagli del metodo di pagamento
  const updatePaymentDetails = (method) => {
    paymentDetails.innerHTML = ''; // Svuota il contenitore

    if (method === 'creditCard') {
      paymentDetails.innerHTML = `
        <div class="mb-3">
          <label for="cardNumber" class="form-label">Numero Carta</label>
          <input type="text" class="form-control" id="cardNumber" placeholder="Inserisci il numero della carta">
        </div>
        <div class="d-flex justify-content-between">
          <div class="mb-3">
            <label for="cardExpiry" class="form-label">Data di Scadenza</label>
            <input type="text" class="form-control" id="cardExpiry" placeholder="MM/AA">
          </div>
          <div class="mb-3 ms-2">
            <label for="cardCVV" class="form-label">CVV</label>
            <input type="text" class="form-control" id="cardCVV" placeholder="Inserisci il CVV">
          </div>
        </div>
      `;
    } else if (method === 'paypal') {
      paymentDetails.innerHTML = `
        <div class="mb-3 text-center">
          <svg width="48px" height="48px" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <circle cx="24" cy="24" r="20" fill="#9d7c5f"></circle> <path d="M32.3305 18.0977C32.3082 18.24 32.2828 18.3856 32.2542 18.5351C31.2704 23.5861 27.9046 25.331 23.606 25.331H21.4173C20.8916 25.331 20.4486 25.7127 20.3667 26.2313L19.2461 33.3381L18.9288 35.3527C18.8755 35.693 19.1379 36 19.4815 36H23.3634C23.8231 36 24.2136 35.666 24.286 35.2127L24.3241 35.0154L25.055 30.3772L25.1019 30.1227C25.1735 29.6678 25.5648 29.3338 26.0245 29.3338H26.6051C30.3661 29.3338 33.3103 27.8068 34.1708 23.388C34.5303 21.5421 34.3442 20.0008 33.393 18.9168C33.1051 18.59 32.748 18.3188 32.3305 18.0977Z" fill="white" fill-opacity="0.6"></path> <path d="M31.3009 17.6871C31.1506 17.6434 30.9955 17.6036 30.8364 17.5678C30.6766 17.5328 30.5127 17.5018 30.3441 17.4748C29.754 17.3793 29.1074 17.334 28.4147 17.334H22.5676C22.4237 17.334 22.2869 17.3666 22.1644 17.4254C21.8948 17.5551 21.6944 17.8104 21.6459 18.1229L20.402 26.0013L20.3662 26.2311C20.4481 25.7126 20.8911 25.3308 21.4168 25.3308H23.6055C27.9041 25.3308 31.2699 23.5851 32.2537 18.5349C32.2831 18.3854 32.3078 18.2398 32.33 18.0975C32.0811 17.9655 31.8115 17.8525 31.5212 17.7563C31.4496 17.7324 31.3757 17.7094 31.3009 17.6871Z" fill="white" fill-opacity="0.8"></path> <path d="M21.6461 18.1231C21.6946 17.8105 21.895 17.5552 22.1646 17.4264C22.2879 17.3675 22.4239 17.3349 22.5678 17.3349H28.4149C29.1077 17.3349 29.7542 17.3803 30.3444 17.4757C30.513 17.5027 30.6768 17.5338 30.8367 17.5687C30.9957 17.6045 31.1508 17.6443 31.3011 17.688C31.3759 17.7103 31.4498 17.7334 31.5222 17.7564C31.8125 17.8527 32.0821 17.9664 32.331 18.0976C32.6237 16.231 32.3287 14.9601 31.3194 13.8093C30.2068 12.5424 28.1986 12 25.629 12H18.169C17.6441 12 17.1963 12.3817 17.1152 12.9011L14.0079 32.5969C13.9467 32.9866 14.2473 33.3381 14.6402 33.3381H19.2458L20.4022 26.0014L21.6461 18.1231Z" fill="white"></path> </g></svg>
        </div>  
        <div class="mb-3">
          <label for="paypalEmail" class="form-label">Email PayPal</label>
          <input type="email" class="form-control" id="paypalEmail" placeholder="Inserisci la tua email PayPal">
        </div>
        <div class="mb-3">
          <label for="paypalPassword" class="form-label">Password</label>
          <input type="password" class="form-control" id="paypalPassword" placeholder="Inserisci la tua password">
        </div>
      `;
    } else if (method === 'bankTransfer') {
      paymentDetails.innerHTML = `
        <div class="mb-3">
          <p>Effettua il bonifico al seguente IBAN:</p>
          <p><strong>IT60X0542811101000000123456</strong></p>
          <p>Intestato a: Artigianato Online</p>
        </div>
        <div class="mb-3">
          <label for="transferReference" class="form-label">Riferimento Bonifico</label>
          <input type="text" class="form-control" id="transferReference" placeholder="Inserisci il riferimento del bonifico">
        </div>
      `;
    }
  };

  // Event listener per i cambiamenti nel metodo di pagamento
  document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      updatePaymentDetails(e.target.value);
    });
  });

  // Imposta il metodo di pagamento iniziale
  updatePaymentDetails('creditCard');
});