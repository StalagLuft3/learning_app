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
        pathways_experience_templates: {
          include: {
            experience_templates: true
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
      assessments: pathway.pathways_assessments.map(pa => pa.assessments),
      experienceTemplates: pathway.pathways_experience_templates.map(pt => pt.experience_templates)
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

// ===== PATHWAY CONTENT MANAGEMENT =====

// GET AVAILABLE COURSES for pathway content selection
async function getAvailableCourses(pathwayID, token) {
  try {
    console.log('getAvailableCourses: Starting for pathway', pathwayID);
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee to verify permissions
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log('getAvailableCourses: Employee found:', employee.username);

    // Get all courses
    const allCourses = await prisma.courses.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });

    console.log('getAvailableCourses: Total courses found:', allCourses.length);

    // Get courses already in this pathway
    const pathwayCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { courseID: true }
    });
    
    console.log('getAvailableCourses: Courses already in pathway:', pathwayCourses.length);
    
    const existingCourseIDs = pathwayCourses.map(pc => pc.courseID);

    // Return all courses with indication of whether they're already in pathway
    const coursesWithStatus = allCourses.map(course => ({
      ...course,
      managerName: course.manager.username,
      managerRole: course.manager.role,
      isInPathway: existingCourseIDs.includes(course.courseID)
    }));

    console.log('getAvailableCourses: Returning courses with status:', coursesWithStatus.length);
    return { courses: coursesWithStatus };
  } catch (error) {
    console.error('Error loading available courses:', error);
    throw error;
  }
}

// GET AVAILABLE ASSESSMENTS for pathway content selection
async function getAvailableAssessments(pathwayID, token) {
  try {
    console.log('getAvailableAssessments: Starting for pathway', pathwayID);
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log('getAvailableAssessments: Employee found:', employee.username);

    const allAssessments = await prisma.assessments.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });

    console.log('getAvailableAssessments: Total assessments found:', allAssessments.length);

    const pathwayAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { assessmentID: true }
    });
    
    console.log('getAvailableAssessments: Assessments already in pathway:', pathwayAssessments.length);
    
    const existingAssessmentIDs = pathwayAssessments.map(pa => pa.assessmentID);

    const assessmentsWithStatus = allAssessments.map(assessment => ({
      ...assessment,
      managerName: assessment.manager.username,
      managerRole: assessment.manager.role,
      isInPathway: existingAssessmentIDs.includes(assessment.assessmentID)
    }));

    console.log('getAvailableAssessments: Returning assessments with status:', assessmentsWithStatus.length);
    return { assessments: assessmentsWithStatus };
  } catch (error) {
    console.error('Error loading available assessments:', error);
    throw error;
  }
}

// GET AVAILABLE EXPERIENCE TEMPLATES for pathway content selection
async function getAvailableExperienceTemplates(pathwayID, token) {
  try {
    console.log('getAvailableExperienceTemplates: Starting for pathway', pathwayID);
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log('getAvailableExperienceTemplates: Employee found:', employee.username);

    const allTemplates = await prisma.experience_templates.findMany();

    console.log('getAvailableExperienceTemplates: Total templates found:', allTemplates.length);

    const pathwayTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { experience_templateID: true }
    });
    
    console.log('getAvailableExperienceTemplates: Templates already in pathway:', pathwayTemplates.length);
    
    const existingTemplateIDs = pathwayTemplates.map(pt => pt.experience_templateID);

    const templatesWithStatus = allTemplates.map(template => ({
      ...template,
      isInPathway: existingTemplateIDs.includes(template.experience_templateID)
    }));

    console.log('getAvailableExperienceTemplates: Returning templates with status:', templatesWithStatus.length);
    return { experienceTemplates: templatesWithStatus };
  } catch (error) {
    console.error('Error loading available experience templates:', error);
    throw error;
  }
}

