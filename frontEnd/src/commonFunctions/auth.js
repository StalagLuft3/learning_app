// Authentication utilities for checking and managing auth state
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Check if user has a valid authentication token
// Since we use HttpOnly cookies, we can't access them directly with JS
// So we need to verify with the backend
export const isAuthenticated = async () => {
  try {
    console.log('Making authentication check request to:', `${API_BASE_URL}/Auth/verify`);
    const response = await fetch(`${API_BASE_URL}/Auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Auth verification response:', response.status, response.ok);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Auth verification result:', result);
      return true;
    } else {
      const errorResult = await response.text();
      console.log('Auth verification failed:', errorResult);
      return false;
    }
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
};

// Verify token with backend (same as isAuthenticated now)
export const verifyToken = async () => {
  return await isAuthenticated();
};

// Clear authentication data
export const clearAuth = () => {
  Cookies.remove('x-auth-token');
};

// Logout function that calls backend and redirects
export const logout = async () => {
  try {
    console.log('Logging out user...');
    const response = await fetch(`${API_BASE_URL}/Auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Logout response:', response.status);
    
    // Clear local auth data regardless of server response
    clearAuth();
    
    // Redirect to login
    redirectToLogin();
    
  } catch (error) {
    console.error('Logout error:', error);
    // Even if server call fails, clear local data and redirect
    clearAuth();
    redirectToLogin();
  }
};

// Redirect to login
export const redirectToLogin = () => {
  window.location.href = '/Login';
};