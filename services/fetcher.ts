
// Fetch wrapper for making HTTP requests to the backend

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface FetcherOptions extends RequestInit {
    token?: string;
}

const getAuthToken = () => sessionStorage.getItem('authToken');

class Fetcher {
    private async request<T>(endpoint: string, options: FetcherOptions = {}): Promise<T> {
        const token = options.token || getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                // Handle unauthorized (e.g., token expired)
                // Could dispatch an event or simple console log for now
                console.warn("Unauthorized access. Token might be expired.");
            }

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || `Error ${response.status}: ${response.statusText}`);
            }

            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : {} as T;

        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    get<T>(endpoint: string, token?: string) {
        return this.request<T>(endpoint, { method: 'GET', token });
    }

    post<T>(endpoint: string, body: any, token?: string) {
        return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), token });
    }

    put<T>(endpoint: string, body: any, token?: string) {
        return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), token });
    }

    delete<T>(endpoint: string, body?: any, token?: string) {
        return this.request<T>(endpoint, { 
            method: 'DELETE', 
            body: body ? JSON.stringify(body) : undefined,
            token 
        });
    }
}

export const fetcher = new Fetcher();
