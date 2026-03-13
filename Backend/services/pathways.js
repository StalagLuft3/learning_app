const { PrismaClient } = require('@prisma/client');
const { jwtDecode } = require('jwt-decode');

const prisma = new PrismaClient();

// GET / READ
async function loadPathways(token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true, username: true, role: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get pathways where user is manager
    const isPathwayManagerList = await prisma.pathways.findMany({
      where: { pathwayManagerID: employee.employeeID },
      select: { pathwayID: true }
    });

    // Get pathways where user is enrolled
    const isEnrolledOnPathwayList = await prisma.pathways_employees.findMany({
      where: { employeeID: employee.employeeID },
      select: { pathwayID: true },
      distinct: ['pathwayID']
    });

    // Get current user's active enrollments for overlap-based pathway progress.
    const userCourseEnrollments = await prisma.employees_courses.findMany({
      where: {
        employeeID: employee.employeeID,
        NOT: { currentStatus: { in: ['Withdrawn', 'Expired'] } }
      },
      select: { courseID: true },
      distinct: ['courseID']
    });

    const userAssessmentEnrollments = await prisma.employees_assessments.findMany({
      where: {
        employeeID: employee.employeeID,
        NOT: { currentStatus: { in: ['Withdrawn', 'Expired'] } }
      },
      select: { assessmentID: true },
      distinct: ['assessmentID']
    });

    const userExperienceEnrollments = await prisma.employees_experiences.findMany({
      where: {
        employeeID: employee.employeeID,
        experience_templateID: { not: null }
      },
      select: { experience_templateID: true },
      distinct: ['experience_templateID']
    });

    const userCourseIds = new Set(userCourseEnrollments.map((row) => row.courseID));
    const userAssessmentIds = new Set(userAssessmentEnrollments.map((row) => row.assessmentID));
    const userExperienceTemplateIds = new Set(
      userExperienceEnrollments
        .map((row) => row.experience_templateID)
        .filter((id) => id !== null)
    );

    // Get all pathways with manager information
    console.log('Fetching all pathways...');
    const pathwaysList = await prisma.pathways.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });
    console.log('Found pathways:', pathwaysList.length);
    console.log('Pathways data:', JSON.stringify(pathwaysList, null, 2));

    // Get pathway courses
    const allPathwaysCourses = await prisma.pathways_courses.findMany({
      include: {
        pathways: { select: { pathwayID: true } },
        courses: {
          include: {
            manager: {
              select: { username: true, role: true }
            }
          }
        }
      },
      orderBy: { courses: { courseName: 'asc' } }
    });

    // Get pathway assessments
    const allPathwaysAssessments = await prisma.pathways_assessments.findMany({
      include: {
        pathways: { select: { pathwayID: true } },
        assessments: {
          include: {
            manager: {
              select: { username: true, role: true }
            }
          }
        }
      },
      orderBy: { assessments: { name: 'asc' } }
    });

    // Get pathway experience templates
    const allPathwaysExperienceTemplates = await prisma.pathways_experience_templates.findMany({
      include: {
        pathways: { select: { pathwayID: true } },
        experience_templates: true
      },
      orderBy: { experience_templates: { experienceDescription: 'asc' } }
    });

    // Combine contents
    let contents = [...allPathwaysCourses, ...allPathwaysAssessments, ...allPathwaysExperienceTemplates];
    
    // Sort contents by name/course name
    contents.sort((a, b) => {
      const nameA = a.courses?.courseName || a.assessments?.name || a.experience_templates?.experienceDescription || '';
      const nameB = b.courses?.courseName || b.assessments?.name || b.experience_templates?.experienceDescription || '';
      return nameA.localeCompare(nameB);
    });

    // Build per-pathway overlap progress for recommendation and card display.
    const pathwayCoursesById = allPathwaysCourses.reduce((acc, row) => {
      if (!row.pathwayID) return acc;
      if (!acc[row.pathwayID]) acc[row.pathwayID] = [];
      acc[row.pathwayID].push(row.courseID);
      return acc;
    }, {});

    const pathwayAssessmentsById = allPathwaysAssessments.reduce((acc, row) => {
      if (!row.pathwayID) return acc;
      if (!acc[row.pathwayID]) acc[row.pathwayID] = [];
      acc[row.pathwayID].push(row.assessmentID);
      return acc;
    }, {});

    const pathwayExperiencesById = allPathwaysExperienceTemplates.reduce((acc, row) => {
      if (!row.pathwayID) return acc;
      if (!acc[row.pathwayID]) acc[row.pathwayID] = [];
      acc[row.pathwayID].push(row.experience_templateID);
      return acc;
    }, {});

    const enrolledPathwaySet = new Set(isEnrolledOnPathwayList.map((p) => p.pathwayID));

    const pathwayProgress = pathwaysList.map((pathway) => {
      const pathwayCourseIds = pathwayCoursesById[pathway.pathwayID] || [];
      const pathwayAssessmentIds = pathwayAssessmentsById[pathway.pathwayID] || [];
      const pathwayExperienceIds = pathwayExperiencesById[pathway.pathwayID] || [];

      const totalItems =
        pathwayCourseIds.length +
        pathwayAssessmentIds.length +
        pathwayExperienceIds.length;

      const matchedCourses = pathwayCourseIds.filter((id) => userCourseIds.has(id)).length;
      const matchedAssessments = pathwayAssessmentIds.filter((id) => userAssessmentIds.has(id)).length;
      const matchedExperiences = pathwayExperienceIds.filter((id) => userExperienceTemplateIds.has(id)).length;
      const matchedItems = matchedCourses + matchedAssessments + matchedExperiences;

      const completionPercent = totalItems > 0
        ? Math.round((matchedItems / totalItems) * 100)
        : 0;

      return {
        pathwayID: pathway.pathwayID,
        totalItems,
        matchedItems,
        completionPercent,
        matchedCourses,
        matchedAssessments,
        matchedExperiences,
        isEnrolled: enrolledPathwaySet.has(pathway.pathwayID)
      };
    });

    const user = [employeeEmail, employee];
    
    return {
      pathwaysList,
      contents,
      pathwayProgress,
      user,
      isEnrolledOnPathwayList: isEnrolledOnPathwayList.map(p => p.pathwayID),
      isPathwayManagerList: isPathwayManagerList.map(p => p.pathwayID)
    };
  } catch (error) {
    console.error('Error in loadPathways:', error);
    throw error;
  }
}

