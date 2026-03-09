function recordStats(fullRecord) {
    if (!Array.isArray(fullRecord)) {
      return { totalItems: 0, totalDuration: 0, statsString: '0 / 0 Items ( 0 / 0 Days )', expiredItems: 0 };
    }
    let completedItems = 0;
    let completedDays = 0;
    let incompleteItems = 0;
    let incompleteDays = 0;
    let expiredItems = 0;
  
    for (let i = 0; i < fullRecord.length; i++) {
      if (!fullRecord[i]) continue; // Skip null/undefined items
      
      if (fullRecord[i]["currentStatus"] === "Enrolled" || fullRecord[i]["currentStatus"] === "Attempted " || fullRecord[i]["currentStatus"] === "Awaiting Feedback") {
        incompleteItems += 1;
        incompleteDays += fullRecord[i]["duration"] || 0;
      } else if (fullRecord[i]["currentStatus"] === "Completed") {
        completedItems += 1;
        completedDays += fullRecord[i]["duration"] || 0;
      } else if (fullRecord[i]["currentStatus"] === "Expired") {
        expiredItems += 1;
        incompleteDays += fullRecord[i]["duration"] || 0;
      }
    }
  
    let totalItems = incompleteItems + expiredItems + completedItems;
    let totalDuration = incompleteDays + completedDays;
    let statsString = completedItems + " / " + totalItems + " Items ( " + completedDays + " / " + totalDuration + " Days )";
  
    return { totalItems, totalDuration, statsString, expiredItems };
  }

function courseRecordStats(fullRecord, getStatusDisplay) {
  if (!Array.isArray(fullRecord)) {
    return {
      completedCourses: 0,
      totalCourses: 0,
      completedCourseDuration: 0,
      totalCourseDuration: 0,
      courseStatsString: '0 / 0 Items ( 0 / 0 Days )'
    };
  }
  
  console.log('courseRecordStats - Processing fullRecord:', fullRecord.length, 'items');
  
  let completedCourses = 0;
  let totalCourses = 0;
  let completedCourseDuration = 0;
  let totalCourseDuration = 0;
  
  for (let i = 0; i < fullRecord.length; i++) {
    const record = fullRecord[i];
    
    // Count ALL items (courses, assessments, experiences) - skip only if null/undefined
    if (!record) {
      console.log(`Item ${i} skipped - null/undefined`);
      continue;
    }
    
    // Determine item type for logging
    let itemType = 'Unknown';
    if (record.courseID) itemType = 'Course';
    else if (record.assessmentID) itemType = 'Assessment';  
    else if (record.employee_experienceID) itemType = 'Experience';
    
    console.log(`${itemType} ${i}: ${record.courseName || record.name || record.experienceDescription || 'Unknown'}, Status: ${record.currentStatus}, Duration: ${record.duration}`);
    
    // Use the same status logic as the UI
    const statusInfo = getStatusDisplay ? getStatusDisplay(record) : null;
    const displayStatus = statusInfo ? statusInfo.status : record.currentStatus;
    const isCompleted = displayStatus === "Completed" || 
                       displayStatus === "Passed" || 
                       (statusInfo && statusInfo.color === "success");
    
    totalCourses += 1;
    totalCourseDuration += record["duration"] || 0;
    
    console.log(`  -> Display Status: "${displayStatus}" | UI Status Color: ${statusInfo?.color} | Is Completed: ${isCompleted}`);
                        
    if (isCompleted) {
      completedCourses += 1;
      completedCourseDuration += record["duration"] || 0;
      console.log(`  -> ✅ COUNTED as completed ${itemType.toLowerCase()} (display status: ${displayStatus})`);
    } else {
      console.log(`  -> ❌ NOT counted as completed (display status: "${displayStatus}")`);
    }
  }
  
  console.log(`\n=== FINAL CALCULATION ===`);
  console.log(`Completed Items: ${completedCourses}`);
  console.log(`Total Items: ${totalCourses}`);
  console.log(`Completed Duration: ${completedCourseDuration} days`);
  console.log(`Total Duration: ${totalCourseDuration} days`);
  console.log(`Final stats: ${completedCourses}/${totalCourses} items, ${completedCourseDuration}/${totalCourseDuration} days`);
  console.log(`=========================\n`);
  
  const courseStatsString = `${completedCourses} / ${totalCourses} Items ( ${completedCourseDuration} / ${totalCourseDuration} Days )`;
  
  return {
    completedCourses,
    totalCourses,
    completedCourseDuration,
    totalCourseDuration,
    courseStatsString
  };
}

function getStandardizedStatusLabel(status) {
  if (!status) return "Unknown";
  if (status.toLowerCase() === "success") return "Completed";
  if (status.toLowerCase() === "passed") return "Completed";
  if (status.toLowerCase() === "completed") return "Completed";
  return status; // Return original status for all other cases
}

const getSelectedPathwayList = (fullRecord, myPathwayDetails, selectedPathwayID) => {
  if (!Array.isArray(fullRecord) || !Array.isArray(myPathwayDetails)) {
    return [];
  }
  let selectedPathwayList = [];
  for (let i = 0; i < myPathwayDetails.length; i++) {
    if (!myPathwayDetails[i] || !Array.isArray(myPathwayDetails[i])) continue;
    
    if (myPathwayDetails[i][0] == selectedPathwayID) {
      for (let j = 0; j < myPathwayDetails[i].length; j++) {
        if (j == 1 && Array.isArray(myPathwayDetails[i][j])) {
          const matchingCourses = myPathwayDetails[i][j].map(courseIDNumber =>
            fullRecord.find(obj => obj && obj.courseID === courseIDNumber)
          ).filter(Boolean); // Remove undefined matches
          selectedPathwayList = selectedPathwayList.concat(matchingCourses)
        } else if (j == 2 && Array.isArray(myPathwayDetails[i][j])) {
          const matchingAssessments = myPathwayDetails[i][j].map(assessmentIDNumber =>
            fullRecord.find(obj => obj && obj.assessmentID === assessmentIDNumber)
          ).filter(Boolean); // Remove undefined matches
          selectedPathwayList = selectedPathwayList.concat(matchingAssessments)
        }
        else if (j == 3 && Array.isArray(myPathwayDetails[i][j])) {
          const matchingExperiences = myPathwayDetails[i][j].map(employee_experience_TemplateIDNumber =>
            fullRecord.find(obj => obj && obj.experience_templateID === employee_experience_TemplateIDNumber)
          ).filter(Boolean); // Remove undefined matches
          selectedPathwayList = selectedPathwayList.concat(matchingExperiences)
        }
      }
    }
  }
  return selectedPathwayList;
};

const getEnrolledPathwaysList = (enrolledPathways) => {
  if (!Array.isArray(enrolledPathways)) {
    return [];
  }
  let enrolledPathwaysList = [];
  for (let i = 0; i < enrolledPathways.length; i++) {
    if (!enrolledPathways[i]) continue; // Skip null/undefined items
    
    let pathwayName = enrolledPathways[i].pathwayName || 'Unknown Pathway';
    let pathwayID = enrolledPathways[i].pathwayID;
    enrolledPathwaysList.push({ value: pathwayID, label: pathwayName });
  }
  return enrolledPathwaysList;
};
  
  export { recordStats, courseRecordStats, getStandardizedStatusLabel, getEnrolledPathwaysList, getSelectedPathwayList }