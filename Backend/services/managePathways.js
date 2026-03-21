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
        experienceTemplates: pathway.pathways_experience_templates.map(pt => pt.experience_templates)
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

// UPDATE PATHWAY ENROLLMENT
// Current business rule: pathway managers can withdraw learners from pathway tracking.
// This removes pathway enrollment plus non-completed pathway experience records and
// enrolled-only course/assessment records that came from pathway enrollment.
async function updatePathwayEnrollment(enrollmentId, updateData, token) {
  try {
    if (updateData.newStatus !== 'Withdrawn') {
      throw new Error('Only "Withdrawn" is supported for pathway enrollment updates');
    }

    const employeeEmail = jwtDecode(token).email;
    const manager = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });

    if (!manager) {
      throw new Error('Employee not found');
    }

    const enrollment = await prisma.pathways_employees.findUnique({
      where: { pathway_employeeID: parseInt(enrollmentId) },
      include: {
        pathways: {
          select: {
            pathwayID: true,
            pathwayManagerID: true,
            pathwayName: true
          }
        }
      }
    });

    if (!enrollment) {
      throw new Error('Pathway enrollment not found');
    }

    if (!enrollment.pathways || enrollment.pathways.pathwayManagerID !== manager.employeeID) {
      throw new Error('Unauthorized: You can only update enrollments on pathways you manage');
    }

    const pathwayId = enrollment.pathwayID;
    const employeeId = enrollment.employeeID;

    const [pathwayCourses, pathwayAssessments, pathwayTemplates] = await Promise.all([
      prisma.pathways_courses.findMany({
        where: { pathwayID: pathwayId },
        select: { courseID: true }
      }),
      prisma.pathways_assessments.findMany({
        where: { pathwayID: pathwayId },
        select: { assessmentID: true }
      }),
      prisma.pathways_experience_templates.findMany({
        where: { pathwayID: pathwayId },
        select: { experience_templateID: true }
      })
    ]);

    const courseIds = pathwayCourses.map((item) => item.courseID);
    const assessmentIds = pathwayAssessments.map((item) => item.assessmentID);
    const templateIds = pathwayTemplates.map((item) => item.experience_templateID);

    const result = await prisma.$transaction(async (tx) => {
      const pathwayEnrollmentDelete = await tx.pathways_employees.deleteMany({
        where: {
          pathway_employeeID: parseInt(enrollmentId),
          employeeID: employeeId,
          pathwayID: pathwayId
        }
      });

      const removedExperiences = templateIds.length
        ? await tx.employees_experiences.deleteMany({
            where: {
              employeeID: employeeId,
              experience_templateID: { in: templateIds },
              OR: [
                { refereeText: null },
                { refereeText: '' }
              ]
            }
          })
        : { count: 0 };

      const removedCourses = courseIds.length
        ? await tx.employees_courses.deleteMany({
            where: {
              employeeID: employeeId,
              courseID: { in: courseIds },
              // completionDate removed
              score: null
            }
          })
        : { count: 0 };

      const removedAssessments = assessmentIds.length
        ? await tx.employees_assessments.deleteMany({
            where: {
              employeeID: employeeId,
              assessmentID: { in: assessmentIds },
              // completionDate removed
              score: null
            }
          })
        : { count: 0 };

      return {
        pathwayId,
        pathwayName: enrollment.pathways.pathwayName,
        employeeId,
        removedPathwayEnrollments: pathwayEnrollmentDelete.count,
        removedIncompleteExperiences: removedExperiences.count,
        removedEnrolledCourses: removedCourses.count,
        removedEnrolledAssessments: removedAssessments.count
      };
    });

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// GET AVAILABLE COURSES FOR PATHWAY
async function getAvailableCourses(pathwayID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID);
    if (Number.isNaN(parsedPathwayID)) {
      throw new Error('Invalid pathway ID');
    }

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
      where: { pathwayID: parsedPathwayID },
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
    throw error;
    throw error;
  }
}

// GET AVAILABLE ASSESSMENTS FOR PATHWAY
async function getAvailableAssessments(pathwayID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID);
    if (Number.isNaN(parsedPathwayID)) {
      throw new Error('Invalid pathway ID');
    }

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
      where: { pathwayID: parsedPathwayID },
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
    throw error;
    throw error;
  }
}

