const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();


// GET / READ
async function getMultiple(token){
  try {
    console.log('getMultiple: Starting with token:', token ? 'present' : 'missing');
    
    let employee = null;
    let isEnrolledOnCourseList = [];
    let isEnrolledOnAssessmentList = [];
    
    if (token) {
      try {
        const employeeEmail = jwtDecode(token).email;
        console.log('getMultiple: Decoded email:', employeeEmail);
        
        employee = await prisma.employees.findFirst({
          where: { email: employeeEmail },
          select: { employeeID: true, username: true, role: true }
        });
        console.log('getMultiple: Found employee:', employee);
        
        if (employee) {
          // Get enrolled courses
          console.log('getMultiple: Getting enrolled courses...');
          const isEnrolledOnCourse = await prisma.employees_courses.findMany({
            where: { employeeID: employee.employeeID },
            select: { courseID: true, currentStatus: true },
            distinct: ['courseID']
          });
          isEnrolledOnCourseList = isEnrolledOnCourse.map(enrollment => enrollment.courseID);
          
          // Also get full course enrollment data for status information
          const courseEnrollments = await prisma.employees_courses.findMany({
            where: { employeeID: employee.employeeID }
          });

          // Get enrolled assessments
          console.log('getMultiple: Getting enrolled assessments...');
          const isEnrolledOnAssessment = await prisma.employees_assessments.findMany({
            where: { employeeID: employee.employeeID },
            select: { assessmentID: true },
            distinct: ['assessmentID']
          });
          isEnrolledOnAssessmentList = isEnrolledOnAssessment.map(enrollment => enrollment.assessmentID);
        }
      } catch (tokenError) {
        console.log('getMultiple: Token decode failed, treating as unauthenticated:', tokenError.message);
        // Continue without enrollment data
      }
    } else {
      console.log('getMultiple: No token provided, getting public course list');
    }

    // Get all courses (public data)
    console.log('getMultiple: Getting all courses...');
    const courses = await prisma.courses.findMany({
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      }
    });
    console.log('getMultiple: Found courses:', courses.length);

    // Flatten course data to include manager info at top level
    const flattenedCourses = courses.map(course => ({
      courseID: course.courseID,
      courseName: course.courseName,
      description: course.description,
      delivery_method: course.delivery_method,
      delivery_location: course.delivery_location,
      duration: course.duration,
      courseManagerID: course.courseManagerID,
      username: course.manager?.username,
      role: course.manager?.role
    }));

    // Get all assessments (public data) 
    console.log('getMultiple: Getting all assessments...');
    const assessments = await prisma.assessments.findMany({
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      }
    });
    console.log('getMultiple: Found assessments:', assessments.length);

    // Flatten assessment data to include manager info at top level
    const flattenedAssessments = assessments.map(assessment => ({
      assessmentID: assessment.assessmentID,
      name: assessment.name,
      description: assessment.description,
      delivery_method: assessment.delivery_method,
      delivery_location: assessment.delivery_location,
      duration: assessment.duration,
      manager_ID: assessment.manager_ID,
      max_score: assessment.max_score,
      passing_score: assessment.passing_score,
      expiry: assessment.expiry,
      username: assessment.manager?.username,
      role: assessment.manager?.role
    }));

    const data = [...flattenedCourses, ...flattenedAssessments];
    console.log('getMultiple: Total items:', data.length);
    
    return {
      data, 
      isEnrolledOnCourseList, 
      isEnrolledOnAssessmentList,
      courseEnrollments: employee ? courseEnrollments : []
    };
  } catch (err) {
    console.error('getMultiple: Error occurred:', err);
    throw err;
  }
}
 
