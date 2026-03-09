const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

// GET / RETURN LIST OF FEEDBACK REQUESTS
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
    console.error('Error loading feedback requests:', error);
    throw error;
  }
}

// GET / RETURN ITEMS REQUIRING REFEREE ATTENTION
async function getRefereeItems(managerId) {
  try {
    // Get experiences where this person is the referee and needs to provide feedback
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

    // Get course enrollments where this person is the course manager
    const courseEnrollments = await prisma.employees_courses.findMany({
      where: {
        courses: {
          courseManagerID: managerId
        }
        // Remove status filter to show all enrollments, not just 'Enrolled'
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

    // Get assessments where this person is the manager and can record scores
    console.log('=== FETCHING ASSESSMENTS FOR MANAGER ===');
    console.log('Manager ID:', managerId);
    
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

    console.log('=== ASSESSMENTS QUERY RESULT ===');
    console.log('Found assessments:', assessments.length);
    assessments.forEach((assessment, index) => {
      console.log(`Assessment ${index}:`, {
        id: assessment.employee_assessmentID,
        currentStatus: assessment.currentStatus,
        scoreAchieved: assessment.scoreAchieved,
        username: assessment.employees?.username,
        assessmentName: assessment.assessments?.name
      });
    });

    // Flatten the data for easier frontend consumption
    const flattenedCourseEnrollments = courseEnrollments.map(enrollment => {
      console.log('Course enrollment debug:', {
        enrollment: enrollment,
        coursesObject: enrollment.courses,
        courseManagerID: enrollment.courses?.courseManagerID
      });
      
      return {
        ...enrollment,
        courseName: enrollment.courses.courseName,
        description: enrollment.courses.description,
        courseDuration: enrollment.courses.duration,
        courseManagerID: enrollment.courses.courseManagerID, // Add this field to top level
        username: enrollment.employees.username,
        role: enrollment.employees.role
      };
    });

    const flattenedAssessments = assessments.map(assessment => ({
      ...assessment,
      name: assessment.assessments.name,
      description: assessment.assessments.description,
      max_score: assessment.assessments.max_score,
      passing_score: assessment.assessments.passing_score,
      manager_ID: assessment.assessments.manager_ID, // Add this field to top level
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
    console.error('Error loading referee items:', error);
    throw error;
  }
}

// UPDATE ITEM STATUS
async function updateItemStatus(itemType, itemId, updateData) {
  try {
    let result;
    
    switch (itemType) {
      case 'experience':
        if (updateData.newStatus === 'Withdrawn') {
          // Delete the experience record to allow re-enrollment
          result = await prisma.employees_experiences.delete({
            where: { employee_experienceID: itemId }
          });
          console.log('Experience enrollment withdrawn (deleted):', result);
        } else {
          const experienceData = {};
          if (updateData.refereeText) {
            experienceData.refereeText = updateData.refereeText;
          }
          if (updateData.newStatus) {
            // For experiences, status is typically managed through refereeText presence
            // but we can add custom status tracking if needed
            console.log('Experience status update requested:', updateData.newStatus);
          }
          result = await prisma.employees_experiences.update({
            where: { employee_experienceID: itemId },
            data: experienceData
          });
        }
        break;
      
      case 'course':
        if (updateData.newStatus === 'Withdrawn') {
          // Delete the enrollment record to allow re-enrollment
          result = await prisma.employees_courses.delete({
            where: { employee_courseID: itemId }
          });
          console.log('Course enrollment withdrawn (deleted):', result);
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
          console.log('=== ASSESSMENT UPDATE DEBUG ===');
          console.log('UpdateData received:', updateData);
          
          if (updateData.score !== undefined) {
            assessmentData.scoreAchieved = updateData.score;
            // Auto-determine status based on score if not explicitly provided
            if (!updateData.newStatus) {
              assessmentData.currentStatus = updateData.score >= 0 ? 'Attempted' : 'Enrolled';
            }
          }
          if (updateData.newStatus) {
            assessmentData.currentStatus = updateData.newStatus;
          }
          // Remove accreditationDate logic - using completionDate instead
          if (updateData.attemptDate) {
            assessmentData.attemptDate = updateData.attemptDate;
          }
          
          console.log('Assessment data to update:', assessmentData);
          console.log('Item ID:', itemId);
          
          result = await prisma.employees_assessments.update({
            where: { employee_assessmentID: itemId },
            data: assessmentData
          });
          
          console.log('Assessment update result:', result);
        }
        break;
      
      default:
        throw new Error(`Unsupported item type: ${itemType}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error updating item status:', error);
    throw error;
  }
}

// POST / PASS BACK REFERENCE
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
    console.error('Error updating feedback:', error);
    throw error;
  }
}

  // router.post("/recordOwnFeedback", async function (req, res) {
  //   try {
  //     await record.requestReferee(refereeRequest, token)
  //     res.redirect("http://localhost:5173/record")
  //   } catch (err) {
  //     return res.json({ errors: "Error when trying to enrol on course. Try again later!" });
  //   }
  // });


// EXPORTS
module.exports = {
  loadFeedbackRequests,
  passFeedback,
  getRefereeItems,
  updateItemStatus
}

