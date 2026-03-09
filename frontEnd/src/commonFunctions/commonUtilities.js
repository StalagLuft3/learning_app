import { useState } from 'react';

const handleSearch = (value, setSearchSelection) => {
  setSearchSelection(value);
};

const clearSearch = (setSearchSelection) => {
  setSearchSelection("");
};

const navigationButtonClick = (navigate, path) => {
  navigate(path);
};

const getSearchResults = (data, searchSelection, titleKey, descriptionKey) => {
  if (!Array.isArray(data)) {
    return [];
  }
  if (searchSelection === "") {
    return data;
  } else {
    const searchTerm = searchSelection.toLowerCase();
    return data.filter(item => {
      if (!item) return false;
      
      const titleMatch = item[titleKey] && 
        item[titleKey].toLowerCase().includes(searchTerm);
      const descriptionMatch = descriptionKey && item[descriptionKey] && 
        item[descriptionKey].toLowerCase().includes(searchTerm);
      
      return titleMatch || descriptionMatch;
    });
  }
};

function hasExpired(recordDate, expiry) {
  if (!recordDate || typeof recordDate !== 'string') {
    return false;
  }
  let recordMonthDay = recordDate.substring(4,10);
  let recordYear = Number(recordDate.substring(0, 4));
  if (expiry != "None") {  
    let expiryDate =  String(recordYear+expiry)+recordMonthDay
    const today = new Date().toISOString().split('T')[0];
    return today > expiryDate;
  } else {
    return false
  }
}

const getCourseAssessmentOptions = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }
  const courseAssessmentOptions = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].courseName && !courseAssessmentOptions.some(option => option.label === data[i].courseName)) {
      courseAssessmentOptions.push({ label: data[i].courseName, value: data[i].courseName });
    }
  }
  return courseAssessmentOptions;
};


const countCoursesAndAssessments = (data) => {
  if (!Array.isArray(data)) {
    return { courseCount: 0, assessmentCount: 0 };
  }
  let courseCount = 0;
  let assessmentCount = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].courseID) {
      courseCount += 1;
    } else if (data[i] && data[i].assessmentID) {
      assessmentCount += 1;
    }
  }
  return { courseCount, assessmentCount };
};

const useSelectValue = () => {
  const [selectedValue, setSelectedValue] = useState('');

  const handleSelectChange = (event) => {
    const newValue = event.target.value;
    setSelectedValue(newValue);
  };

  return { selectedValue, handleSelectChange };
};

const countAwaitingFeedback = (data) => {
  if (!Array.isArray(data)) {
    return 0;
  }
  let awaitingFeedback = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].refereeText == null) {
      awaitingFeedback += 1;
    }
  }
  return awaitingFeedback;
};

export {  handleSearch, 
          clearSearch,
          countAwaitingFeedback, 
          navigationButtonClick, 
          getSearchResults, 
          hasExpired, 
          getCourseAssessmentOptions, 
          countCoursesAndAssessments,
          useSelectValue}