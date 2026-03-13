const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

// GET MANAGED ASSESSMENTS WITH ENROLLMENTS
async function getManagedAssessments(managerId) {
  try {
    
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
    const parsedAssessmentId = parseInt(assessmentID, 10);
    if (Number.isNaN(parsedAssessmentId)) {
      throw new Error('Invalid assessment ID');
    }

    
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

    const result = await prisma.assessments.update({
      where: {
        assessmentID: parsedAssessmentId
      },
      data: updateFields
    });

    // If thresholds change, recalculate status for scored enrollments.
    if (updateFields.passing_score !== undefined || updateFields.max_score !== undefined) {
      const enrollmentsWithScores = await prisma.employees_assessments.findMany({
        where: {
          assessmentID: parsedAssessmentId,
          score: {
            not: null
          }
        },
        select: {
          employee_assessmentID: true,
          score: true
        }
      });

      if (enrollmentsWithScores.length > 0) {
        const updates = enrollmentsWithScores.map((enrollment) => {
          const numericScore = Number(enrollment.score) || 0;
          const recalculatedStatus = numericScore >= result.passing_score ? 'Passed' : 'Attempted';

          return prisma.employees_assessments.update({
            where: {
              employee_assessmentID: enrollment.employee_assessmentID
            },
            data: {
              currentStatus: recalculatedStatus
            }
          });
        });

        await prisma.$transaction(updates);
      }
    }

    return result;
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
}

// UPDATE ASSESSMENT ENROLLMENT
async function updateAssessmentEnrollment(enrollmentId, updateData) {
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

    const result = await prisma.employees_assessments.update({
      where: {
        employee_assessmentID: enrollmentId
      },
      data: updateFields
    });

    return result;
  } catch (error) {
    console.error('Error updating assessment enrollment:', error);
    throw error;
  }
}

module.exports = {
  getManagedAssessments,
  updateAssessment,
  updateAssessmentEnrollment
};