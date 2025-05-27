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

        // Optional: check token expiration
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
        if (response.status === 401) {
            this.handleAuthError();
            return false;
        }
        return true;
    }

    static async fetchWithAuth(url, options = {}) {
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
}