// POST / ENROL ON PATHWAY
async function enrolPathway(enrolPathwayID, token, enrolDate) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information using Prisma
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Check if already enrolled
    const existingEnrollment = await prisma.pathways_employees.findFirst({
      where: {
        pathwayID: parseInt(enrolPathwayID),
        employeeID: employee.employeeID
      }
    });
    
    if (existingEnrollment) {
      throw new Error('Already enrolled in this pathway');
    }
    
    // Create pathway enrollment
    const result = await prisma.pathways_employees.create({
      data: {
        pathwayID: parseInt(enrolPathwayID),
        employeeID: employee.employeeID,
        recordDate: enrolDate
      }
    });
    
    console.log('Pathway enrollment successful:', result);
    
    // Auto-enroll in associated courses, assessments, and experience templates
    await handleAutoEnrollment(enrolPathwayID, employee.employeeID, enrolDate);
    
    return result;
  } catch (error) {
    console.error('Error in enrolPathway:', error);
    throw error;
  }
}

// Helper function to handle auto-enrollment in pathway components
async function handleAutoEnrollment(pathwayID, employeeID, enrolDate) {
  try {
    // Get pathway courses
    const pathwayCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { courseID: true }
    });
    
    // Get pathway assessments
    const pathwayAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { assessmentID: true }
    });
    
    // Get pathway experience templates
    const pathwayExperienceTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { experience_templateID: true }
    });
    
    // Auto-enroll in courses
    for (const pathwayCourse of pathwayCourses) {
      const activeCourseEnrollment = await prisma.employees_courses.findFirst({
        where: {
          courseID: pathwayCourse.courseID,
          employeeID: employeeID,
          NOT: {
            currentStatus: 'Expired'
          }
        }
      });

      if (activeCourseEnrollment) {
        continue;
      }

      const expiredCourseEnrollment = await prisma.employees_courses.findFirst({
        where: {
          courseID: pathwayCourse.courseID,
          employeeID: employeeID,
          currentStatus: 'Expired'
        }
      });
      
      if (expiredCourseEnrollment) {
        await prisma.employees_courses.update({
          where: { employee_courseID: expiredCourseEnrollment.employee_courseID },
          data: {
            currentStatus: 'Enrolled',
            recordDate: enrolDate,
            completionDate: null,
            score: null
          }
        });
        console.log(`Refreshed expired course enrollment for employee ${employeeID} on course ${pathwayCourse.courseID}`);
      } else {
        await prisma.employees_courses.create({
          data: {
            employeeID: employeeID,
            courseID: pathwayCourse.courseID,
            currentStatus: "Enrolled",
            recordDate: enrolDate
          }
        });
        console.log(`Auto-enrolled employee ${employeeID} in course ${pathwayCourse.courseID}`);
      }
    }
    
    // Auto-enroll in assessments
    for (const pathwayAssessment of pathwayAssessments) {
      const activeAssessmentEnrollment = await prisma.employees_assessments.findFirst({
        where: {
          assessmentID: pathwayAssessment.assessmentID,
          employeeID: employeeID,
          NOT: {
            currentStatus: 'Expired'
          }
        }
      });

      if (activeAssessmentEnrollment) {
        continue;
      }

      const expiredAssessmentEnrollment = await prisma.employees_assessments.findFirst({
        where: {
          assessmentID: pathwayAssessment.assessmentID,
          employeeID: employeeID,
          currentStatus: 'Expired'
        }
      });
      
      if (expiredAssessmentEnrollment) {
        await prisma.employees_assessments.update({
          where: { employee_assessmentID: expiredAssessmentEnrollment.employee_assessmentID },
          data: {
            currentStatus: 'Enrolled',
            recordDate: enrolDate,
            completionDate: null,
            score: null
          }
        });
        console.log(`Refreshed expired assessment enrollment for employee ${employeeID} on assessment ${pathwayAssessment.assessmentID}`);
      } else {
        await prisma.employees_assessments.create({
          data: {
            employeeID: employeeID,
            assessmentID: pathwayAssessment.assessmentID,
            currentStatus: "Enrolled",
            recordDate: enrolDate
          }
        });
        console.log(`Auto-enrolled employee ${employeeID} in assessment ${pathwayAssessment.assessmentID}`);
      }
    }
    
    // Auto-enroll in experience templates
    for (const pathwayExperienceTemplate of pathwayExperienceTemplates) {
      const experienceTemplate = await prisma.experience_templates.findFirst({
        where: { experience_templateID: pathwayExperienceTemplate.experience_templateID }
      });
      
      if (experienceTemplate) {
        const existingExperienceEnrollment = await prisma.employees_experiences.findFirst({
          where: {
            employeeID: employeeID,
            experienceDescription: experienceTemplate.experienceDescription
          }
        });
        
        if (!existingExperienceEnrollment) {
          await prisma.employees_experiences.create({
            data: {
              experience_templateID: experienceTemplate.experience_templateID,
              experienceDescription: experienceTemplate.experienceDescription,
              duration: experienceTemplate.minimumDuration,
              recordDate: enrolDate,
              employeeID: employeeID
            }
          });
          console.log(`Auto-enrolled employee ${employeeID} in experience template ${pathwayExperienceTemplate.experience_templateID}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in handleAutoEnrollment:', error);
    // Don't throw here - we don't want to fail the entire enrollment if auto-enrollment has issues
  }
}

//POST / CREATE PATHWAY
async function createPathway(pathwayName, pathwayDescription, token) {
  try {
    console.log('createPathway service: Starting pathway creation');
    console.log('Token received (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    let decodedToken;
    try {
      decodedToken = jwtDecode(token);
      console.log('Token decoded successfully, email:', decodedToken.email);
    } catch (jwtError) {
      console.error('JWT decode error:', jwtError);
      throw new Error('Invalid token format');
    }
    
    const employeeEmail = decodedToken.email;
    
    if (!employeeEmail) {
      throw new Error('No email found in token');
    }
    
    console.log('Looking up employee with email:', employeeEmail);
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      console.error('Employee not found for email:', employeeEmail);
      throw new Error('Employee not found');
    }
    
    console.log('Employee found, ID:', employee.employeeID);
    console.log('Creating pathway with name:', pathwayName);
    
    const result = await prisma.pathways.create({
      data: {
        pathwayName,
        pathwayDescription,
        pathwayManagerID: employee.employeeID
      }
    });
    
    console.log('Pathway created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error in createPathway service:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// UPDATE PATHWAY
async function updatePathway(pathwayID, updateData, token) {
  try {
    console.log('updatePathway: Updating pathway ID:', pathwayID);
    console.log('updatePathway: Update data:', updateData);
    
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Verify the user owns this pathway
    const pathway = await prisma.pathways.findUnique({
      where: { pathwayID: parseInt(pathwayID) }
    });
    
    if (!pathway) {
      throw new Error('Pathway not found');
    }
    
    if (pathway.pathwayManagerID !== employee.employeeID) {
      throw new Error('Unauthorized: You can only update pathways you manage');
    }
    
    // Update the pathway
    const updatedPathway = await prisma.pathways.update({
      where: { pathwayID: parseInt(pathwayID) },
      data: updateData
    });
    
    console.log('updatePathway: Pathway updated successfully');
    return updatedPathway;
  } catch (error) {
    console.error('Error updating pathway:', error);
    throw error;
  }
}

// DELETE PATHWAY
async function deletePathway(pathwayID, token) {
  try {
    console.log('deletePathway: Deleting pathway ID:', pathwayID);
    
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee information
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Verify the user owns this pathway
    const pathway = await prisma.pathways.findUnique({
      where: { pathwayID: parseInt(pathwayID) }
    });
    
    if (!pathway) {
      throw new Error('Pathway not found');
    }
    
    if (pathway.pathwayManagerID !== employee.employeeID) {
      throw new Error('Unauthorized: You can only delete pathways you manage');
    }
    
    const parsedPathwayId = parseInt(pathwayID);

    const [pathwayEnrollments, pathwayCourses, pathwayAssessments, pathwayTemplates] = await Promise.all([
      prisma.pathways_employees.findMany({
        where: { pathwayID: parsedPathwayId },
        select: { employeeID: true }
      }),
      prisma.pathways_courses.findMany({
        where: { pathwayID: parsedPathwayId },
        select: { courseID: true }
      }),
      prisma.pathways_assessments.findMany({
        where: { pathwayID: parsedPathwayId },
        select: { assessmentID: true }
      }),
      prisma.pathways_experience_templates.findMany({
        where: { pathwayID: parsedPathwayId },
        select: { experience_templateID: true }
      })
    ]);

    const employeeIds = pathwayEnrollments.map((item) => item.employeeID);
    const courseIds = pathwayCourses.map((item) => item.courseID);
    const assessmentIds = pathwayAssessments.map((item) => item.assessmentID);
    const templateIds = pathwayTemplates.map((item) => item.experience_templateID);

    const deletedPathway = await prisma.$transaction(async (tx) => {
      if (employeeIds.length && templateIds.length) {
        await tx.employees_experiences.deleteMany({
          where: {
            employeeID: { in: employeeIds },
            experience_templateID: { in: templateIds },
            OR: [
              { refereeText: null },
              { refereeText: '' }
            ]
          }
        });
      }

      if (employeeIds.length && courseIds.length) {
        await tx.employees_courses.deleteMany({
          where: {
            employeeID: { in: employeeIds },
            courseID: { in: courseIds },
            completionDate: null,
            score: null
          }
        });
      }

      if (employeeIds.length && assessmentIds.length) {
        await tx.employees_assessments.deleteMany({
          where: {
            employeeID: { in: employeeIds },
            assessmentID: { in: assessmentIds },
            completionDate: null,
            score: null
          }
        });
      }

      await tx.pathways_employees.deleteMany({
        where: { pathwayID: parsedPathwayId }
      });

      await tx.pathways_courses.deleteMany({
        where: { pathwayID: parsedPathwayId }
      });

      await tx.pathways_assessments.deleteMany({
        where: { pathwayID: parsedPathwayId }
      });

      await tx.pathways_experience_templates.deleteMany({
        where: { pathwayID: parsedPathwayId }
      });

      return tx.pathways.delete({
        where: { pathwayID: parsedPathwayId }
      });
    });
    
    console.log('deletePathway: Pathway deleted successfully');
    return deletedPathway;
  } catch (error) {
    console.error('Error deleting pathway:', error);
    throw error;
  }
}

// EXPORTS
module.exports = {
  loadPathways,
  enrolPathway,
  createPathway,
  updatePathway,
  deletePathway
}