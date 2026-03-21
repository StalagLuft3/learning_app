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
    throw error;
    throw error;
  }
}

// GET MANAGED PATHWAYS WITH ENROLLMENTS AND CALCULATED COMPLETION STATUS
async function getManagedPathways(managerId) {
  try {
    
    
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

    

    // Calculate completion status for each pathway enrollment
    const transformedPathways = await Promise.all(pathways.map(async pathway => {
      
      
      const enrollmentsWithProgress = await Promise.all(pathway.pathways_employees.map(async enrollment => {
        const employeeId = enrollment.employeeID;
        
        // Get total required components
        const totalCourses = pathway.pathways_courses.length;
        const totalAssessments = pathway.pathways_assessments.length;
        const totalExperienceTemplates = pathway.pathways_experience_templates.length;
        const totalComponents = totalCourses + totalAssessments + totalExperienceTemplates;
                
        let completedComponents = 0;
        let totalDuration = 0;
        let completedDuration = 0;
        
        // Check completed courses
        const courseCompletions = await prisma.employees_courses.findMany({
          where: {
            employeeID: employeeId,
            courseID: {
              in: pathway.pathways_courses.map(pc => pc.courseID)
            },
            currentStatus: 'Completed'
          },
          include: {
            courses: {
              select: {
                duration: true
              }
            }
          }
        });
        
        completedComponents += courseCompletions.length;
        completedDuration += courseCompletions.reduce((sum, cc) => sum + (cc.courses.duration || 0), 0);
        totalDuration += pathway.pathways_courses.reduce((sum, pc) => sum + (pc.courses.duration || 0), 0);
        
        // Check completed assessments
        const assessmentCompletions = await prisma.employees_assessments.findMany({
          where: {
            employeeID: employeeId,
            assessmentID: {
              in: pathway.pathways_assessments.map(pa => pa.assessmentID)
            },
            currentStatus: 'Passed'
          },
          include: {
            assessments: {
              select: {
                duration: true
              }
            }
          }
        });
        
        completedComponents += assessmentCompletions.length;
        completedDuration += assessmentCompletions.reduce((sum, ac) => sum + (ac.assessments.duration || 0), 0);
        totalDuration += pathway.pathways_assessments.reduce((sum, pa) => sum + (pa.assessments.duration || 0), 0);
        
        // Check completed experiences (based on experience templates)
        const experienceCompletions = await prisma.employees_experiences.findMany({
          where: {
            employeeID: employeeId,
            experience_templateID: {
              in: pathway.pathways_experience_templates.map(pt => pt.experience_templateID)
            },
            refereeText: {
              not: null
            }
          }
        });
        
        completedComponents += experienceCompletions.length;
        completedDuration += experienceCompletions.reduce((sum, exp) => sum + (exp.duration || 0), 0);
        totalDuration += pathway.pathways_experience_templates.reduce((sum, pt) => sum + (pt.experience_templates.minimumDuration || 0), 0);
        
        // Calculate completion status
        const isCompleted = totalComponents > 0 && completedComponents === totalComponents;
        const completionPercentage = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
        
        
        
        return {
          pathway_employeeID: enrollment.pathway_employeeID,
          employeeID: enrollment.employeeID,
          username: enrollment.employees.username,
          role: enrollment.employees.role,
          email: enrollment.employees.email,
          recordDate: enrollment.recordDate,
          pathwayID: enrollment.pathwayID,
          currentStatus: isCompleted ? 'Completed' : 'In Progress',
          completedComponents,
          totalComponents,
          completionPercentage,
          completedDuration,
          totalDuration
        };
      }));

      return {
        pathwayID: pathway.pathwayID,
        pathwayName: pathway.pathwayName,
        pathwayDescription: pathway.pathwayDescription,
        managerName: pathway.manager.username,
        managerRole: pathway.manager.role,
        enrollments: enrollmentsWithProgress,
        courses: pathway.pathways_courses.map(pc => pc.courses),
        assessments: pathway.pathways_assessments.map(pa => pa.assessments),
        experienceTemplates: pathway.pathways_experience_templates.map(pt => pt.experience_templates),
        totalEnrollments: enrollmentsWithProgress.length,
        completedEnrollments: enrollmentsWithProgress.filter(e => e.currentStatus === 'Completed').length
      };
    }));

    return { pathways: transformedPathways };
  } catch (error) {
    throw error;
    throw error;
  }
}

