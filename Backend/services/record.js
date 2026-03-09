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
        accreditationDate: enrollment?.accreditationDate, // Add missing accreditation date
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

    // Sort by course name or assessment name
    fullRecord.sort((a, b) => {
      const nameA = a.courseName || a.name || a.experienceDescription || '';
      const nameB = b.courseName || b.name || b.experienceDescription || '';
      return nameA.localeCompare(nameB);
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
      pathwayEmployee.pathwayID,
      pathwayEmployee.pathway.pathways_courses.map(pc => pc.courseID),
      pathwayEmployee.pathway.pathways_assessments.map(pa => pa.assessmentID),
      pathwayEmployee.pathway.pathways_experience_templates.map(pet => pet.experience_templateID)
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
async function requestReferee(refereeRequest, token){
  try {
    const employeeEmail = jwtDecode(token).email;
    const myArray = refereeRequest.split(",");
    const refereeID = parseInt(myArray[0]);
    const employee_experienceID = parseInt(myArray[1]);
    
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
async function recordOwnFeedback(recordOwnFeedback, experienceID, token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
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
        employee_experienceID: parseInt(experienceID)
      },
      data: {
        employeeText: recordOwnFeedback
      }
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