// GET AVAILABLE PATHWAYS for content copying
async function getAvailablePathways(currentPathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get all pathways except the current one
    const allPathways = await prisma.pathways.findMany({
      where: {
        pathwayID: { not: parseInt(currentPathwayID) }
      },
      include: {
        manager: {
          select: { username: true, role: true }
        },
        _count: {
          select: {
            pathways_courses: true,
            pathways_assessments: true,
            pathways_experience_templates: true
          }
        }
      }
    });

    const pathwaysWithCounts = allPathways.map(pathway => ({
      pathwayID: pathway.pathwayID,
      pathwayName: pathway.pathwayName,
      pathwayDescription: pathway.pathwayDescription,
      managerName: pathway.manager.username,
      managerRole: pathway.manager.role,
      contentCount: {
        courses: pathway._count.pathways_courses,
        assessments: pathway._count.pathways_assessments,
        experienceTemplates: pathway._count.pathways_experience_templates
      }
    }));

    return { pathways: pathwaysWithCounts };
  } catch (error) {
    console.error('Error loading available pathways:', error);
    throw error;
  }
}

// ADD COURSE TO PATHWAY
async function addCourseToPathway(pathwayID, courseID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    // Verify user is pathway manager
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(pathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of this pathway');
    }

    // Check if course is already in pathway
    const existing = await prisma.pathways_courses.findFirst({
      where: {
        pathwayID: parseInt(pathwayID),
        courseID: parseInt(courseID)
      }
    });

    if (existing) {
      throw new Error('Course is already in this pathway');
    }

    // Add course to pathway
    const result = await prisma.pathways_courses.create({
      data: {
        pathwayID: parseInt(pathwayID),
        courseID: parseInt(courseID)
      }
    });

    // Auto-enroll all pathway participants in the new course
    const pathwayEnrollments = await prisma.pathways_employees.findMany({
      where: { pathwayID: parseInt(pathwayID) }
    });

    for (const enrollment of pathwayEnrollments) {
      // Check if employee is already enrolled in this course
      const existingCourseEnrollment = await prisma.employees_courses.findFirst({
        where: {
          employeeID: enrollment.employeeID,
          courseID: parseInt(courseID)
        }
      });

      if (!existingCourseEnrollment) {
        await prisma.employees_courses.create({
          data: {
            employeeID: enrollment.employeeID,
            courseID: parseInt(courseID),
            currentStatus: 'Not Started',
            recordDate: new Date().toISOString().substring(0,10)
          }
        });
      }
    }

    console.log('addCourseToPathway: Course added successfully and employees enrolled');
    return result;
  } catch (error) {
    console.error('Error adding course to pathway:', error);
    throw error;
  }
}

// REMOVE COURSE FROM PATHWAY
async function removeCourseFromPathway(pathwayID, courseID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    // Verify user is pathway manager
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(pathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of this pathway');
    }

    // Remove course from pathway
    const result = await prisma.pathways_courses.deleteMany({
      where: {
        pathwayID: parseInt(pathwayID),
        courseID: parseInt(courseID)
      }
    });

    console.log('removeCourseFromPathway: Course removed successfully');
    return result;
  } catch (error) {
    console.error('Error removing course from pathway:', error);
    throw error;
  }
}

