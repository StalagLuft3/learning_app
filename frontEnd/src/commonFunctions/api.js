const API_BASE_URL = "http://localhost:5000";

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle both 'error' and 'errors' response formats
      const errorMessage = errorData.error || errorData.errors || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// GET request
export const fetchData = (endpoint) => {
  return apiRequest(endpoint, { method: 'GET' });
};

// POST request
export const postData = (endpoint, data) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// PUT request
export const putData = (endpoint, data) => {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// DELETE request
export const deleteData = (endpoint) => {
  return apiRequest(endpoint, { method: 'DELETE' });
};