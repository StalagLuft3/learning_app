import { hasExpired } from './commonUtilities';

/**
 * Get computed status for a course based on current data
 * @param {Object} course - Course enrollment object from database
 * @returns {Object} { status: string, color: string, canUpdate: boolean }
 */
export const getCourseStatus = (course) => {
  switch (course.currentStatus) {
    case 'Enrolled':
      return { 
        status: 'Enrolled', 
        color: 'neutral',
        canUpdate: true // Manager can change to In Progress or Completed
      };
    case 'In Progress':
      return { 
        status: 'In Progress', 
        color: 'warning',
        canUpdate: true // Manager can change to Completed
      };
    case 'Completed':
      return { 
        status: 'Completed', 
        color: 'success',
        canUpdate: false // Already completed
      };
    case 'Expired':
      return { 
        status: 'Expired', 
        color: 'danger',
        canUpdate: false // Expired, cannot update
      };
    default:
      return { 
        status: course.currentStatus || 'Unknown', 
        color: 'neutral',
        canUpdate: true 
      };
  }
};

/**
 * Get computed status for an experience based on current data
 * @param {Object} experience - Experience object from database
 * @returns {Object} { status: string, color: string, canUpdate: boolean }
 */
export const getExperienceStatus = (experience) => {
  if (!experience.employeeText) {
    return { 
      status: 'Enrolled', 
      color: 'neutral',
      canUpdate: false // Can't update until employee provides text
    };
  }
  
  if (!experience.refereeID) {
    return { 
      status: 'Referee Required', 
      color: 'warning',
      canUpdate: false // Need referee assignment first
    };
  }
  
  if (!experience.refereeText) {
    return { 
      status: 'Awaiting feedback', 
      color: 'warning',
      canUpdate: true // Referee can provide feedback now
    };
  }
  
  return { 
    status: 'Completed', 
    color: 'success',
    canUpdate: false // Already completed
  };
};

/**
 * Get computed status for an assessment based on current data
 * @param {Object} assessment - Assessment object from database
 * @returns {Object} { status: string, color: string, canUpdate: boolean }
 */
export const getAssessmentStatus = (assessment) => {
  // No score recorded yet
  if (!assessment.scoreAchieved) {
    if (assessment.currentStatus === "Attempted") {
      return { 
        status: 'Attempted', 
        color: 'warning',
        canUpdate: true 
      };
    } else if (assessment.currentStatus === "Passed") {
      return { 
        status: 'Passed', 
        color: 'success',
        canUpdate: false // Already passed
      };
    } else if (assessment.currentStatus === "Expired") {
      return { 
        status: 'Expired', 
        color: 'danger',
        canUpdate: false // Expired
      };
    } else {
      return { 
        status: assessment.currentStatus || 'Enrolled', 
        color: 'neutral',
        canUpdate: true // Can record score
      };
    }
  }
  
  // Has score - determine based on passing score and expiry
  if (assessment.scoreAchieved !== null && assessment.scoreAchieved !== undefined) {
    const expiry = assessment.expiry || "None";
    
    if (assessment.scoreAchieved >= assessment.passing_score) {
      // Check if expired
      if (expiry !== "None" && hasExpired(assessment.recordDate, expiry)) {
        return { 
          status: 'Expired', 
          color: 'danger',
          canUpdate: false 
        };
      }
      return { 
        status: 'Passed', 
        color: 'success',
        canUpdate: false 
      };
    } else {
      // Score below passing - this is an attempted that can be retried
      return { 
        status: 'Attempted', 
        color: 'warning',
        canUpdate: true // Can re-attempt
      };
    }
  }
  
  return { 
    status: 'Unknown', 
    color: 'neutral',
    canUpdate: false 
  };
};

/**
 * Determine if current user can update the status of an item
 * @param {Object} item - Experience, course enrollment, or assessment object
 * @param {Object} currentUser - Current logged-in user
 * @returns {boolean}
 */
export const canUpdateStatus = (item, currentUser) => {
  console.log('canUpdateStatus check:', {
    item: item,
    currentUser: currentUser,
    hasExperience: !!item?.employee_experienceID,
    hasCourse: !!item?.employee_courseID,
    hasAssessment: !!item?.employee_assessmentID
  });
  
  if (!item || !currentUser) {
    console.log('canUpdateStatus: Missing item or currentUser');
    return false;
  }

  // For experiences - check if user is assigned referee
  if (item.employee_experienceID) {
    const status = getExperienceStatus(item);
    const canUpdate = item.refereeID === currentUser.employeeID && status.canUpdate;
    console.log('Experience update check:', { refereeID: item.refereeID, currentUserID: currentUser.employeeID, canUpdate });
    return canUpdate;
  }
  
  // For course enrollments - check if user is course manager
  if (item.employee_courseID) {
    const status = getCourseStatus(item);
    const canUpdate = item.courseManagerID === currentUser.employeeID && status.canUpdate;
    console.log('Course update check:', { courseManagerID: item.courseManagerID, currentUserID: currentUser.employeeID, canUpdate });
    return canUpdate;
  }
  
  // For assessments - check if user is assessment manager
  if (item.employee_assessmentID) {
    const status = getAssessmentStatus(item);
    const canUpdate = item.manager_ID === currentUser.employeeID && status.canUpdate;
    console.log('Assessment update check:', { managerID: item.manager_ID, currentUserID: currentUser.employeeID, canUpdate });
    return canUpdate;
  }

  console.log('canUpdateStatus: No matching item type found');
  return false;
};

/**
 * Get items that need manager attention for a specific manager
 * @param {Array} items - Array of experiences, courses, or assessments
 * @param {number} managerId - ID of the manager
 * @returns {Array} Filtered items needing manager attention
 */
export const getRefereeActionItems = (items, managerId) => {
  return items.filter(item => {
    if (item.employee_experienceID) {
      // Experience items
      const status = getExperienceStatus(item);
      return item.refereeID === managerId && status.canUpdate;
    }
    
    if (item.employee_courseID) {
      // Course enrollment items
      const status = getCourseStatus(item);
      return item.courseManagerID === managerId && status.canUpdate;
    }
    
    if (item.employee_assessmentID) {
      // Assessment items
      const status = getAssessmentStatus(item);
      return item.manager_ID === managerId && status.canUpdate;
    }
    
    return false;
  });
};

/**
 * Get display information for status rendering
 * @param {Object} item - Experience, course enrollment, or assessment object
 * @returns {Object} { status, color, icon }
 */
export const getStatusDisplay = (item) => {
  // Add null safety check
  if (!item) {
    return {
      status: 'Unknown',
      color: 'neutral',
      canUpdate: false
    };
  }
  
  let statusInfo;
  
  if (item.employee_experienceID) {
    statusInfo = getExperienceStatus(item);
  } else if (item.employee_courseID) {
    statusInfo = getCourseStatus(item);
  } else if (item.employee_assessmentID) {
    statusInfo = getAssessmentStatus(item);
  } else {
    return { status: 'Unknown', color: 'neutral', canUpdate: false };
  }
  
  return statusInfo;
};