// POST / ENROL ON COURSE
async function enrolCourse(enrolCourseID, token, enrolDate){
  try {
    console.log('enrolCourse: Starting with token:', token ? 'present' : 'missing');
    console.log('enrolCourse: Token type:', typeof token);
    console.log('enrolCourse: Token value:', token);
    console.log('enrolCourse: Course ID:', enrolCourseID);
    console.log('enrolCourse: Enroll date:', enrolDate);
    
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid authentication token provided');
    }
    
    const employeeEmail = jwtDecode(token).email;
    console.log('enrolCourse: Decoded email:', employeeEmail);
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    console.log('enrolCourse: Found employee ID:', employee.employeeID);
    
    // Check if already enrolled
    const existingEnrollment = await prisma.employees_courses.findFirst({
      where: {
        courseID: parseInt(enrolCourseID),
        employeeID: employee.employeeID
      }
    });
    
    if (existingEnrollment) {
      if (existingEnrollment.currentStatus === 'Expired') {
        // Re-enroll by resetting the expired record to a fresh enrolled state.
        const refreshedEnrollment = await prisma.employees_courses.update({
          where: { employee_courseID: existingEnrollment.employee_courseID },
          data: {
            currentStatus: 'Enrolled',
            recordDate: enrolDate,
            completionDate: null,
            score: null
          }
        });
        return refreshedEnrollment;
      }
      throw new Error('Already enrolled in this course');
    }
    
    const result = await prisma.employees_courses.create({
      data: {
        employeeID: employee.employeeID,
        courseID: parseInt(enrolCourseID),
        currentStatus: "Enrolled",
        recordDate: enrolDate  // Keep as string to match schema
      }
    });
    return result;
  } catch (error) {
    console.error('Error enrolling in course:', error);
    throw error;
  }
}

// POST / ENROL ON ASSESSMENT
async function enrolAssessment(enrolAssessmentID, token, enrolDate){
  try {
    console.log('enrolAssessment: Starting with token:', token ? 'present' : 'missing');
    console.log('enrolAssessment: Token type:', typeof token);
    console.log('enrolAssessment: Token value:', token);
    console.log('enrolAssessment: Assessment ID:', enrolAssessmentID);
    console.log('enrolAssessment: Enroll date:', enrolDate);
    
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid authentication token provided');
    }
    
    const employeeEmail = jwtDecode(token).email;
    console.log('enrolAssessment: Decoded email:', employeeEmail);
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    console.log('enrolAssessment: Found employee ID:', employee.employeeID);
    
    // Check if already enrolled
    const existingEnrollment = await prisma.employees_assessments.findFirst({
      where: {
        assessmentID: parseInt(enrolAssessmentID),
        employeeID: employee.employeeID
      }
    });
    
    if (existingEnrollment) {
      if (existingEnrollment.currentStatus === 'Expired') {
        // Re-enroll by resetting the expired record to a fresh enrolled state.
        const refreshedEnrollment = await prisma.employees_assessments.update({
          where: { employee_assessmentID: existingEnrollment.employee_assessmentID },
          data: {
            currentStatus: 'Enrolled',
            recordDate: enrolDate,
            completionDate: null,
            score: null
          }
        });
        return refreshedEnrollment;
      }
      throw new Error('Already enrolled in this assessment');
    }
    
    const result = await prisma.employees_assessments.create({
      data: {
        employeeID: employee.employeeID,
        assessmentID: parseInt(enrolAssessmentID),
        currentStatus: "Enrolled",
        recordDate: enrolDate  // Keep as string to match schema
      }
    });
    return result;
  } catch (error) {
    console.error('Error enrolling in assessment:', error);
    throw error;
  }
}