// UPDATE PATHWAY DETAILS
async function updatePathway(pathwayID, updateData) {
  try {
    
    const updateFields = {};
    
    if (updateData.pathwayName) {
      updateFields.pathwayName = updateData.pathwayName;
    }
    
    if (updateData.pathwayDescription !== undefined) {
      updateFields.pathwayDescription = updateData.pathwayDescription;
    }


    const result = await prisma.pathways.update({
      where: {
        pathwayID: pathwayID
      },
      data: updateFields
    });

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// ===== PATHWAY CONTENT MANAGEMENT =====

// GET AVAILABLE COURSES for pathway content selection
async function getAvailableCourses(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    // Get employee to verify permissions
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }


    // Get all courses
    const allCourses = await prisma.courses.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });


    // Get courses already in this pathway
    const pathwayCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { courseID: true }
    });
    
    
    const existingCourseIDs = pathwayCourses.map(pc => pc.courseID);

    // Filter out courses already in pathway and return only available ones
    const availableCourses = allCourses
      .filter(course => !existingCourseIDs.includes(course.courseID))
      .map(course => ({
        ...course,
        managerName: course.manager.username,
        managerRole: course.manager.role
      }));

    return { courses: availableCourses };
  } catch (error) {
    throw error;
    throw error;
  }
}

// GET AVAILABLE ASSESSMENTS for pathway content selection
async function getAvailableAssessments(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }


    const allAssessments = await prisma.assessments.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });


    const pathwayAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { assessmentID: true }
    });
    
    
    const existingAssessmentIDs = pathwayAssessments.map(pa => pa.assessmentID);

    // Filter out assessments already in pathway and return only available ones
    const availableAssessments = allAssessments
      .filter(assessment => !existingAssessmentIDs.includes(assessment.assessmentID))
      .map(assessment => ({
        ...assessment,
        managerName: assessment.manager.username,
        managerRole: assessment.manager.role
      }));

    return { assessments: availableAssessments };
  } catch (error) {
    throw error;
    throw error;
  }
}

// GET AVAILABLE EXPERIENCE TEMPLATES for pathway content selection
async function getAvailableExperienceTemplates(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }


    const allExperienceTemplates = await prisma.experience_templates.findMany({});


    const pathwayExperienceTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { experience_templateID: true }
    });
    
    
    const existingTemplateIDs = pathwayExperienceTemplates.map(pet => pet.experience_templateID);

    // Filter out experience templates already in pathway and return only available ones
    const availableExperienceTemplates = allExperienceTemplates
      .filter(template => !existingTemplateIDs.includes(template.experience_templateID));

    return { experienceTemplates: availableExperienceTemplates };
  } catch (error) {
    throw error;
    throw error;
  }
}

// GET AVAILABLE ASSESSMENTS for pathway content selection
async function getAvailableAssessments(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }


    const allAssessments = await prisma.assessments.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });


    const pathwayAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { assessmentID: true }
    });
    
    
    const existingAssessmentIDs = pathwayAssessments.map(pa => pa.assessmentID);

    // This block is replaced by the previous replacement
  } catch (error) {
    throw error;
    throw error;
  }
}

// GET AVAILABLE EXPERIENCE TEMPLATES for pathway content selection
async function getAvailableExperienceTemplates(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }


    const allTemplates = await prisma.experience_templates.findMany();


    const pathwayTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parseInt(pathwayID) },
      select: { experience_templateID: true }
    });
    
    
    const existingTemplateIDs = pathwayTemplates.map(pt => pt.experience_templateID);

    const templatesWithStatus = allTemplates.map(template => ({
      ...template,
      isInPathway: existingTemplateIDs.includes(template.experience_templateID)
    }));

    return { experienceTemplates: templatesWithStatus };
  } catch (error) {
    throw error;
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
    throw error;
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


    const result = await prisma.experience_templates.update({
      where: {
        experience_templateID: parseInt(templateID)
      },
      data: updateFields
    });

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
        // completionDate removed
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
    // completionDate logic removed


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
        // completionDate removed
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
        assessmentID: assessmentID
      },
      data: updateFields
    });

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
    
    // Remove accreditationDate logic - using completionDate instead
    
    // completionDate logic removed


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
