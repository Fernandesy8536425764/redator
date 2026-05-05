// API Client para integração com o back-end
const API_URL = 'http://localhost:8000';

class RedatorAPI {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    // Helper para fazer requisições
    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error('Sessão expirada. Faça login novamente.');
                }
                const error = await response.json();
                throw new Error(error.detail || 'Erro na requisição');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ==================== AUTH ====================

    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Credenciais inválidas');
        }

        const data = await response.json();
        this.token = data.access_token;
        localStorage.setItem('auth_token', this.token);
        return data;
    }

    async register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    async getCurrentUser() {
        if (!this.token) return null;
        try {
            return await this.request('/auth/me');
        } catch {
            return null;
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ==================== DOCUMENTS ====================

    async createDocument(document) {
        return this.request('/documents', {
            method: 'POST',
            body: JSON.stringify(document)
        });
    }

    async getDocuments() {
        return this.request('/documents');
    }

    async getDocument(id) {
        return this.request(`/documents/${id}`);
    }

    async updateDocument(id, document) {
        return this.request(`/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(document)
        });
    }

    async deleteDocument(id) {
        return this.request(`/documents/${id}`, {
            method: 'DELETE'
        });
    }

    async saveOrUpdate(document) {
        return this.request('/documents/save-or-update', {
            method: 'POST',
            body: JSON.stringify(document)
        });
    }
}

// Instância global da API
const api = new RedatorAPI();

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RedatorAPI, api };
}