//POST / CREATE COURSE
async function createCourse(courseName, courseDescription, courseLocation, courseMethod, duration, token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const result = await prisma.courses.create({
      data: {
        courseName,
        description: courseDescription,
        delivery_location: courseLocation,
        delivery_method: courseMethod,
        duration: parseFloat(duration),
        courseManagerID: employee.employeeID
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

//POST / CREATE ASSESSMENT
async function createAssessment(courseName, assessmentDescription, assessmentLocation, assessmentMethod, duration, maxScore, passingScore, expiry, token){
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const result = await prisma.assessments.create({
      data: {
        name: courseName,
        description: assessmentDescription,
        delivery_method: assessmentMethod,
        delivery_location: assessmentLocation,
        duration: parseFloat(duration),
        manager_ID: employee.employeeID,
        max_score: parseInt(maxScore),
        passing_score: parseInt(passingScore),
        expiry: expiry && expiry !== '' && expiry !== '0' ? parseInt(expiry) : null
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error creating assessment:', error);
    throw error;
  }
}




// GET COURSES ONLY
async function getCoursesOnly(token){
  try {
    console.log('getCoursesOnly: Starting with token:', token ? 'present' : 'missing');
    
    let employee = null;
    let isEnrolledOnCourseList = [];
    
    if (token) {
      try {
        const employeeEmail = jwtDecode(token).email;
        console.log('getCoursesOnly: Decoded email:', employeeEmail);
        
        employee = await prisma.employees.findFirst({
          where: { email: employeeEmail },
          select: { employeeID: true, username: true, role: true }
        });
        console.log('getCoursesOnly: Found employee:', employee);
        
        if (employee) {
          // Get enrolled courses
          console.log('getCoursesOnly: Getting enrolled courses...');
          const isEnrolledOnCourse = await prisma.employees_courses.findMany({
            where: { employeeID: employee.employeeID },
            select: { courseID: true },
            distinct: ['courseID']
          });
          isEnrolledOnCourseList = isEnrolledOnCourse.map(enrollment => enrollment.courseID);
        }
      } catch (tokenError) {
        console.log('getCoursesOnly: Token decode failed, treating as unauthenticated:', tokenError.message);
      }
    }

    // Get all courses (public data)
    console.log('getCoursesOnly: Getting all courses...');
    const courses = await prisma.courses.findMany({
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      }
    });
    console.log('getCoursesOnly: Found courses:', courses.length);

    // Flatten course data to include manager info at top level
    const flattenedCourses = courses.map(course => ({
      courseID: course.courseID,
      courseName: course.courseName,
      description: course.description,
      delivery_method: course.delivery_method,
      delivery_location: course.delivery_location,
      duration: course.duration,
      courseManagerID: course.courseManagerID,
      username: course.manager?.username,
      role: course.manager?.role
    }));
    
    return {
      data: flattenedCourses, 
      isEnrolledOnCourseList, 
      isEnrolledOnAssessmentList: []
    };
  } catch (err) {
    console.error('getCoursesOnly: Error occurred:', err);
    throw new Error(err.message);
  }
}

// GET ASSESSMENTS ONLY
async function getAssessmentsOnly(token){
  try {
    console.log('getAssessmentsOnly: Starting with token:', token ? 'present' : 'missing');
    
    let employee = null;
    let isEnrolledOnAssessmentList = [];
    
    if (token) {
      try {
        const employeeEmail = jwtDecode(token).email;
        console.log('getAssessmentsOnly: Decoded email:', employeeEmail);
        
        employee = await prisma.employees.findFirst({
          where: { email: employeeEmail },
          select: { employeeID: true, username: true, role: true }
        });
        console.log('getAssessmentsOnly: Found employee:', employee);
        
        if (employee) {
          // Get enrolled assessments
          console.log('getAssessmentsOnly: Getting enrolled assessments...');
          const isEnrolledOnAssessment = await prisma.employees_assessments.findMany({
            where: { employeeID: employee.employeeID },
            select: { assessmentID: true },
            distinct: ['assessmentID']
          });
          isEnrolledOnAssessmentList = isEnrolledOnAssessment.map(enrollment => enrollment.assessmentID);
        }
      } catch (tokenError) {
        console.log('getAssessmentsOnly: Token decode failed, treating as unauthenticated:', tokenError.message);
      }
    }

    // Get all assessments (public data) 
    console.log('getAssessmentsOnly: Getting all assessments...');
    const assessments = await prisma.assessments.findMany({
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      }
    });
    console.log('getAssessmentsOnly: Found assessments:', assessments.length);

    // Flatten assessment data to include manager info at top level
    const flattenedAssessments = assessments.map(assessment => ({
      assessmentID: assessment.assessmentID,
      name: assessment.name,
      description: assessment.description,
      delivery_method: assessment.delivery_method,
      delivery_location: assessment.delivery_location,
      duration: assessment.duration,
      manager_ID: assessment.manager_ID,
      max_score: assessment.max_score,
      passing_score: assessment.passing_score,
      expiry: assessment.expiry,
      username: assessment.manager?.username,
      role: assessment.manager?.role
    }));
    
    return {
      data: flattenedAssessments, 
      isEnrolledOnCourseList: [],
      isEnrolledOnAssessmentList
    };
  } catch (err) {
    console.error('getAssessmentsOnly: Error occurred:', err);
    throw new Error(err.message);
  }
}

// UPDATE COURSE
async function updateCourse(courseID, updateData, token) {
  try {
    console.log('updateCourse: Updating course ID:', courseID);
    console.log('updateCourse: Update data:', updateData);
    
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Verify the user owns this course
    const course = await prisma.courses.findUnique({
      where: { courseID: parseInt(courseID) }
    });
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    if (course.courseManagerID !== employee.employeeID) {
      throw new Error('Unauthorized: You can only update courses you manage');
    }
    
    // Update the course
    const updatedCourse = await prisma.courses.update({
      where: { courseID: parseInt(courseID) },
      data: updateData
    });
    
    console.log('updateCourse: Course updated successfully');
    return updatedCourse;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
}

// UPDATE ASSESSMENT
async function updateAssessment(assessmentID, updateData, token) {
  try {
    console.log('updateAssessment: Updating assessment ID:', assessmentID);
    console.log('updateAssessment: Update data:', updateData);
    
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Verify the user owns this assessment
    const assessment = await prisma.assessments.findUnique({
      where: { assessmentID: parseInt(assessmentID) }
    });
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    if (assessment.manager_ID !== employee.employeeID) {
      throw new Error('Unauthorized: You can only update assessments you manage');
    }
    
    // Update the assessment
    const updatedAssessment = await prisma.assessments.update({
      where: { assessmentID: parseInt(assessmentID) },
      data: updateData
    });
    
    console.log('updateAssessment: Assessment updated successfully');
    return updatedAssessment;
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
}

// DELETE COURSE
async function deleteCourse(courseID, token) {
  try {
    console.log('deleteCourse: Deleting course ID:', courseID);
    
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Verify the user owns this course
    const course = await prisma.courses.findUnique({
      where: { courseID: parseInt(courseID) }
    });
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    if (course.courseManagerID !== employee.employeeID) {
      throw new Error('Unauthorized: You can only delete courses you manage');
    }
    
    // Delete related enrollments first
    await prisma.employees_courses.deleteMany({
      where: { courseID: parseInt(courseID) }
    });
    
    // Delete pathway course relationships
    await prisma.pathways_courses.deleteMany({
      where: { courseID: parseInt(courseID) }
    });
    
    // Delete the course
    const deletedCourse = await prisma.courses.delete({
      where: { courseID: parseInt(courseID) }
    });
    
    console.log('deleteCourse: Course deleted successfully');
    return deletedCourse;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
}

// DELETE ASSESSMENT
async function deleteAssessment(assessmentID, token) {
  try {
    console.log('deleteAssessment: Deleting assessment ID:', assessmentID);
    
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Verify the user owns this assessment
    const assessment = await prisma.assessments.findUnique({
      where: { assessmentID: parseInt(assessmentID) }
    });
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    if (assessment.manager_ID !== employee.employeeID) {
      throw new Error('Unauthorized: You can only delete assessments you manage');
    }
    
    // Delete related enrollments first
    await prisma.employees_assessments.deleteMany({
      where: { assessmentID: parseInt(assessmentID) }
    });
    
    // Delete pathway assessment relationships
    await prisma.pathways_assessments.deleteMany({
      where: { assessmentID: parseInt(assessmentID) }
    });
    
    // Delete the assessment
    const deletedAssessment = await prisma.assessments.delete({
      where: { assessmentID: parseInt(assessmentID) }
    });
    
    console.log('deleteAssessment: Assessment deleted successfully');
    return deletedAssessment;
  } catch (error) {
    console.error('Error deleting assessment:', error);
    throw error;
  }
}

// EXPORTS
module.exports = {
  getMultiple,
  getCoursesOnly,
  getAssessmentsOnly,
  enrolCourse,
  enrolAssessment,
  createCourse,
  createAssessment,
  updateCourse,
  updateAssessment,
  deleteCourse,
  deleteAssessment
}