const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

// GET / PATHWAYSLIST
async function getPathwaysList(token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true, username: true, role: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const pathwaysList = await prisma.pathways.findMany({
      where: { pathwayManagerID: employee.employeeID }
    });
    
    return {
      pathwaysList
    };
  } catch (error) {
    console.error('Error loading pathways list:', error);
    throw error;
  }
}

// GET MANAGED PATHWAYS WITH ENROLLMENTS
async function getManagedPathways(managerId) {
  try {
    console.log('getManagedPathways: Loading pathways managed by:', managerId);
    
    const pathways = await prisma.pathways.findMany({
      where: {
        pathwayManagerID: managerId
      },
      include: {
        pathways_employees: {
          orderBy: {
            recordDate: 'desc'
          },
          include: {
            employees: {
              select: {
                employeeID: true,
                username: true,
                role: true,
                email: true
              }
            }
          }
        },
        pathways_courses: {
          include: {
            courses: true
          }
        },
        pathways_assessments: {
          include: {
            assessments: true
          }
        },
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      }
    });

    // Transform the data to match the expected format
    const transformedPathways = pathways.map(pathway => ({
      pathwayID: pathway.pathwayID,
      pathwayName: pathway.pathwayName,
      pathwayDescription: pathway.pathwayDescription,
      managerName: pathway.manager.username,
      managerRole: pathway.manager.role,
      enrollments: pathway.pathways_employees.map(enrollment => ({
        pathway_employeeID: enrollment.pathway_employeeID,
        employeeID: enrollment.employeeID,
        username: enrollment.employees.username,
        role: enrollment.employees.role,
        email: enrollment.employees.email,
        recordDate: enrollment.recordDate,
        pathwayID: enrollment.pathwayID,
        currentStatus: 'In Progress' // Default status for pathways
      })),
      courses: pathway.pathways_courses.map(pc => pc.courses),
      assessments: pathway.pathways_assessments.map(pa => pa.assessments)
    }));

    console.log('getManagedPathways: Found pathways:', transformedPathways.length);
    return { pathways: transformedPathways };
  } catch (error) {
    console.error('Error loading managed pathways:', error);
    throw error;
  }
}

// UPDATE PATHWAY ENROLLMENT
async function updatePathwayEnrollment(enrollmentId, updateData) {
  try {
    console.log('updatePathwayEnrollment: Updating enrollment:', enrollmentId, updateData);
    
    const updateFields = {};
    
    if (updateData.newStatus) {
      updateFields.enrollment_status = updateData.newStatus;
    }
    
    if (updateData.recordDate) {
      updateFields.recordDate = updateData.recordDate;
    }

    console.log('updatePathwayEnrollment: Update fields:', updateFields);

    const result = await prisma.pathways_employees.update({
      where: {
        pathway_employeeID: parseInt(enrollmentId)
      },
      data: updateFields
    });

    console.log('updatePathwayEnrollment: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating pathway enrollment:', error);
    throw error;
  }
}

// UPDATE PATHWAY DETAILS
async function updatePathway(pathwayID, updateData) {
  try {
    console.log('updatePathway: Updating pathway:', pathwayID, updateData);
    
    const updateFields = {};
    
    if (updateData.pathwayName) {
      updateFields.pathwayName = updateData.pathwayName;
    }
    
    if (updateData.pathwayDescription !== undefined) {
      updateFields.pathwayDescription = updateData.pathwayDescription;
    }

    console.log('updatePathway: Update fields:', updateFields);

    const result = await prisma.pathways.update({
      where: {
        pathwayID: pathwayID
      },
      data: updateFields
    });

    console.log('updatePathway: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating pathway:', error);
    throw error;
  }
}

module.exports = {
  getPathwaysList,
  getManagedCourses,
  updateCourseEnrollment,
  updateCourse,
  getManagedAssessments,
  updateAssessment,
  updateAssessmentEnrollment,
  updatePathway,
  getManagedPathways,
  updatePathwayEnrollment
}

//////////////////////////////////////////////



// async function getContents(token){
//   employeeEmail = jwtDecode(token).email
//   const eID = await db.query(
//     'SELECT employeeID, username, role FROM employees WHERE email = "'+employeeEmail+'";'
//   );
//   const coursesData = await db.query(
//     'SELECT * FROM courses WHERE courseID IN (SELECT DISTINCT courseID FROM pathways_courses WHERE pathwayID = 1);'
//   );
//   const experienceTemplatesData = await db.query(
//     'SELECT * FROM experience_templates WHERE experience_TemplateID IN (SELECT DISTINCT experience_TemplateID FROM pathways_experience_templates WHERE pathwayID = 1);'
//   );
//   const assessmentsData = await db.query(
//     'SELECT * FROM assessments WHERE assessmentID IN (SELECT DISTINCT assessmentID FROM pathways_assessments WHERE pathwayID = 1);'
//   );
//   const pathwayInfo = await db.query(
//     'SELECT * FROM pathways WHERE pathwayID = 1;'
//   );
//   let data = coursesData.concat(experienceTemplatesData)
//   data = data.concat(assessmentsData)
  