// ADD ASSESSMENT TO PATHWAY
async function addAssessmentToPathway(pathwayID, assessmentID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(pathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of this pathway');
    }

    const existing = await prisma.pathways_assessments.findFirst({
      where: {
        pathwayID: parseInt(pathwayID),
        assessmentID: parseInt(assessmentID)
      }
    });

    if (existing) {
      throw new Error('Assessment is already in this pathway');
    }

    const result = await prisma.pathways_assessments.create({
      data: {
        pathwayID: parseInt(pathwayID),
        assessmentID: parseInt(assessmentID)
      }
    });

    // Auto-enroll all pathway participants in the new assessment
    const pathwayEnrollments = await prisma.pathways_employees.findMany({
      where: { pathwayID: parseInt(pathwayID) }
    });

    for (const enrollment of pathwayEnrollments) {
      const existingAssessmentEnrollment = await prisma.employees_assessments.findFirst({
        where: {
          employeeID: enrollment.employeeID,
          assessmentID: parseInt(assessmentID)
        }
      });

      if (!existingAssessmentEnrollment) {
        await prisma.employees_assessments.create({
          data: {
            employeeID: enrollment.employeeID,
            assessmentID: parseInt(assessmentID),
            currentStatus: 'Not Started',
            recordDate: new Date().toISOString().substring(0,10)
          }
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error adding assessment to pathway:', error);
    throw error;
  }
}

// REMOVE ASSESSMENT FROM PATHWAY
async function removeAssessmentFromPathway(pathwayID, assessmentID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(pathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of this pathway');
    }

    const result = await prisma.pathways_assessments.deleteMany({
      where: {
        pathwayID: parseInt(pathwayID),
        assessmentID: parseInt(assessmentID)
      }
    });

    return result;
  } catch (error) {
    console.error('Error removing assessment from pathway:', error);
    throw error;
  }
}

// ADD EXPERIENCE TEMPLATE TO PATHWAY
async function addExperienceTemplateToPathway(pathwayID, templateID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(pathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of this pathway');
    }

    const existing = await prisma.pathways_experience_templates.findFirst({
      where: {
        pathwayID: parseInt(pathwayID),
        experience_templateID: parseInt(templateID)
      }
    });

    if (existing) {
      throw new Error('Experience template is already in this pathway');
    }

    const result = await prisma.pathways_experience_templates.create({
      data: {
        pathwayID: parseInt(pathwayID),
        experience_templateID: parseInt(templateID)
      }
    });

    // Auto-enroll all pathway participants in the new experience template
    const pathwayEnrollments = await prisma.pathways_employees.findMany({
      where: { pathwayID: parseInt(pathwayID) }
    });

    for (const enrollment of pathwayEnrollments) {
      const existingExperienceEnrollment = await prisma.employees_experiences.findFirst({
        where: {
          employeeID: enrollment.employeeID,
          experience_templateID: parseInt(templateID)
        }
      });

      if (!existingExperienceEnrollment) {
        // Get the template for default values
        const template = await prisma.experience_templates.findUnique({
          where: { experience_templateID: parseInt(templateID) }
        });

        await prisma.employees_experiences.create({
          data: {
            employeeID: enrollment.employeeID,
            experience_templateID: parseInt(templateID),
            experienceDescription: template?.experienceDescription || '',
            duration: template?.minimumDuration || 0,
            employeeText: null,
            refereeID: null,
            refereeText: null
          }
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error adding experience template to pathway:', error);
    throw error;
  }
}

// REMOVE EXPERIENCE TEMPLATE FROM PATHWAY
async function removeExperienceTemplateFromPathway(pathwayID, templateID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(pathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of this pathway');
    }

    const result = await prisma.pathways_experience_templates.deleteMany({
      where: {
        pathwayID: parseInt(pathwayID),
        experience_templateID: parseInt(templateID)
      }
    });

    return result;
  } catch (error) {
    console.error('Error removing experience template from pathway:', error);
    throw error;
  }
}

// COPY PATHWAY CONTENTS - Copy courses, assessments, and experience templates from another pathway
async function copyPathwayContents(targetPathwayID, sourcePathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const pathway = await prisma.pathways.findFirst({
      where: { pathwayID: parseInt(targetPathwayID) },
      include: { manager: true }
    });
    
    if (!pathway || pathway.manager.email !== employeeEmail) {
      throw new Error('Unauthorized: You are not the manager of the target pathway');
    }

    // Get source pathway content
    const sourceCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: parseInt(sourcePathwayID) }
    });

    const sourceAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parseInt(sourcePathwayID) }
    });

    const sourceTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parseInt(sourcePathwayID) }
    });

    // Get current pathway content to avoid duplicates
    const currentCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: parseInt(targetPathwayID) },
      select: { courseID: true }
    });

    const currentAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parseInt(targetPathwayID) },
      select: { assessmentID: true }
    });

    const currentTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parseInt(targetPathwayID) },
      select: { experience_templateID: true }
    });

    const currentCourseIDs = currentCourses.map(c => c.courseID);
    const currentAssessmentIDs = currentAssessments.map(a => a.assessmentID);
    const currentTemplateIDs = currentTemplates.map(t => t.experience_templateID);

    let copied = {
      courses: 0,
      assessments: 0,
      experienceTemplates: 0
    };

    // Copy courses
    for (const course of sourceCourses) {
      if (!currentCourseIDs.includes(course.courseID)) {
        await addCourseToPathway(targetPathwayID, course.courseID, token);
        copied.courses++;
      }
    }

    // Copy assessments
    for (const assessment of sourceAssessments) {
      if (!currentAssessmentIDs.includes(assessment.assessmentID)) {
        await addAssessmentToPathway(targetPathwayID, assessment.assessmentID, token);
        copied.assessments++;
      }
    }

    // Copy experience templates
    for (const template of sourceTemplates) {
      if (!currentTemplateIDs.includes(template.experience_templateID)) {
        await addExperienceTemplateToPathway(targetPathwayID, template.experience_templateID, token);
        copied.experienceTemplates++;
      }
    }

    return { copied };
  } catch (error) {
    console.error('Error copying pathway contents:', error);
    throw error;
  }
}

