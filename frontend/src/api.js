const API_URL = 'http://localhost:8000';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }

    const errorText = await response.text();
    console.error("API ERROR:", errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

// Auth
export const login = async (username, password) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};

export const getCurrentUser = () => fetchWithAuth('/users/me');

// Alerts
export const getAlerts = () => fetchWithAuth('/alerts/');
export const getTodayAlerts = () => fetchWithAuth('/alerts/today');
export const getAlertStats = () => fetchWithAuth('/alerts/stats');
export const deleteAlert = (alertId) =>
  fetchWithAuth(`/alerts/${alertId}`, { method: 'DELETE' });

// Employees
export const getEmployees = () => fetchWithAuth('/employees/');
export const createEmployee = (formData) =>
  fetchWithAuth('/employees/', {
    method: 'POST',
    body: formData,
  });
export const deleteEmployee = (name) =>
  fetchWithAuth(`/employees/${name}`, { method: 'DELETE' });

// Video Detection
export const uploadVideo = (formData) =>
  fetchWithAuth('/detect/video', {
    method: 'POST',
    body: formData,
  });

// WebSocket
export const createWebSocket = () => {
  return new WebSocket(`ws://localhost:8000/ws`);
};