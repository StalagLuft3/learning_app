const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

// GET / READ
async function loadRecord(token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true, username: true, role: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Get courses with enrollment info
    const coursesRecord = await prisma.courses.findMany({
      where: {
        employees_courses: {
          some: {
            employeeID: employee.employeeID
          }
        }
      },
      include: {
        employees_courses: {
          where: {
            employeeID: employee.employeeID
          }
        }
      }
    });

    // Get assessments with enrollment info
    const assessmentRecord = await prisma.assessments.findMany({
      where: {
        employees_assessments: {
          some: {
            employeeID: employee.employeeID
          }
        }
      },
      include: {
        employees_assessments: {
          where: {
            employeeID: employee.employeeID
          }
        },
        manager: {
          select: { username: true, role: true }
        }
      }
    });

    // Get experience records
    const experienceRecord = await prisma.employees_experiences.findMany({
      where: {
        employeeID: employee.employeeID
      },
      include: {
        referee: {
          select: { username: true, role: true }
        }
      }
    });

    // Flatten the nested data structures for frontend consumption
    let fullRecord = [];
    
    // Process courses - flatten the enrollment data
    coursesRecord.forEach(course => {
      const enrollment = course.employees_courses[0]; // Should only be one per user
      fullRecord.push({
        ...course,
        employee_courseID: enrollment?.employee_courseID,
        currentStatus: enrollment?.currentStatus,
        recordDate: enrollment?.recordDate,
        score: enrollment?.score, // Add missing score field
        completionDate: enrollment?.completionDate, // Add missing completion date field
        // Mark as course for frontend logic
        courseID: course.courseID
      });
    });
    
    // Process assessments - flatten the enrollment data  
    assessmentRecord.forEach(assessment => {
      const enrollment = assessment.employees_assessments[0]; // Should only be one per user
      fullRecord.push({
        ...assessment,
        employee_assessmentID: enrollment?.employee_assessmentID,
        currentStatus: enrollment?.currentStatus,
        recordDate: enrollment?.recordDate,
        scoreAchieved: enrollment?.score, // Fix: mapping from 'score' field in database
        completionDate: enrollment?.completionDate, // Add missing completion date
        // Remove accreditationDate - using completionDate instead
        username: assessment.manager?.username,
        role: assessment.manager?.role,
        // Mark as assessment for frontend logic
        assessmentID: assessment.assessmentID
      });
    });
    
    // Process experiences - add referee info
    experienceRecord.forEach(experience => {
      fullRecord.push({
        ...experience,
        refereeUsername: experience.referee?.username,
        refereeRole: experience.referee?.role,
        // Mark as experience for frontend logic
        employee_experienceID: experience.employee_experienceID
      });
    });

    // Sort by date (most recent first)
    fullRecord.sort((a, b) => {
      const dateA = new Date(a.recordDate || 0);
      const dateB = new Date(b.recordDate || 0);
      return dateB.getTime() - dateA.getTime(); // Descending order (most recent first)
    });

    return {
      fullRecord
    };
  } catch (error) {
    console.error('Error loading record:', error);
    throw error;
  }
}

// GET / ENROLLED PATHWAYS LIST
async function enrolledPathwaysList(token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true, username: true, role: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const enrolledPathways = await prisma.pathways.findMany({
      where: {
        pathways_employees: {
          some: {
            employeeID: employee.employeeID
          }
        }
      }
    });
    
    return {
      enrolledPathways
    };
  } catch (error) {
    console.error('Error loading enrolled pathways:', error);
    throw error;
  }
}

// GET / PATHWAY DETAILS
async function myPathwayDetails(token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true, username: true, role: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const myPathways = await prisma.pathways_employees.findMany({
      where: { employeeID: employee.employeeID },
      include: {
        pathways: {
          include: {
            pathways_courses: {
              select: { courseID: true }
            },
            pathways_assessments: {
              select: { assessmentID: true }
            },
            pathways_experience_templates: {
              select: { experience_templateID: true }
            }
          }
        }
      }
    });
    
    const myPathwayDetails = myPathways.map(pathwayEmployee => [
      pathwayEmployee.pathways.pathwayID,
      pathwayEmployee.pathways.pathways_courses.map(pc => pc.courseID),
      pathwayEmployee.pathways.pathways_assessments.map(pa => pa.assessmentID),
      pathwayEmployee.pathways.pathways_experience_templates.map(pet => pet.experience_templateID)
    ]);
    
    return {
      myPathwayDetails
    };
  } catch (error) {
    console.error('Error loading pathway details:', error);
    throw error;
  }
}

// GET / RETURN LIST OF EMAILS TO REQUEST REFEREES
async function referees(){
  try {
    const referees = await prisma.employees.findMany({
      select: {
        employeeID: true,
        username: true,
        role: true,
        email: true
      },
      orderBy: {
        username: 'asc'
      }
    });
    
    const refereesArray = referees.map(referee => ({
      label: referee.username,
      value: referee.employeeID.toString()
    }));
    
    return {
      refereesArray
    };
  } catch (error) {
    console.error('Error loading referees:', error);
    throw error;
  }
}

