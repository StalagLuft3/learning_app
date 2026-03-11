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

// GET MANAGED PATHWAYS WITH ENROLLMENTS AND CALCULATED COMPLETION STATUS
async function getManagedPathways(managerId) {
  try {
    console.log('getManagedPathways called with managerId:', managerId);
    
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

    console.log(`Found ${pathways.length} pathways`);

    // Calculate completion status for each pathway enrollment
    const transformedPathways = await Promise.all(pathways.map(async pathway => {
      console.log(`Processing pathway ${pathway.pathwayName} with ${pathway.pathways_employees.length} enrollments`);
      
      const enrollmentsWithProgress = await Promise.all(pathway.pathways_employees.map(async enrollment => {
        const employeeId = enrollment.employeeID;
        
        // Get total required components
        const totalCourses = pathway.pathways_courses.length;
        const totalAssessments = pathway.pathways_assessments.length;
        const totalExperienceTemplates = pathway.pathways_experience_templates.length;
        const totalComponents = totalCourses + totalAssessments + totalExperienceTemplates;
        
        console.log(`Employee ${enrollment.employees.username}: ${totalCourses} courses, ${totalAssessments} assessments, ${totalExperienceTemplates} experiences = ${totalComponents} total components`);
        
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
        
        console.log(`${enrollment.employees.username}: ${completedComponents}/${totalComponents} components, ${completedDuration}h/${totalDuration}h (${completionPercentage}%), status: ${isCompleted ? 'Completed' : 'In Progress'}`);
        
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
    console.error('Error loading managed pathways:', error);
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
    console.error('Error updating pathway:', error);
    throw error;
  }
}

// GET AVAILABLE COURSES FOR PATHWAY
async function getAvailableCourses(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get courses already in this pathway
    const pathwayCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: pathwayID },
      select: { courseID: true }
    });

    const usedCourseIds = pathwayCourses.map(pc => pc.courseID);

    // Get all available courses not already in this pathway
    const availableCourses = await prisma.courses.findMany({
      where: {
        courseID: {
          notIn: usedCourseIds
        }
      },
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      },
      orderBy: {
        courseName: 'asc'
      }
    });

    return availableCourses;
  } catch (error) {
    console.error('Error loading available courses:', error);
    throw error;
  }
}

// GET AVAILABLE ASSESSMENTS FOR PATHWAY
async function getAvailableAssessments(pathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get assessments already in this pathway
    const pathwayAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: pathwayID },
      select: { assessmentID: true }
    });

    const usedAssessmentIds = pathwayAssessments.map(pa => pa.assessmentID);

    // Get all available assessments not already in this pathway
    const availableAssessments = await prisma.assessments.findMany({
      where: {
        assessmentID: {
          notIn: usedAssessmentIds
        }
      },
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return availableAssessments;
  } catch (error) {
    console.error('Error loading available assessments:', error);
    throw error;
  }
}

// GET AVAILABLE EXPERIENCE TEMPLATES FOR PATHWAY
async function getAvailableExperienceTemplates(pathwayID, token) {
  try {
    // Get experience templates already in this pathway
    const pathwayTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: pathwayID },
      select: { experience_templateID: true }
    });

    const usedTemplateIds = pathwayTemplates.map(pt => pt.experience_templateID);

    // Get all available experience templates not already in this pathway
    const availableTemplates = await prisma.experience_templates.findMany({
      where: {
        experience_templateID: {
          notIn: usedTemplateIds
        }
      },
      orderBy: {
        experienceDescription: 'asc'
      }
    });

    return availableTemplates;
  } catch (error) {
    console.error('Error loading available experience templates:', error);
    throw error;
  }
}

// GET AVAILABLE PATHWAYS FOR COPYING CONTENTS
async function getAvailablePathways(currentPathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get all other pathways (excluding current one)
    const availablePathways = await prisma.pathways.findMany({
      where: {
        pathwayID: {
          not: currentPathwayID
        }
      },
      include: {
        manager: {
          select: {
            username: true,
            role: true
          }
        },
        _count: {
          select: {
            pathways_courses: true,
            pathways_assessments: true,
            pathways_experience_templates: true
          }
        }
      },
      orderBy: {
        pathwayName: 'asc'
      }
    });

    return availablePathways;
  } catch (error) {
    console.error('Error loading available pathways:', error);
    throw error;
  }
}

