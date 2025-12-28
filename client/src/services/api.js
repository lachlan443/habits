import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:7160/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Initialize token from localStorage if available
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

export default api;
