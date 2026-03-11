const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

// GET MANAGED COURSES WITH ENROLLMENTS
async function getManagedCourses(managerId) {
  try {
    
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

    const result = await prisma.employees_courses.update({
      where: {
        employee_courseID: enrollmentId
      },
      data: updateFields
    });

    return result;
  } catch (error) {
    console.error('Error updating course enrollment:', error);
    throw error;
  }
}

// UPDATE COURSE DETAILS
async function updateCourse(courseID, updateData) {
  try {
    
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

    const result = await prisma.courses.update({
      where: {
        courseID: courseID
      },
      data: updateFields
    });

    return result;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
}

module.exports = {
  getManagedCourses,
  updateCourseEnrollment,
  updateCourse
};