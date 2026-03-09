const API_BASE_URL = "http://localhost:5000";

export const fetchData = (endpoint) => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  })
  .then(res => res.json())
  .catch(err => {
    console.error(`Failed to fetch ${endpoint}: `, err);
    throw err;
  });
};