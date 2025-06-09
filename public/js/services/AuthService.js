class AuthService {
    static setSession(token, user) {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('auth_time', new Date().getTime());
    }

    static logout() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('auth_time');
    }

    static isAuthenticated() {
        return !!sessionStorage.getItem('token');
    }

    static getUser() {
        const user = sessionStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static getToken() {
        return sessionStorage.getItem('token');
    }

    static checkAuth() {
        const token = this.getToken();
        if (!token) return false;

        const authTime = sessionStorage.getItem('auth_time');
        if (authTime) {
            const elapsed = (new Date().getTime() - parseInt(authTime)) / 1000;
            if (elapsed > 30 * 60) { // 30 minutes
                this.logout();
                return false;
            }
        }

        return true;
    }

    static handleAuthError() {
        this.logout();
        window.location.href = '/login.html';
    }

    static checkTokenExpiration(response) {
        // Non intercettare 401 durante il processo di login
        if (window.isLoggingIn) {
            return true; // Lascia che il login handler gestisca l'errore
        }
        
        if (response.status === 401) {
            this.handleAuthError();
            return false;
        }
        return true;
    }

    static handleTokenExpiration(response) {
        if (!response) return false;
        
        if (window.isLoggingIn) {
            return false; // Non intercettare durante il login
        }
        
        if (response.status === 401) {
            this.showSessionExpiredModal();
            return true;
        }
        return false;
    }

    static async fetchWithAuth(url, options = {}) {
        if (url.includes('/auth/login')) {
            return fetch(url, options);
        }

        const token = this.getToken();
        if (!token) {
            this.handleAuthError();
            return null;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!this.checkTokenExpiration(response)) {
                return null;
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    static showSessionExpiredModal() {
        // Rimuovi eventuali modali esistenti
        const existingModal = document.getElementById('sessionExpiredModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Carica il modale dinamicamente
        fetch('/components/navbar.html')
            .then(response => response.text())
            .then(html => {
                const div = document.createElement('div');
                div.innerHTML = html;
                const modal = div.querySelector('#sessionExpiredModal');
                
                if (modal) {
                    document.body.appendChild(modal);
                    const bsModal = new bootstrap.Modal(modal);
                    bsModal.show();

                    // Avvia countdown
                    let countdown = 5;
                    const countdownEl = document.getElementById('countdown');
                    
                    const timer = setInterval(() => {
                        countdown--;
                        if (countdownEl) countdownEl.textContent = countdown;
                        
                        if (countdown <= 0) {
                            clearInterval(timer);
                            this.logout();
                            window.location.href = '/login.html';
                        }
                    }, 1000);
                }
            });
    }
}