//   function sortByProperty(property){  
//     return function(a,b){   
//        if(a[property] > b[property])  
//           return 1;  
//        else if(a[property] < b[property])  
//           return -1;  
//        return 0;  
//     }  
//   }

//   data.sort(sortByProperty ("courseName"))
//   user = [employeeEmail, eID[0].employeeID]
//   pathway = pathwayInfo[0]
//   return {
//     data,user,pathway
//   }
// }


// // POST / EDIT PATHWAY
// async function editPathway(pID){
//   const pCourses = await db.query(
//     'SELECT courseID FROM pathways_courses WHERE pathwayID = '+pID+';'
//     );  
//   const pAssessments = await db.query(
//     'SELECT assessmentID FROM pathways_assessments WHERE pathwayID = '+pID+';'
//     );
//   const pExperienceTemplates = await db.query(
//     'SELECT experienceTemplateID FROM pathways_experience_templates WHERE pathwayID = '+pID+';'
//     ); 
//   console.log("C: ", pCourses,"\nA: ",pAssessments,"\nET:",pExperienceTemplates);
// }

// // // POST / ADD COURSE
// // async function addCourse(addCourse, token){
// //   employeeEmail = jwtDecode(token).email
// //   const eID = await db.query(
// //     'SELECT employeeID FROM employees WHERE email = "'+employeeEmail+'";'
// //     );  
// //   const result = await db.query(
// //     'INSERT INTO pathways_courses... ;'
// //     );
// // }

// // // POST / ADD EXPERIENCE TEMPLATE
// // async function addExperienceTemplate(pID,addET, token){
// //   employeeEmail = jwtDecode(token).email
// //   const eID = await db.query(
// //     'SELECT employeeID FROM employees WHERE email = "'+employeeEmail+'";'
// //     );  
// //   const result = await db.query(
// //     'INSERT INTO pathways_experience_templates (pathwayID, experienceTemplateID) VALUES ("'+pID+'","'+addET+'");'
// //     );
// // }

// GET MANAGED COURSES WITH ENROLLMENTS
async function getManagedCourses(managerId) {
  try {
    console.log('getManagedCourses: Getting courses for manager:', managerId);
    
    const courses = await prisma.courses.findMany({
      where: {
        courseManagerID: managerId
      },
      include: {
        employees_courses: {
          orderBy: {
            recordDate: 'desc'
          },
          include: {
            employees: {
              select: {
                username: true,
                role: true,
                employeeID: true
              }
            }
          }
        }
      }
    });

    console.log('getManagedCourses: Found courses:', courses.length);

    // Flatten the data structure for easier frontend consumption
    const flattenedCourses = courses.map(course => ({
      courseID: course.courseID,
      courseName: course.courseName,
      description: course.description,
      duration: course.duration,
      delivery_method: course.delivery_method,
      delivery_location: course.delivery_location,
      enrollments: course.employees_courses.map(enrollment => ({
        employee_courseID: enrollment.employee_courseID,
        employeeID: enrollment.employeeID,
        currentStatus: enrollment.currentStatus,
        recordDate: enrollment.recordDate,
        score: enrollment.score || null,
        completionDate: enrollment.completionDate || null,
        username: enrollment.employees.username,
        role: enrollment.employees.role
      }))
    }));

    return {
      courses: flattenedCourses
    };
  } catch (error) {
    console.error('Error loading managed courses:', error);
    throw error;
  }
}

// UPDATE COURSE ENROLLMENT
async function updateCourseEnrollment(enrollmentId, updateData) {
  try {
    console.log('updateCourseEnrollment: Updating enrollment:', enrollmentId, updateData);
    
    const updateFields = {};
    
    if (updateData.newStatus) {
      updateFields.currentStatus = updateData.newStatus;
    }
    
    if (updateData.score !== undefined) {
      updateFields.score = updateData.score;
    }
    
    if (updateData.recordDate) {
      updateFields.recordDate = updateData.recordDate;
    }
    
    if (updateData.completionDate) {
      updateFields.completionDate = updateData.completionDate;
    }

    console.log('updateCourseEnrollment: Update fields:', updateFields);

    const result = await prisma.employees_courses.update({
      where: {
        employee_courseID: enrollmentId
      },
      data: updateFields
    });

    console.log('updateCourseEnrollment: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating course enrollment:', error);
    throw error;
  }
}

