const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

 
async function loadFeedbackRequests(token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const feedback = await prisma.employees_experiences.findMany({
      where: {
        refereeID: employee.employeeID,
        employeeText: { not: null },
        NOT: { employeeText: '' }
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
    });
    
    return {
      feedback
    };
  } catch (error) {
    throw error;
    throw error;
  }
}

 
async function getRefereeItems(managerId) {
  try {
    
    const experiences = await prisma.employees_experiences.findMany({
      where: {
        refereeID: managerId,
        employeeText: { not: null },
        AND: [
          { NOT: { employeeText: '' } },
          { OR: [{ refereeText: null }, { refereeText: '' }] }
        ]
      },
      include: {
        employees: {
          select: {
            username: true,
            email: true,
            role: true
          }
        }
      }
    });

    
    const courseEnrollments = await prisma.employees_courses.findMany({
      where: {
        courses: {
          courseManagerID: managerId
        }
    
      },
      include: {
        courses: {
          select: {
            courseName: true,
            description: true,
            delivery_method: true,
            delivery_location: true,
            duration: true,
            courseManagerID: true
          }
        },
        employees: {
          select: {
            username: true,
            email: true,
            role: true
          }
        }
      }
    });

    
    
    const assessments = await prisma.employees_assessments.findMany({
      where: {
        assessments: {
          manager_ID: managerId
        }
        // Get ALL assessments for this manager - let frontend decide what to show
      },
      include: {
        assessments: {
          select: {
            name: true,
            description: true,
            max_score: true,
            passing_score: true,
            manager_ID: true
          }
        },
        employees: {
          select: {
            username: true,
            email: true,
            role: true
          }
        }
      }
    });

    

    // Flatten the data for easier frontend consumption
    const flattenedCourseEnrollments = courseEnrollments.map(enrollment => ({
      ...enrollment,
      courseName: enrollment.courses.courseName,
      description: enrollment.courses.description,
      courseDuration: enrollment.courses.duration,
      courseManagerID: enrollment.courses.courseManagerID,
      username: enrollment.employees.username,
      role: enrollment.employees.role
    }));

    const flattenedAssessments = assessments.map(assessment => ({
      ...assessment,
      name: assessment.assessments.name,
      description: assessment.assessments.description,
      max_score: assessment.assessments.max_score,
      passing_score: assessment.assessments.passing_score,
      manager_ID: assessment.assessments.manager_ID,
      username: assessment.employees.username,
      role: assessment.employees.role
    }));

    const flattenedExperiences = experiences.map(experience => ({
      ...experience,
      username: experience.employees.username,
      role: experience.employees.role
    }));

    return {
      experiences: flattenedExperiences,
      courseEnrollments: flattenedCourseEnrollments,
      assessments: flattenedAssessments
    };
  } catch (error) {
    throw error;
    throw error;
  }
}

 
async function updateItemStatus(itemType, itemId, updateData) {
  try {
    let result;
    
    switch (itemType) {
      case 'experience':
        if (updateData.newStatus === 'Withdrawn') {
          
          result = await prisma.employees_experiences.delete({
            where: { employee_experienceID: itemId }
          });
          
        } else {
          const experienceData = {};
          if (updateData.refereeText) {
            experienceData.refereeText = updateData.refereeText;
          }
          if (updateData.newStatus) {
            
          }
          result = await prisma.employees_experiences.update({
            where: { employee_experienceID: itemId },
            data: experienceData
          });
        }
        break;
      
      case 'course':
        if (updateData.newStatus === 'Withdrawn') {
          
          result = await prisma.employees_courses.delete({
            where: { employee_courseID: itemId }
          });
          
        } else {
          result = await prisma.employees_courses.update({
            where: { employee_courseID: itemId },
            data: { currentStatus: updateData.newStatus }
          });
        }
        break;
      
      case 'assessment':
        if (updateData.newStatus === 'Withdrawn') {
          // Delete the assessment enrollment record to allow re-enrollment
          result = await prisma.employees_assessments.delete({
            where: { employee_assessmentID: itemId }
          });
          console.log('Assessment enrollment withdrawn (deleted):', result);
        } else {
          const assessmentData = {};
          
          
          if (updateData.score !== undefined) {
            assessmentData.scoreAchieved = updateData.score;
            if (!updateData.newStatus) {
              assessmentData.currentStatus = updateData.score >= 0 ? 'Attempted' : 'Enrolled';
            }
          }
          if (updateData.newStatus) {
            assessmentData.currentStatus = updateData.newStatus;
          }
          
          if (updateData.attemptDate) {
            assessmentData.attemptDate = updateData.attemptDate;
          }
          
          
          
          result = await prisma.employees_assessments.update({
            where: { employee_assessmentID: itemId },
            data: assessmentData
          });
        }
        break;
      
      default:
        throw new Error(`Unsupported item type: ${itemType}`);
    }
    
    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

 
async function passFeedback(recordRefereeFeedback, employeeIndex, employeeExperienceIndex) {
  try {
    const result = await prisma.employees_experiences.updateMany({
      where: {
        employeeID: parseInt(employeeIndex),
        employee_experienceID: parseInt(employeeExperienceIndex)
      },
      data: {
        refereeText: recordRefereeFeedback
      }
    });
    
    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

    


// EXPORTS
module.exports = {
  loadFeedbackRequests,
  passFeedback,
  getRefereeItems,
  updateItemStatus
}

