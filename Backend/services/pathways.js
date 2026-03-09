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

    const user = [employeeEmail, employee];
    
    return {
      pathwaysList,
      contents,
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
      const existingCourseEnrollment = await prisma.employees_courses.findFirst({
        where: {
          courseID: pathwayCourse.courseID,
          employeeID: employeeID
        }
      });
      
      if (!existingCourseEnrollment) {
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
      const existingAssessmentEnrollment = await prisma.employees_assessments.findFirst({
        where: {
          assessmentID: pathwayAssessment.assessmentID,
          employeeID: employeeID
        }
      });
      
      if (!existingAssessmentEnrollment) {
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
    
    // Delete related data first
    await prisma.pathways_employees.deleteMany({
      where: { pathwayID: parseInt(pathwayID) }
    });
    
    await prisma.pathways_courses.deleteMany({
      where: { pathwayID: parseInt(pathwayID) }
    });
    
    await prisma.pathways_assessments.deleteMany({
      where: { pathwayID: parseInt(pathwayID) }
    });
    
    // Delete the pathway
    const deletedPathway = await prisma.pathways.delete({
      where: { pathwayID: parseInt(pathwayID) }
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