// ADD COURSE TO PATHWAY
async function addCourseToPathway(pathwayID, courseID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if pathway exists and user is manager
    const pathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: pathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Check if course already exists in pathway
    const existingCoursePathway = await prisma.pathways_courses.findFirst({
      where: {
        pathwayID: pathwayID,
        courseID: courseID
      }
    });

    if (existingCoursePathway) {
      throw new Error('Course is already part of this pathway');
    }

    // Check if students are already enrolled in this pathway for the course
    const existingCourseEnrollment = await prisma.employees_courses.findFirst({
      where: {
        courseID: courseID,
        employeeID: {
          in: await prisma.pathways_employees.findMany({
            where: { pathwayID: pathwayID },
            select: { employeeID: true }
          }).then(enrollments => enrollments.map(e => e.employeeID))
        }
      }
    });

    if (!existingCourseEnrollment) {
      // Auto-enroll all pathway students in this course
      const pathwayStudents = await prisma.pathways_employees.findMany({
        where: { pathwayID: pathwayID }
      });

      for (const student of pathwayStudents) {
        await prisma.employees_courses.create({
          data: {
            employeeID: student.employeeID,
            courseID: courseID,
            currentStatus: 'In Progress',
            recordDate: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    // Add course to pathway
    const result = await prisma.pathways_courses.create({
      data: {
        pathwayID: pathwayID,
        courseID: courseID
      }
    });

    return result;
  } catch (error) {
    console.error('Error adding course to pathway:', error);
    throw error;
  }
}

// REMOVE COURSE FROM PATHWAY
async function removeCourseFromPathway(pathwayID, courseID, token) {
  try {
    // Remove the course from pathway
    const result = await prisma.pathways_courses.deleteMany({
      where: {
        pathwayID: pathwayID,
        courseID: courseID
      }
    });

    if (result.count === 0) {
      throw new Error('Course-pathway relationship not found');
    }

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
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if pathway exists and user is manager
    const pathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: pathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Check if assessment already exists in pathway
    const existingAssessmentPathway = await prisma.pathways_assessments.findFirst({
      where: {
        pathwayID: pathwayID,
        assessmentID: assessmentID
      }
    });

    if (existingAssessmentPathway) {
      throw new Error('Assessment is already part of this pathway');
    }

    // Check if students are already enrolled in this pathway for the assessment
    const existingAssessmentEnrollment = await prisma.employees_assessments.findFirst({
      where: {
        assessmentID: assessmentID,
        employeeID: {
          in: await prisma.pathways_employees.findMany({
            where: { pathwayID: pathwayID },
            select: { employeeID: true }
          }).then(enrollments => enrollments.map(e => e.employeeID))
        }
      }
    });

    if (!existingAssessmentEnrollment) {
      // Auto-enroll all pathway students in this assessment
      const pathwayStudents = await prisma.pathways_employees.findMany({
        where: { pathwayID: pathwayID }
      });

      for (const student of pathwayStudents) {
        await prisma.employees_assessments.create({
          data: {
            employeeID: student.employeeID,
            assessmentID: assessmentID,
            currentStatus: 'In Progress',
            recordDate: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    // Add assessment to pathway
    const result = await prisma.pathways_assessments.create({
      data: {
        pathwayID: pathwayID,
        assessmentID: assessmentID
      }
    });

    return result;
  } catch (error) {
    console.error('Error adding assessment to pathway:', error);
    throw error;
  }
}

// REMOVE ASSESSMENT FROM PATHWAY
async function removeAssessmentFromPathway(pathwayID, assessmentID, token) {
  try {
    // Remove the assessment from pathway
    const result = await prisma.pathways_assessments.deleteMany({
      where: {
        pathwayID: pathwayID,
        assessmentID: assessmentID
      }
    });

    if (result.count === 0) {
      throw new Error('Assessment-pathway relationship not found');
    }

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
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if pathway exists and user is manager
    const pathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: pathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Check if template already exists in pathway
    const existingTemplatePathway = await prisma.pathways_experience_templates.findFirst({
      where: {
        pathwayID: pathwayID,
        experience_templateID: templateID
      }
    });

    if (existingTemplatePathway) {
      throw new Error('Experience template is already part of this pathway');
    }

    // Check if students are already enrolled in this pathway for the experience template
    const existingExperienceEnrollment = await prisma.employees_experiences.findFirst({
      where: {
        experience_templateID: templateID,
        employeeID: {
          in: await prisma.pathways_employees.findMany({
            where: { pathwayID: pathwayID },
            select: { employeeID: true }
          }).then(enrollments => enrollments.map(e => e.employeeID))
        }
      }
    });

    if (!existingExperienceEnrollment) {
      // Auto-enroll all pathway students in this experience template
      const pathwayStudents = await prisma.pathways_employees.findMany({
        where: { pathwayID: pathwayID }
      });

      const experienceTemplate = await prisma.experience_templates.findUnique({
        where: { experience_templateID: templateID }
      });

      for (const student of pathwayStudents) {
        await prisma.employees_experiences.create({
          data: {
            employeeID: student.employeeID,
            experience_templateID: templateID,
            experienceDescription: experienceTemplate.experienceDescription,
            duration: 0, // Will be updated when experience is completed
            recordDate: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    // Add experience template to pathway
    const result = await prisma.pathways_experience_templates.create({
      data: {
        pathwayID: pathwayID,
        experience_templateID: templateID
      }
    });

    return result;
  } catch (error) {
    console.error('Error adding experience template to pathway:', error);
    throw error;
  }
}

// REMOVE EXPERIENCE TEMPLATE FROM PATHWAY
async function removeExperienceTemplateFromPathway(pathwayID, templateID, token) {
  try {
    // Remove the experience template from pathway
    const result = await prisma.pathways_experience_templates.deleteMany({
      where: {
        pathwayID: pathwayID,
        experience_templateID: templateID
      }
    });

    if (result.count === 0) {
      throw new Error('Experience template-pathway relationship not found');
    }

    return result;
  } catch (error) {
    console.error('Error removing experience template from pathway:', error);
    throw error;
  }
}

// COPY PATHWAY CONTENTS
async function copyPathwayContents(targetPathwayID, sourcePathwayID, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if target pathway exists and user is manager
    const targetPathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: targetPathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!targetPathway) {
      throw new Error('Target pathway not found or you do not have permission to modify it');
    }

    // Get source pathway contents
    const sourceCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: sourcePathwayID },
      select: { courseID: true }
    });

    const sourceAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: sourcePathwayID },
      select: { assessmentID: true }
    });

    const sourceTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: sourcePathwayID },
      select: { experience_templateID: true }
    });

    let addedItems = 0;

    // Copy courses
    for (const course of sourceCourses) {
      try {
        await addCourseToPathway(targetPathwayID, course.courseID, token);
        addedItems++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('already part of')) {
          console.error('Error copying course:', error);
        }
      }
    }

    // Copy assessments
    for (const assessment of sourceAssessments) {
      try {
        await addAssessmentToPathway(targetPathwayID, assessment.assessmentID, token);
        addedItems++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('already part of')) {
          console.error('Error copying assessment:', error);
        }
      }
    }

    // Copy experience templates
    for (const template of sourceTemplates) {
      try {
        await addExperienceTemplateToPathway(targetPathwayID, template.experience_templateID, token);
        addedItems++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('already part of')) {
          console.error('Error copying experience template:', error);
        }
      }
    }

    return { 
      message: `Successfully copied ${addedItems} items to pathway`,
      copiedItems: addedItems,
      totalSourceItems: sourceCourses.length + sourceAssessments.length + sourceTemplates.length
    };
  } catch (error) {
    console.error('Error copying pathway contents:', error);
    throw error;
  }
}

// GET ALL EXPERIENCE TEMPLATES
async function getAllExperienceTemplates(token) {
  try {
    const templates = await prisma.experience_templates.findMany({
      orderBy: {
        experienceDescription: 'asc'
      }
    });

    return templates;
  } catch (error) {
    console.error('Error loading experience templates:', error);
    throw error;
  }
}

// CREATE EXPERIENCE TEMPLATE
async function createExperienceTemplate(templateData, token) {
  try {
    const { experienceDescription, minimumDuration } = templateData;

    const result = await prisma.experience_templates.create({
      data: {
        experienceDescription,
        minimumDuration: parseFloat(minimumDuration) || 0
      }
    });

    return result;
  } catch (error) {
    console.error('Error creating experience template:', error);
    throw error;
  }
}

// UPDATE EXPERIENCE TEMPLATE
async function updateExperienceTemplate(templateID, updateData, token) {
  try {
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
  getManagedPathways,
  updatePathway,
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
  getAllExperienceTemplates,
  createExperienceTemplate,
  updateExperienceTemplate,
  deleteExperienceTemplate
};