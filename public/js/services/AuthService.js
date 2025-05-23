class AuthService {
    static setSession(token, user, expiresIn) {
        const expiresAt = new Date().getTime() + expiresIn;
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('expiresAt', expiresAt.toString());

        // Set timeout for auto logout
        setTimeout(() => this.logout(), expiresIn);
    }

    static logout() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('expiresAt');
        window.location.href = '/login.html';
    }

    static isAuthenticated() {
        const expiresAt = sessionStorage.getItem('expiresAt');
        return expiresAt && new Date().getTime() < parseInt(expiresAt);
    }

    static getUser() {
        if (!this.isAuthenticated()) {
            this.logout();
            return null;
        }
        return JSON.parse(sessionStorage.getItem('user'));
    }

    static getToken() {
        if (!this.isAuthenticated()) {
            this.logout();
            return null;
        }
        return sessionStorage.getItem('token');
    }

    static checkAuth() {
        if (this.isAuthenticated()) {
            const expiresAt = parseInt(sessionStorage.getItem('expiresAt'));
            const remaining = expiresAt - new Date().getTime();
            setTimeout(() => this.logout(), remaining);
            return true;
        }
        return false;
    }

    static async fetch(url, options = {}) {
        if (this.getToken()) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.getToken()}`
            };
        }
        return fetch(url, options);
    }
}