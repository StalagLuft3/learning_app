
import { fetchData } from './api';

const API_BASE_URL = "http://localhost:5000";

const extractEmployeesIDList = (data) => {
    if (!Array.isArray(data)) {
      return [];
    }
    let employeesIDList = [];
    for (let i = 0; i < data.length; i++) {
      employeesIDList.push(data[i].employeeID);
    }
    return employeesIDList;
  };
  
const extractEmployeesExperienceIDList = (data) => {
    if (!Array.isArray(data)) {
      return [];
    }
    let employeesExperienceIDList = [];
    for (let i = 0; i < data.length; i++) {
      employeesExperienceIDList.push(data[i].employee_experienceID);
    }
    return employeesExperienceIDList;
  };
  
const filterAwaitingFeedbackIndices = (data) => {
    if (!Array.isArray(data)) {
      return [];
    }
    let awaitingFeedbackFilter = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].refereeText == null) {
        awaitingFeedbackFilter.push(i);
      }
    }
    return awaitingFeedbackFilter;
  };
  
const filterFeedbackList = (data) => {
    if (!Array.isArray(data)) {
      return [];
    }
    let filteredFeedbackList = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].refereeText == null) {
        filteredFeedbackList.push(data[i]);
      }
    }
    return filteredFeedbackList;
  };
  
  /**
   * Update item status via API call
   * @param {string} itemType - 'experience' or 'assessment'
   * @param {number} itemId - ID of the item to update
   * @param {Object} updateData - Data for the update (status, score, refereeText, etc.)
   * @returns {Promise} API response
   */
  const updateItemStatus = async (itemType, itemId, updateData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/update-item-status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          itemType,
          itemId,
          ...updateData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to update item status:', error);
      throw error;
    }
  };

  /**
   * Fetch items that need referee attention
   * @param {number} refereeId - ID of the referee
   * @returns {Promise} API response with experiences and assessments
   */
  const fetchRefereeItems = async (refereeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/referee-items/${refereeId}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch referee items:', error);
      throw error;
    }
  };

  export { 
    extractEmployeesIDList, 
    extractEmployeesExperienceIDList, 
    filterAwaitingFeedbackIndices, 
    filterFeedbackList,
    updateItemStatus,
    fetchRefereeItems
  };