// Aggiungi all'inizio del file, dopo gli import
function createFetchInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch(...args);
            
            if (AuthService.handleTokenExpiration(response)) {
                return Promise.reject(new Error('Sessione scaduta'));
            }
            
            return response;
        } catch (error) {
            throw error;
        }
    };
}

// Add fetch interceptor for authentication
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    try {
        const [resource, config = {}] = args;
        
        // Don't add token for login/signup/public routes
        const publicRoutes = ['/', '/index.html', '/auth/login', '/auth/signup', '/categories', '/users/artisans'];
        const isPublicRoute = publicRoutes.some(route => resource.includes(route));
        
        // Special handling for login requests
        const isLoginRequest = resource.includes('/auth/login');
        
        if (!isPublicRoute && !isLoginRequest) {
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

        // For login requests, return response as-is (don't handle 401 here)
        if (isLoginRequest) {
            return response;
        }

        // Only handle 401 for authenticated requests, not public routes or login
        if (response.status === 401 && !isPublicRoute) {
            // Don't call AuthService.handleTokenExpiration during login
            if (!window.isLoggingIn) {
                AuthService.handleTokenExpiration(response);
            }
            return response; // Return the response so the calling code can handle it
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

// Update initNavbar function to include logout handling
async function initNavbar() {
    try {
        const navbarResponse = await fetch('/components/navbar.html');
        const navbarHtml = await navbarResponse.text();
        document.getElementById('navbar').innerHTML = navbarHtml;

        // Add logout handler after navbar is loaded
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', async function(e) {
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
                    
                    // Redirect to login page
                    window.location.href = '/login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Errore durante il logout. Riprova più tardi.');
                }
            });
        }

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

    
    // Get user from session storage
    const rawUser = sessionStorage.getItem('user');

    // For protected pages, check authentication
    const isProtectedPage = Object.keys(protectedPages).some(page => 
        currentPath.toLowerCase().includes(page.toLowerCase())
    );

    if (isProtectedPage) {
        if (!rawUser) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const user = JSON.parse(rawUser);

            // Find matching protected page
            const matchingPage = Object.keys(protectedPages).find(page => 
                currentPath.toLowerCase().includes(page.toLowerCase())
            );

            if (matchingPage && !protectedPages[matchingPage].includes(user.ruolo_id)) {
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
    createFetchInterceptor();
    checkAuthForNavigation();
    initNavbar();
});



// Messaggi di successo e errore
function showSuccessMessage(message) {
    const container = document.createElement('div');
    container.className = 'alert alert-success alert-dismissible fade show';
    container.setAttribute('role', 'alert');
    container.style.position = 'fixed';
    container.style.top = '80px';  // Position below navbar
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.minWidth = '300px';
    container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    container.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(container);
    
    // Trigger reflow to ensure animation plays
    container.offsetHeight;
    
    // Add fade in effect
    container.style.opacity = '1';
    
    setTimeout(() => {
        container.style.opacity = '0';
        setTimeout(() => container.remove(), 150);
    }, 3000);
}

function showErrorMessage(message) {
    const container = document.createElement('div');
    container.className = 'alert alert-danger alert-dismissible fade show';
    container.setAttribute('role', 'alert');
    container.style.position = 'fixed';
    container.style.top = '80px';  // Position below navbar
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.minWidth = '300px';
    container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    container.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(container);
    
    // Trigger reflow to ensure animation plays
    container.offsetHeight;
    
    // Add fade in effect
    container.style.opacity = '1';
    
    setTimeout(() => {
        container.style.opacity = '0';
        setTimeout(() => container.remove(), 150);
    }, 3000);
}
