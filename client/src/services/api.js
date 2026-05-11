import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let csrfToken = null;

export async function refreshCsrfToken() {
  const response = await api.get('/csrf-token');
  csrfToken = response.data.token;
}

api.interceptors.request.use(config => {
  if (csrfToken) {
    config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});

export default api;