// UPDATE COURSE DETAILS
async function updateCourse(courseID, updateData) {
  try {
    console.log('updateCourse: Updating course:', courseID, updateData);
    
    const updateFields = {};
    
    if (updateData.courseName) {
      updateFields.courseName = updateData.courseName;
    }
    
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description;
    }
    
    if (updateData.duration !== undefined) {
      updateFields.duration = updateData.duration;
    }
    
    if (updateData.deliveryMethod !== undefined) {
      updateFields.delivery_method = updateData.deliveryMethod;
    }
    
    if (updateData.deliveryLocation !== undefined) {
      updateFields.delivery_location = updateData.deliveryLocation;
    }

    console.log('updateCourse: Update fields:', updateFields);

    const result = await prisma.courses.update({
      where: {
        courseID: courseID
      },
      data: updateFields
    });

    console.log('updateCourse: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
}

// GET MANAGED ASSESSMENTS WITH ENROLLMENTS
async function getManagedAssessments(managerId) {
  try {
    console.log('getManagedAssessments: Getting assessments for manager:', managerId);
    
    const assessments = await prisma.assessments.findMany({
      where: {
        manager_ID: managerId
      },
      include: {
        employees_assessments: {
          orderBy: {
            recordDate: 'desc'
          },
          include: {
            employees: {
              select: {
                username: true,
                role: true,
                employeeID: true
              }
            }
          }
        }
      }
    });

    console.log('getManagedAssessments: Found assessments:', assessments.length);

    // Flatten the data structure for easier frontend consumption
    const flattenedAssessments = assessments.map(assessment => ({
      assessmentID: assessment.assessmentID,
      name: assessment.name,
      description: assessment.description,
      duration: assessment.duration,
      delivery_method: assessment.delivery_method,
      delivery_location: assessment.delivery_location,
      max_score: assessment.max_score,
      passing_score: assessment.passing_score,
      expiry: assessment.expiry,
      enrollments: assessment.employees_assessments.map(enrollment => ({
        employee_assessmentID: enrollment.employee_assessmentID,
        employeeID: enrollment.employeeID,
        currentStatus: enrollment.currentStatus,
        recordDate: enrollment.recordDate,
        score: enrollment.score || null,
        completionDate: enrollment.completionDate || null,
        username: enrollment.employees.username,
        role: enrollment.employees.role
      }))
    }));

    return {
      assessments: flattenedAssessments
    };
  } catch (error) {
    console.error('Error loading managed assessments:', error);
    throw error;
  }
}

// UPDATE ASSESSMENT DETAILS
async function updateAssessment(assessmentID, updateData) {
  try {
    console.log('updateAssessment: Updating assessment:', assessmentID, updateData);
    
    const updateFields = {};
    
    if (updateData.name) {
      updateFields.name = updateData.name;
    }
    
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description;
    }
    
    if (updateData.duration !== undefined) {
      updateFields.duration = parseFloat(updateData.duration) || 0;
    }
    
    if (updateData.deliveryMethod !== undefined) {
      updateFields.delivery_method = updateData.deliveryMethod;
    }
    
    if (updateData.deliveryLocation !== undefined) {
      updateFields.delivery_location = updateData.deliveryLocation;
    }
    
    if (updateData.maxScore !== undefined) {
      updateFields.max_score = parseInt(updateData.maxScore) || 0;
    }
    
    if (updateData.passingScore !== undefined) {
      updateFields.passing_score = parseInt(updateData.passingScore) || 0;
    }
    
    if (updateData.expiry !== undefined) {
      updateFields.expiry = updateData.expiry ? parseInt(updateData.expiry) : null;
    }

    console.log('updateAssessment: Update fields:', updateFields);

    const result = await prisma.assessments.update({
      where: {
        assessmentID: assessmentID
      },
      data: updateFields
    });

    console.log('updateAssessment: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
}

// UPDATE ASSESSMENT ENROLLMENT
async function updateAssessmentEnrollment(enrollmentId, updateData) {
  try {
    console.log('updateAssessmentEnrollment: Updating enrollment:', enrollmentId, updateData);
    
    const updateFields = {};
    
    if (updateData.newStatus) {
      updateFields.currentStatus = updateData.newStatus;
    }
    
    if (updateData.score !== undefined) {
      updateFields.score = updateData.score;
    }
    
    if (updateData.recordDate) {
      updateFields.recordDate = updateData.recordDate;
    }
    
    // Remove accreditationDate logic - using completionDate instead
    
    if (updateData.completionDate) {
      updateFields.completionDate = updateData.completionDate;
    }

    console.log('updateAssessmentEnrollment: Update fields:', updateFields);

    const result = await prisma.employees_assessments.update({
      where: {
        employee_assessmentID: enrollmentId
      },
      data: updateFields
    });

    console.log('updateAssessmentEnrollment: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating assessment enrollment:', error);
    throw error;
  }
}