// ===== EXPERIENCE TEMPLATE MANAGEMENT =====

// GET ALL EXPERIENCE TEMPLATES for global management  
async function getAllExperienceTemplates(token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const templates = await prisma.experience_templates.findMany({
      orderBy: {
        experience_templateID: 'desc'
      }
    });

    return { experienceTemplates: templates };
  } catch (error) {
    console.error('Error loading experience templates:', error);
    throw error;
  }
}

// CREATE NEW EXPERIENCE TEMPLATE
async function createExperienceTemplate(templateData, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const newTemplate = await prisma.experience_templates.create({
      data: {
        experienceDescription: templateData.experienceDescription,
        minimumDuration: parseFloat(templateData.minimumDuration) || 0
      }
    });

    console.log('createExperienceTemplate: New template created successfully');
    return newTemplate;
  } catch (error) {
    console.error('Error creating experience template:', error);
    throw error;
  }
}

// UPDATE EXPERIENCE TEMPLATE
async function updateExperienceTemplate(templateID, updateData, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const updateFields = {};
    
    if (updateData.experienceDescription !== undefined) {
      updateFields.experienceDescription = updateData.experienceDescription;
    }
    
    if (updateData.minimumDuration !== undefined) {
      updateFields.minimumDuration = parseFloat(updateData.minimumDuration) || 0;
    }

    console.log('updateExperienceTemplate: Update fields:', updateFields);

    const result = await prisma.experience_templates.update({
      where: {
        experience_templateID: parseInt(templateID)
      },
      data: updateFields
    });

    console.log('updateExperienceTemplate: Update successful:', result);
    return result;
  } catch (error) {
    console.error('Error updating experience template:', error);
    throw error;
  }
}

// DELETE EXPERIENCE TEMPLATE
async function deleteExperienceTemplate(templateID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if template is used in any pathways
    const pathwayUsage = await prisma.pathways_experience_templates.findMany({
      where: { experience_templateID: parseInt(templateID) },
      include: {
        pathways: {
          select: { pathwayName: true }
        }
      }
    });

    if (pathwayUsage.length > 0) {
      const pathwayNames = pathwayUsage.map(usage => usage.pathways.pathwayName).join(', ');
      throw new Error(`Cannot delete template: it is used in pathway(s): ${pathwayNames}. Remove it from pathways first.`);
    }

    // Check if template has employee experience records
    const experienceRecords = await prisma.employees_experiences.findMany({
      where: { experience_templateID: parseInt(templateID) }
    });

    if (experienceRecords.length > 0) {
      throw new Error(`Cannot delete template: ${experienceRecords.length} employee experience record(s) are associated with it.`);
    }

    // Safe to delete
    const result = await prisma.experience_templates.delete({
      where: {
        experience_templateID: parseInt(templateID)
      }
    });

    console.log('deleteExperienceTemplate: Template deleted successfully');
    return result;
  } catch (error) {
    console.error('Error deleting experience template:', error);
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
  updatePathwayEnrollment,
  // Pathway content management
  getAvailableCourses,
  getAvailableAssessments,
  getAvailableExperienceTemplates,
  getAvailablePathways,
  addCourseToPathway,
  removeCourseFromPathway,
  addAssessmentToPathway,
  removeAssessmentFromPathway,
  addExperienceTemplateToPathway,
  removeExperienceTemplateFromPathway,
  copyPathwayContents,
  // Experience template management
  getAllExperienceTemplates,
  createExperienceTemplate,
  updateExperienceTemplate,
  deleteExperienceTemplate
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