// GET AVAILABLE EXPERIENCE TEMPLATES FOR PATHWAY
async function getAvailableExperienceTemplates(pathwayID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID);
    if (Number.isNaN(parsedPathwayID)) {
      throw new Error('Invalid pathway ID');
    }

    // Get experience templates already in this pathway
    const pathwayTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parsedPathwayID },
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
    throw error;
    throw error;
  }
}

// GET AVAILABLE PATHWAYS FOR COPYING CONTENTS
async function getAvailablePathways(currentPathwayID, token) {
  try {
    const parsedCurrentPathwayID = parseInt(currentPathwayID);
    if (Number.isNaN(parsedCurrentPathwayID)) {
      throw new Error('Invalid pathway ID');
    }

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
          not: parsedCurrentPathwayID
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
    throw error;
    throw error;
  }
}

// ADD COURSE TO PATHWAY
async function addCourseToPathway(pathwayID, courseID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID);
    const parsedCourseID = parseInt(courseID);

    if (Number.isNaN(parsedPathwayID) || Number.isNaN(parsedCourseID)) {
      throw new Error('Invalid pathway or course ID');
    }

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
        pathwayID: parsedPathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Check if course already exists in pathway
    const existingCoursePathway = await prisma.pathways_courses.findFirst({
      where: {
        pathwayID: parsedPathwayID,
        courseID: parsedCourseID
      }
    });

    if (existingCoursePathway) {
      throw new Error('Course is already part of this pathway');
    }

    // Check if students are already enrolled in this pathway for the course
    const existingCourseEnrollment = await prisma.employees_courses.findFirst({
      where: {
        courseID: parsedCourseID,
        employeeID: {
          in: await prisma.pathways_employees.findMany({
            where: { pathwayID: parsedPathwayID },
            select: { employeeID: true }
          }).then(enrollments => enrollments.map(e => e.employeeID))
        }
      }
    });

    if (!existingCourseEnrollment) {
      // Auto-enroll all pathway students in this course
      const pathwayStudents = await prisma.pathways_employees.findMany({
        where: { pathwayID: parsedPathwayID }
      });

      for (const student of pathwayStudents) {
        await prisma.employees_courses.create({
          data: {
            employeeID: student.employeeID,
            courseID: parsedCourseID,
            currentStatus: 'In Progress',
            recordDate: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    // Add course to pathway
    const result = await prisma.pathways_courses.create({
      data: {
        pathwayID: parsedPathwayID,
        courseID: parsedCourseID
      }
    });

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// REMOVE COURSE FROM PATHWAY
async function removeCourseFromPathway(pathwayID, courseID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID, 10);
    const parsedCourseID = parseInt(courseID, 10);

    if (Number.isNaN(parsedPathwayID) || Number.isNaN(parsedCourseID)) {
      throw new Error('Invalid pathway or course ID');
    }

    const employeeEmail = jwtDecode(token).email;
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const pathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: parsedPathwayID,
        pathwayManagerID: employee.employeeID
      },
      select: { pathwayID: true }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Remove the course from pathway
    const result = await prisma.pathways_courses.deleteMany({
      where: {
        pathwayID: parsedPathwayID,
        courseID: parsedCourseID
      }
    });

    if (result.count === 0) {
      throw new Error('Course-pathway relationship not found');
    }

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// ADD ASSESSMENT TO PATHWAY
async function addAssessmentToPathway(pathwayID, assessmentID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID);
    const parsedAssessmentID = parseInt(assessmentID);

    if (Number.isNaN(parsedPathwayID) || Number.isNaN(parsedAssessmentID)) {
      throw new Error('Invalid pathway or assessment ID');
    }

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
        pathwayID: parsedPathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Check if assessment already exists in pathway
    const existingAssessmentPathway = await prisma.pathways_assessments.findFirst({
      where: {
        pathwayID: parsedPathwayID,
        assessmentID: parsedAssessmentID
      }
    });

    if (existingAssessmentPathway) {
      throw new Error('Assessment is already part of this pathway');
    }

    // Check if students are already enrolled in this pathway for the assessment
    const existingAssessmentEnrollment = await prisma.employees_assessments.findFirst({
      where: {
        assessmentID: parsedAssessmentID,
        employeeID: {
          in: await prisma.pathways_employees.findMany({
            where: { pathwayID: parsedPathwayID },
            select: { employeeID: true }
          }).then(enrollments => enrollments.map(e => e.employeeID))
        }
      }
    });

    if (!existingAssessmentEnrollment) {
      // Auto-enroll all pathway students in this assessment
      const pathwayStudents = await prisma.pathways_employees.findMany({
        where: { pathwayID: parsedPathwayID }
      });

      for (const student of pathwayStudents) {
        await prisma.employees_assessments.create({
          data: {
            employeeID: student.employeeID,
            assessmentID: parsedAssessmentID,
            currentStatus: 'Enrolled',
            recordDate: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    // Add assessment to pathway
    const result = await prisma.pathways_assessments.create({
      data: {
        pathwayID: parsedPathwayID,
        assessmentID: parsedAssessmentID
      }
    });

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// REMOVE ASSESSMENT FROM PATHWAY
async function removeAssessmentFromPathway(pathwayID, assessmentID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID, 10);
    const parsedAssessmentID = parseInt(assessmentID, 10);

    if (Number.isNaN(parsedPathwayID) || Number.isNaN(parsedAssessmentID)) {
      throw new Error('Invalid pathway or assessment ID');
    }

    const employeeEmail = jwtDecode(token).email;
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const pathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: parsedPathwayID,
        pathwayManagerID: employee.employeeID
      },
      select: { pathwayID: true }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Remove the assessment from pathway
    const result = await prisma.pathways_assessments.deleteMany({
      where: {
        pathwayID: parsedPathwayID,
        assessmentID: parsedAssessmentID
      }
    });

    if (result.count === 0) {
      throw new Error('Assessment-pathway relationship not found');
    }

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// ADD EXPERIENCE TEMPLATE TO PATHWAY
async function addExperienceTemplateToPathway(pathwayID, templateID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID);
    const parsedTemplateID = parseInt(templateID);

    if (Number.isNaN(parsedPathwayID) || Number.isNaN(parsedTemplateID)) {
      throw new Error('Invalid pathway or experience template ID');
    }

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
        pathwayID: parsedPathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Check if template already exists in pathway
    const existingTemplatePathway = await prisma.pathways_experience_templates.findFirst({
      where: {
        pathwayID: parsedPathwayID,
        experience_templateID: parsedTemplateID
      }
    });

    if (existingTemplatePathway) {
      throw new Error('Experience template is already part of this pathway');
    }

    // Check if students are already enrolled in this pathway for the experience template
    const existingExperienceEnrollment = await prisma.employees_experiences.findFirst({
      where: {
        experience_templateID: parsedTemplateID,
        employeeID: {
          in: await prisma.pathways_employees.findMany({
            where: { pathwayID: parsedPathwayID },
            select: { employeeID: true }
          }).then(enrollments => enrollments.map(e => e.employeeID))
        }
      }
    });

    if (!existingExperienceEnrollment) {
      // Auto-enroll all pathway students in this experience template
      const pathwayStudents = await prisma.pathways_employees.findMany({
        where: { pathwayID: parsedPathwayID }
      });

      const experienceTemplate = await prisma.experience_templates.findUnique({
        where: { experience_templateID: parsedTemplateID }
      });

      for (const student of pathwayStudents) {
        await prisma.employees_experiences.create({
          data: {
            employeeID: student.employeeID,
            experience_templateID: parsedTemplateID,
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
        pathwayID: parsedPathwayID,
        experience_templateID: parsedTemplateID
      }
    });

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// REMOVE EXPERIENCE TEMPLATE FROM PATHWAY
async function removeExperienceTemplateFromPathway(pathwayID, templateID, token) {
  try {
    const parsedPathwayID = parseInt(pathwayID, 10);
    const parsedTemplateID = parseInt(templateID, 10);

    if (Number.isNaN(parsedPathwayID) || Number.isNaN(parsedTemplateID)) {
      throw new Error('Invalid pathway or experience template ID');
    }

    const employeeEmail = jwtDecode(token).email;
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail },
      select: { employeeID: true }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const pathway = await prisma.pathways.findFirst({
      where: {
        pathwayID: parsedPathwayID,
        pathwayManagerID: employee.employeeID
      },
      select: { pathwayID: true }
    });

    if (!pathway) {
      throw new Error('Pathway not found or you do not have permission to modify it');
    }

    // Remove the experience template from pathway
    const result = await prisma.pathways_experience_templates.deleteMany({
      where: {
        pathwayID: parsedPathwayID,
        experience_templateID: parsedTemplateID
      }
    });

    if (result.count === 0) {
      throw new Error('Experience template-pathway relationship not found');
    }

    return result;
  } catch (error) {
    throw error;
    throw error;
  }
}

// COPY PATHWAY CONTENTS
async function copyPathwayContents(targetPathwayID, sourcePathwayID, token) {
  try {
    const parsedTargetPathwayID = parseInt(targetPathwayID);
    const parsedSourcePathwayID = parseInt(sourcePathwayID);

    if (Number.isNaN(parsedTargetPathwayID) || Number.isNaN(parsedSourcePathwayID)) {
      throw new Error('Invalid pathway ID');
    }

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
        pathwayID: parsedTargetPathwayID,
        pathwayManagerID: employee.employeeID
      }
    });

    if (!targetPathway) {
      throw new Error('Target pathway not found or you do not have permission to modify it');
    }

    // Get source pathway contents
    const sourceCourses = await prisma.pathways_courses.findMany({
      where: { pathwayID: parsedSourcePathwayID },
      select: { courseID: true }
    });

    const sourceAssessments = await prisma.pathways_assessments.findMany({
      where: { pathwayID: parsedSourcePathwayID },
      select: { assessmentID: true }
    });

    const sourceTemplates = await prisma.pathways_experience_templates.findMany({
      where: { pathwayID: parsedSourcePathwayID },
      select: { experience_templateID: true }
    });

    let addedItems = 0;
    const copied = {
      courses: 0,
      assessments: 0,
      experienceTemplates: 0
    };

    // Copy courses
    for (const course of sourceCourses) {
      try {
        await addCourseToPathway(parsedTargetPathwayID, course.courseID, token);
        addedItems++;
        copied.courses++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('already part of')) {
          throw error;
        }
      }
    }

    // Copy assessments
    for (const assessment of sourceAssessments) {
      try {
        await addAssessmentToPathway(parsedTargetPathwayID, assessment.assessmentID, token);
        addedItems++;
        copied.assessments++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('already part of')) {
          throw error;
        }
      }
    }

    // Copy experience templates
    for (const template of sourceTemplates) {
      try {
        await addExperienceTemplateToPathway(parsedTargetPathwayID, template.experience_templateID, token);
        addedItems++;
        copied.experienceTemplates++;
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('already part of')) {
          throw error;
        }
      }
    }

    return { 
      message: `Successfully copied ${addedItems} items to pathway`,
      copiedItems: addedItems,
      copied,
      totalSourceItems: sourceCourses.length + sourceAssessments.length + sourceTemplates.length
    };
  } catch (error) {
    throw error;
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
    throw error;
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
    throw error;
    throw error;
  }
}

// CREATE EXPERIENCE TEMPLATE FOR PATHWAY
async function createExperienceTemplateForPathway(pathwayId, templateData, token) {
  try {
    const employeeEmail = jwtDecode(token).email;
    
    const employee = await prisma.employees.findFirst({
      where: { email: employeeEmail }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    // First create the experience template
    const newTemplate = await prisma.experience_templates.create({
      data: {
        experienceDescription: templateData.experienceDescription,
        minimumDuration: parseFloat(templateData.minimumDuration) || 0
      }
    });

    // Then add it to the pathway
    const pathwayTemplate = await prisma.pathways_experience_templates.create({
      data: {
        pathwayID: parseInt(pathwayId),
        experience_templateID: newTemplate.experience_templateID
      }
    });

    return {
      message: 'Experience template created and added to pathway successfully',
      template: newTemplate,
      pathwayAssociation: pathwayTemplate
    };
  } catch (error) {
    throw error;
    throw new Error('Failed to create experience template for pathway: ' + error.message);
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
    throw error;
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
    throw error;
    throw error;
  }
}

module.exports = {
  getPathwaysList,
  getManagedPathways,
  updatePathway,
  updatePathwayEnrollment,
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
  createExperienceTemplateForPathway,
  updateExperienceTemplate,
  deleteExperienceTemplate
};