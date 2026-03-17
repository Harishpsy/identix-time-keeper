import axios from 'axios';
import { encrypt, decrypt } from './crypto';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://65.1.86.56/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the JWT token to headers and encrypt payload
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Encrypt payload if it's not a multipart form (file upload)
        if (config.data && !(config.data instanceof FormData)) {
            config.data = {
                encryptedData: encrypt(config.data)
            };
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle unauthorized errors and decrypt response
apiClient.interceptors.response.use(
    (response) => {
        if (response.data && response.data.encryptedData) {
            response.data = decrypt(response.data.encryptedData);
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
        }

        // Handle encrypted error responses if any
        if (error.response && error.response.data && error.response.data.encryptedData) {
            error.response.data = decrypt(error.response.data.encryptedData);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
