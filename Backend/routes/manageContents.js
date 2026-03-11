const router = require("express").Router();
const managePathways = require('../services/managePathways');
const manageCourses = require('../services/manageCourses');
const manageAssessments = require('../services/manageAssessments');

// GET /courses/:managerId - Get courses managed by a specific user with enrollments
router.get('/courses/:managerId', async function(req, res) {
  try {
    const managerId = parseInt(req.params.managerId);
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET MANAGED COURSES REQUEST ===');
    console.log('Manager ID:', managerId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await manageCourses.getManagedCourses(managerId);
    console.log('Managed courses found:', data.courses.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching managed courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /updateCourseEnrollment - Update course enrollment status/score/date
router.put('/updateCourseEnrollment', async function(req, res) {
  try {
    const { enrollmentId, ...updateData } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE COURSE ENROLLMENT REQUEST ===');
    console.log('Enrollment ID:', enrollmentId);
    console.log('Update data:', updateData);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await manageCourses.updateCourseEnrollment(enrollmentId, updateData);
    console.log('Course enrollment updated successfully');
    
    res.json({ message: 'Course enrollment updated successfully', result });
  } catch (error) {
    console.error('Error updating course enrollment:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /updateCourse - Update course details
router.put('/updateCourse', async function(req, res) {
  try {
    const { courseID, courseName, description, duration, deliveryMethod, deliveryLocation } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE COURSE REQUEST ===');
    console.log('Course ID:', courseID);
    console.log('Update data:', { courseName, description, duration, deliveryMethod, deliveryLocation });
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await manageCourses.updateCourse(courseID, { courseName, description, duration, deliveryMethod, deliveryLocation });
    console.log('Course updated successfully');
    
    res.json({ message: 'Course updated successfully', result });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /assessments/:managerId - Get assessments managed by a specific user with enrollments
router.get('/assessments/:managerId', async function(req, res) {
  try {
    const managerId = parseInt(req.params.managerId);
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET MANAGED ASSESSMENTS REQUEST ===');
    console.log('Manager ID:', managerId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await manageAssessments.getManagedAssessments(managerId);
    console.log('Managed assessments found:', data.assessments.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching managed assessments:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /updateAssessment - Update assessment details
router.put('/updateAssessment', async function(req, res) {
  try {
    const { assessmentID, name, description, deliveryMethod, deliveryLocation, duration, maxScore, passingScore, expiry } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE ASSESSMENT REQUEST ===');
    console.log('Assessment ID:', assessmentID);
    console.log('Update data:', { name, description, deliveryMethod, deliveryLocation, duration, maxScore, passingScore, expiry });
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await manageAssessments.updateAssessment(assessmentID, { name, description, deliveryMethod, deliveryLocation, duration, maxScore, passingScore, expiry });
    console.log('Assessment updated successfully');
    
    res.json({ message: 'Assessment updated successfully', result });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /updateAssessmentEnrollment - Update assessment enrollment status/score/date
router.put('/updateAssessmentEnrollment', async function(req, res) {
  try {
    const { enrollmentId, ...updateData } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE ASSESSMENT ENROLLMENT REQUEST ===');
    console.log('Enrollment ID:', enrollmentId);
    console.log('Update data:', updateData);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await manageAssessments.updateAssessmentEnrollment(enrollmentId, updateData);
    console.log('Assessment enrollment updated successfully');
    
    res.json({ message: 'Assessment enrollment updated successfully', result });
  } catch (error) {
    console.error('Error updating assessment enrollment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET / 
router.get('/pathwaysList', async function(req, res, next) {
  try{
    const token = req.cookies["x-auth-token"];
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const pathwaysList = await managePathways.getPathwaysList(token);
    return res.status(200).json({ pathwaysList });
  } catch (err) { 
    console.error(`Error while loading pathway to edit!`, err.message);
    return res.status(500).json({ error: err.message });
  }
});


// GET /pathways/:managerId - Get managed pathways with enrollments
router.get('/pathways/:managerId', async function(req, res) {
  try {
    const managerId = parseInt(req.params.managerId);
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET MANAGED PATHWAYS REQUEST ===');
    console.log('Manager ID:', managerId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await managePathways.getManagedPathways(managerId);
    console.log('Managed pathways found:', data.pathways.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching managed pathways:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT / UPDATE PATHWAY
router.put("/updatePathway", async function(req, res) {
  try {
    const { pathwayID, pathwayName, pathwayDescription } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('Update pathway request received');
    console.log('Pathway ID:', pathwayID);
    console.log('Update data:', { pathwayName, pathwayDescription });
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const updateData = { pathwayName, pathwayDescription };
    const result = await managePathways.updatePathway(pathwayID, updateData);
    console.log('Pathway updated successfully');
    
    res.json({ message: 'Pathway updated successfully', result });
  } catch (error) {
    console.error('Error updating pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /bulkUpdateCourseEnrollments - Bulk update course enrollments
router.put('/bulkUpdateCourseEnrollments', async function(req, res) {
  try {
    const { enrollmentIds, newStatus, score } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== BULK UPDATE COURSE ENROLLMENTS REQUEST ===');
    console.log('Enrollment IDs:', enrollmentIds);
    console.log('New status:', newStatus);
    console.log('Score:', score);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return res.status(400).json({ error: "Valid enrollment IDs are required" });
    }

    if (!newStatus) {
      return res.status(400).json({ error: "New status is required" });
    }

    const results = [];
    for (const enrollmentId of enrollmentIds) {
      try {
        const updateData = { newStatus };
        if (score !== undefined) {
          updateData.score = score;
        }
        
        const result = await manageCourses.updateCourseEnrollment(enrollmentId, updateData);
        results.push({ enrollmentId, success: true, result });
      } catch (error) {
        console.error(`Failed to update enrollment ${enrollmentId}:`, error);
        results.push({ enrollmentId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Bulk update completed: ${successCount}/${enrollmentIds.length} successful`);
    
    res.json({ 
      message: `Bulk update completed: ${successCount}/${enrollmentIds.length} successful`,
      results 
    });
  } catch (error) {
    console.error('Error in bulk update course enrollments:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /bulkUpdateAssessmentEnrollments - Bulk update assessment enrollments
router.put('/bulkUpdateAssessmentEnrollments', async function(req, res) {
  try {
    const { enrollmentIds, newStatus, score } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== BULK UPDATE ASSESSMENT ENROLLMENTS REQUEST ===');
    console.log('Enrollment IDs:', enrollmentIds);
    console.log('New status:', newStatus);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return res.status(400).json({ error: "Valid enrollment IDs are required" });
    }

    if (!newStatus) {
      return res.status(400).json({ error: "New status is required" });
    }

    const results = [];
    for (const enrollmentId of enrollmentIds) {
      try {
        const updateData = { newStatus };
        if (score !== undefined) {
          updateData.score = score;
        }
        // Remove accreditationDate logic - using completionDate instead
        
        const result = await manageAssessments.updateAssessmentEnrollment(enrollmentId, updateData);
        results.push({ enrollmentId, success: true, result });
      } catch (error) {
        console.error(`Failed to update assessment enrollment ${enrollmentId}:`, error);
        results.push({ enrollmentId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Bulk assessment update completed: ${successCount}/${enrollmentIds.length} successful`);
    
    res.json({ 
      message: `Bulk update completed: ${successCount}/${enrollmentIds.length} successful`,
      results 
    });
  } catch (error) {
    console.error('Error in bulk update assessment enrollments:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEPRECATED ROUTE - updatePathwayEnrollment function doesn't exist in managePathways service
// TODO: Implement pathway enrollment management or remove if not needed  
// PUT /bulkUpdatePathwayEnrollments - Bulk update pathway enrollments
// router.put('/bulkUpdatePathwayEnrollments', async function(req, res) {
//   try {
//     const { enrollmentIds, newStatus } = req.body;
//     const token = req.cookies["x-auth-token"];
//     
//     console.log('=== BULK UPDATE PATHWAY ENROLLMENTS REQUEST ===');
//     console.log('Enrollment IDs:', enrollmentIds);
//     console.log('New status:', newStatus);
//     
//     if (!token) {
//       return res.status(401).json({ error: "Authentication required" });
//     }
//
//     if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
//       return res.status(400).json({ error: "Valid enrollment IDs are required" });
//     }
//
//     if (!newStatus) {
//       return res.status(400).json({ error: "New status is required" });
//     }
//
//     const results = [];
//     for (const enrollmentId of enrollmentIds) {
//       try {
//         const updateData = { newStatus };
//         const result = await managePathways.updatePathwayEnrollment(enrollmentId, updateData);
//         results.push({ enrollmentId, success: true, result });
//       } catch (error) {
//         console.error(`Failed to update pathway enrollment ${enrollmentId}:`, error);
//         results.push({ enrollmentId, success: false, error: error.message });
//       }
//     }
//     
//     const successCount = results.filter(r => r.success).length;
//     console.log(`Bulk pathway update completed: ${successCount}/${enrollmentIds.length} successful`);
//     
//     res.json({ 
//       message: `Bulk update completed: ${successCount}/${enrollmentIds.length} successful`,
//       results 
//     });
//   } catch (error) {
//     console.error('Error in bulk update pathway enrollments:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// ===== DEBUG/TEST ROUTES =====

// GET /debug/database-content - Check what data exists in the database
router.get('/debug/database-content', async function(req, res) {
  try {
    const token = req.cookies["x-auth-token"];
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Import Prisma client directly for this debug route
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Count all the main content types
      const coursesCount = await prisma.courses.count();
      const assessmentsCount = await prisma.assessments.count();
      const templatesCount = await prisma.experience_templates.count();
      const pathwaysCount = await prisma.pathways.count();
      
      // Get a few sample records
      const sampleCourses = await prisma.courses.findMany({ 
        take: 3,
        include: {
          manager: {
            select: { username: true, role: true }
          }
        }
      });
      
      const sampleAssessments = await prisma.assessments.findMany({ 
        take: 3,
        include: {
          manager: {
            select: { username: true, role: true }
          }
        }
      });
      
      const sampleTemplates = await prisma.experience_templates.findMany({ take: 3 });

      const debugInfo = {
        counts: {
          courses: coursesCount,
          assessments: assessmentsCount,
          experienceTemplates: templatesCount,
          pathways: pathwaysCount
        },
        samples: {
          courses: sampleCourses,
          assessments: sampleAssessments,
          experienceTemplates: sampleTemplates
        },
        timestamp: new Date().toISOString()
      };

      console.log('Database debug info:', JSON.stringify(debugInfo, null, 2));
      
      res.json(debugInfo);
      
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error checking database content:', error);
    res.status(500).json({ error: error.message, details: 'Check server logs for more information' });
  }
});

// GET /debug/simple-courses - Simple test to get all courses
router.get('/debug/simple-courses', async function(req, res) {
  try {
    const token = req.cookies["x-auth-token"];
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Import Prisma client directly for this debug route
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Simple query to get all courses
      const courses = await prisma.courses.findMany();
      
      console.log('Simple courses query result:', courses.length, 'courses found');
      
      res.json({
        count: courses.length,
        courses: courses,
        message: 'Direct database query for courses'
      });
      
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error in simple courses query:', error);
    res.status(500).json({ error: error.message, details: 'Check server logs for more information' });
  }
});

// ===== PATHWAY CONTENT MANAGEMENT ROUTES =====

// GET /pathways/:pathwayId/available-courses - Get courses available to add to a pathway
router.get('/pathways/:pathwayId/available-courses', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET AVAILABLE COURSES REQUEST ===');
    console.log('Pathway ID:', pathwayId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await managePathways.getAvailableCourses(pathwayId, token);
    console.log('Available courses found:', data.courses.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching available courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /pathways/:pathwayId/available-assessments - Get assessments available to add to a pathway
router.get('/pathways/:pathwayId/available-assessments', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET AVAILABLE ASSESSMENTS REQUEST ===');
    console.log('Pathway ID:', pathwayId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await managePathways.getAvailableAssessments(pathwayId, token);
    console.log('Available assessments found:', data.assessments.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching available assessments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /pathways/:pathwayId/available-experience-templates - Get experience templates available to add to a pathway
router.get('/pathways/:pathwayId/available-experience-templates', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET AVAILABLE EXPERIENCE TEMPLATES REQUEST ===');
    console.log('Pathway ID:', pathwayId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await managePathways.getAvailableExperienceTemplates(pathwayId, token);
    console.log('Available experience templates found:', data.experienceTemplates.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching available experience templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /pathways/:pathwayId/available-pathways - Get other pathways available for copying content
router.get('/pathways/:pathwayId/available-pathways', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET AVAILABLE PATHWAYS REQUEST ===');
    console.log('Current Pathway ID:', pathwayId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await managePathways.getAvailablePathways(pathwayId, token);
    console.log('Available pathways found:', data.pathways.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching available pathways:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /pathways/:pathwayId/add-course - Add course to pathway
router.post('/pathways/:pathwayId/add-course', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const { courseId } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== ADD COURSE TO PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId, 'Course ID:', courseId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const result = await managePathways.addCourseToPathway(pathwayId, courseId, token);
    console.log('Course added to pathway successfully');
    
    res.json({ 
      message: 'Course added to pathway successfully. Enrolled participants have been automatically enrolled in the course.',
      result 
    });
  } catch (error) {
    console.error('Error adding course to pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /pathways/:pathwayId/remove-course/:courseId - Remove course from pathway
router.delete('/pathways/:pathwayId/remove-course/:courseId', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const courseId = req.params.courseId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== REMOVE COURSE FROM PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId, 'Course ID:', courseId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await managePathways.removeCourseFromPathway(pathwayId, courseId, token);
    console.log('Course removed from pathway successfully');
    
    res.json({ 
      message: 'Course removed from pathway successfully.',
      result 
    });
  } catch (error) {
    console.error('Error removing course from pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /pathways/:pathwayId/add-assessment - Add assessment to pathway
router.post('/pathways/:pathwayId/add-assessment', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const { assessmentId } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== ADD ASSESSMENT TO PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId, 'Assessment ID:', assessmentId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!assessmentId) {
      return res.status(400).json({ error: "Assessment ID is required" });
    }

    const result = await managePathways.addAssessmentToPathway(pathwayId, assessmentId, token);
    console.log('Assessment added to pathway successfully');
    
    res.json({ 
      message: 'Assessment added to pathway successfully. Enrolled participants have been automatically enrolled in the assessment.',
      result 
    });
  } catch (error) {
    console.error('Error adding assessment to pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /pathways/:pathwayId/remove-assessment/:assessmentId - Remove assessment from pathway
router.delete('/pathways/:pathwayId/remove-assessment/:assessmentId', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const assessmentId = req.params.assessmentId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== REMOVE ASSESSMENT FROM PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId, 'Assessment ID:', assessmentId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await managePathways.removeAssessmentFromPathway(pathwayId, assessmentId, token);
    console.log('Assessment removed from pathway successfully');
    
    res.json({ 
      message: 'Assessment removed from pathway successfully.',
      result 
    });
  } catch (error) {
    console.error('Error removing assessment from pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /pathways/:pathwayId/add-experience-template - Add experience template to pathway
router.post('/pathways/:pathwayId/add-experience-template', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const { templateId } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== ADD EXPERIENCE TEMPLATE TO PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId, 'Template ID:', templateId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!templateId) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    const result = await managePathways.addExperienceTemplateToPathway(pathwayId, templateId, token);
    console.log('Experience template added to pathway successfully');
    
    res.json({ 
      message: 'Experience template added to pathway successfully. Enrolled participants have been automatically enrolled in the experience.',
      result 
    });
  } catch (error) {
    console.error('Error adding experience template to pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /pathways/:pathwayId/create-experience - Create experience template for pathway
router.post('/pathways/:pathwayId/create-experience', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const { experienceDescription, minimumDuration } = req.body;
    const token = req.cookies["x-auth-token"];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!experienceDescription || experienceDescription.trim() === '') {
      return res.status(400).json({ error: 'Experience description is required' });
    }

    const templateData = {
      experienceDescription: experienceDescription.trim(),
      minimumDuration: minimumDuration || 0
    };

    const result = await managePathways.createExperienceTemplateForPathway(pathwayId, templateData, token);
    res.json(result);
    
  } catch (error) {
    console.error('Error creating experience template for pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /pathways/:pathwayId/remove-experience-template/:templateId - Remove experience template from pathway
router.delete('/pathways/:pathwayId/remove-experience-template/:templateId', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const templateId = req.params.templateId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== REMOVE EXPERIENCE TEMPLATE FROM PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId, 'Template ID:', templateId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await managePathways.removeExperienceTemplateFromPathway(pathwayId, templateId, token);
    console.log('Experience template removed from pathway successfully');
    
    res.json({ 
      message: 'Experience template removed from pathway successfully.',
      result 
    });
  } catch (error) {
    console.error('Error removing experience template from pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /pathways/:pathwayId/copy-from/:sourcePathwayId - Copy content from another pathway
router.post('/pathways/:pathwayId/copy-from/:sourcePathwayId', async function(req, res) {
  try {
    const pathwayId = req.params.pathwayId;
    const sourcePathwayId = req.params.sourcePathwayId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== COPY PATHWAY CONTENTS REQUEST ===');
    console.log('Target Pathway ID:', pathwayId, 'Source Pathway ID:', sourcePathwayId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await managePathways.copyPathwayContents(pathwayId, sourcePathwayId, token);
    console.log('Pathway contents copied successfully:', result);
    
    res.json({ 
      message: `Pathway contents copied successfully. ${result.copied.courses} courses, ${result.copied.assessments} assessments, and ${result.copied.experienceTemplates} experience templates were added.`,
      result 
    });
  } catch (error) {
    console.error('Error copying pathway contents:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== EXPERIENCE TEMPLATE MANAGEMENT ROUTES =====

// GET /experience-templates - Get all experience templates for global management
router.get('/experience-templates', async function(req, res) {
  try {
    const token = req.cookies["x-auth-token"];
    
    console.log('=== GET ALL EXPERIENCE TEMPLATES REQUEST ===');
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await managePathways.getAllExperienceTemplates(token);
    console.log('Experience templates found:', data.experienceTemplates.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching experience templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /experience-templates - Create new experience template
router.post('/experience-templates', async function(req, res) {
  try {
    const { experienceDescription, minimumDuration } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== CREATE EXPERIENCE TEMPLATE REQUEST ===');
    console.log('Template data:', { experienceDescription, minimumDuration });
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!experienceDescription) {
      return res.status(400).json({ error: "Experience description is required" });
    }

    const templateData = { experienceDescription, minimumDuration };
    const result = await managePathways.createExperienceTemplate(templateData, token);
    console.log('Experience template created successfully');
    
    res.status(201).json({ 
      message: 'Experience template created successfully!',
      experienceTemplate: result 
    });
  } catch (error) {
    console.error('Error creating experience template:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /experience-templates/:templateId - Update experience template
router.put('/experience-templates/:templateId', async function(req, res) {
  try {
    const templateId = req.params.templateId;
    const { experienceDescription, minimumDuration } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE EXPERIENCE TEMPLATE REQUEST ===');
    console.log('Template ID:', templateId);
    console.log('Update data:', { experienceDescription, minimumDuration });
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const updateData = { experienceDescription, minimumDuration };
    const result = await managePathways.updateExperienceTemplate(templateId, updateData, token);
    console.log('Experience template updated successfully');
    
    res.json({ 
      message: 'Experience template updated successfully!',
      experienceTemplate: result 
    });
  } catch (error) {
    console.error('Error updating experience template:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /experience-templates/:templateId - Delete experience template
router.delete('/experience-templates/:templateId', async function(req, res) {
  try {
    const templateId = req.params.templateId;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== DELETE EXPERIENCE TEMPLATE REQUEST ===');
    console.log('Template ID:', templateId);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await managePathways.deleteExperienceTemplate(templateId, token);
    console.log('Experience template deleted successfully');
    
    res.json({ 
      message: 'Experience template deleted successfully!',
      result 
    });
  } catch (error) {
    console.error('Error deleting experience template:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router