// // POST / REQUEST REFEREE
async function requestReferee(requestData, token){
  try {
    const employeeEmail = jwtDecode(token).email;
    let refereeID = null;
    let refereeRawValue = null;
    let employee_experienceID = null;

    if (typeof requestData === 'string') {
      const myArray = requestData.split(',');
      refereeRawValue = myArray[0];
      employee_experienceID = parseInt(myArray[1], 10);
    } else if (requestData && typeof requestData === 'object') {
      if (requestData.refereeRequest) {
        const myArray = String(requestData.refereeRequest).split(',');
        refereeRawValue = myArray[0];
        employee_experienceID = parseInt(myArray[1], 10);
      } else {
        refereeRawValue = requestData.refereeID;
        employee_experienceID = parseInt(requestData.experienceID, 10);
      }
    }

    // Referee can come through as ID or selected label/email depending on client control behavior.
    const parsedRefereeId = parseInt(refereeRawValue, 10);
    if (!Number.isNaN(parsedRefereeId)) {
      refereeID = parsedRefereeId;
    } else if (typeof refereeRawValue === 'string' && refereeRawValue.trim() !== '') {
      const trimmed = refereeRawValue.trim();
      const matchedReferee = await prisma.employees.findFirst({
        where: {
          OR: [
            { username: trimmed },
            { email: trimmed }
          ]
        },
        select: { employeeID: true }
      });
      refereeID = matchedReferee?.employeeID ?? null;
    }

    if (Number.isNaN(refereeID) || Number.isNaN(employee_experienceID)) {
      throw new Error('Invalid referee request payload');
    }

    if (!refereeID) {
      throw new Error('Unable to resolve selected referee');
    }
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const result = await prisma.employees_experiences.updateMany({
      where: {
        employeeID: employee.employeeID,
        employee_experienceID: employee_experienceID
      },
      data: {
        refereeID: refereeID
      }
    });

    if (!result || result.count === 0) {
      throw new Error('No matching experience found to update');
    }
    
    return result;
  } catch (error) {
    console.error('Error requesting referee:', error);
    throw error;
  }
}

// // POST / RECORD EXPERIENCE
async function recordExperience(experienceDate, experienceDuration, experienceDescription, experienceYourFeedback, experienceReferee, today, token){
  try {
    console.log('recordExperience: Starting with params:', {
      experienceDate, experienceDuration, experienceDescription, 
      experienceYourFeedback, experienceReferee, today
    });
    
    const employeeEmail = jwtDecode(token).email;
    console.log('recordExperience: Employee email from token:', employeeEmail);
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      console.log('recordExperience: Employee not found for email:', employeeEmail);
      throw new Error('Employee not found');
    }
    
    console.log('recordExperience: Found employee:', employee);
    
    let experienceData = {
      experienceDescription: experienceDescription,
      duration: parseFloat(experienceDuration),
      recordDate: today, // Use string directly as defined in schema
      employeeID: employee.employeeID
    };
    
    console.log('recordExperience: Initial experience data:', experienceData);
    
    if (experienceYourFeedback && experienceYourFeedback !== "") {
      experienceData.employeeText = experienceYourFeedback;
      console.log('recordExperience: Added employee feedback');
    }
    
    if (experienceReferee && experienceReferee !== "") {
      experienceData.refereeID = parseInt(experienceReferee);
      console.log('recordExperience: Added referee ID:', experienceData.refereeID);
    }
    
    console.log('recordExperience: Final experience data:', experienceData);
    
    const result = await prisma.employees_experiences.create({
      data: experienceData
    });
    
    console.log('recordExperience: Successfully created experience:', result);
    return result;
  } catch (error) {
    console.error('Error recording experience:', error);
    throw error;
  }
}

// // POST / RECORD OWN FEEDBACK
async function recordOwnFeedback(recordOwnFeedback, experienceID, experienceReferee, token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const updateData = {
      employeeText: recordOwnFeedback
    };

    if (experienceReferee !== undefined && experienceReferee !== null && experienceReferee !== '') {
      const parsedRefereeId = parseInt(experienceReferee, 10);
      if (!Number.isNaN(parsedRefereeId)) {
        updateData.refereeID = parsedRefereeId;
      }
    }

    const result = await prisma.employees_experiences.updateMany({
      where: {
        employeeID: employee.employeeID,
        employee_experienceID: parseInt(experienceID)
      },
      data: updateData
    });
    
    return result;
  } catch (error) {
    console.error('Error recording own feedback:', error);
    throw error;
  }
}


// EXPORTS
module.exports = {
    enrolledPathwaysList,
    loadRecord,
    myPathwayDetails,
    referees,
    requestReferee,
    recordExperience,
    recordOwnFeedback
}