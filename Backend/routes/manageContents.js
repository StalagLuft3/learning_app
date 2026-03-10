const router = require("express").Router();
const manageContents = require('../services/manageContents');

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

    const data = await manageContents.getManagedCourses(managerId);
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

    const result = await manageContents.updateCourseEnrollment(enrollmentId, updateData);
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

    const result = await manageContents.updateCourse(courseID, { courseName, description, duration, deliveryMethod, deliveryLocation });
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

    const data = await manageContents.getManagedAssessments(managerId);
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

    const result = await manageContents.updateAssessment(assessmentID, { name, description, deliveryMethod, deliveryLocation, duration, maxScore, passingScore, expiry });
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

    const result = await manageContents.updateAssessmentEnrollment(enrollmentId, updateData);
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
    
    const pathwaysList = await manageContents.getPathwaysList(token);
    return res.status(200).json({ pathwaysList });
  } catch (err) { 
    console.error(`Error while loading pathway to edit!`, err.message);
    return res.status(500).json({ error: err.message });
  }
});


// GET /
router.get('/', async function(req, res, next) {
  try{
    const token = req.cookies["x-auth-token"];
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const x = await manageContents.getContents(token);
    console.log(x)
    return res.status(200).json(x);
    // res.render("managePathways", {  x : x.data, 
    //                                 u: x.user, 
    //                                 p: x.pathway})/// this jsut needs simplifying into separate fetches and calling easier to make Management work better. Then Done! Over to PRISMA!
  } catch (err) {
    console.error(`Error while loading pathway to edit!`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST / ADD COURSE
router.post("/addCourse", async function(req, res) {
  const addCourse = req.body.addC;
  const token = req.cookies["x-auth-token"]
  try {                   
    await manageContents.addCourse(addCourse, token)
    res.redirect("/managePathways")
    } catch (err) {
        return res.render("errors", {errors : err});
        }
});

// POST / ADD ASSESSMENT
router.post("/addAssessment", async function(req, res) {
  const addAssessment = req.body.addA;
  const token = req.cookies["x-auth-token"]
  try {                   
    await manageContents.addAssessment(addAssessment, token)
    res.redirect("/manageePathways")
    } catch (err) {
        return res.render("errors", {errors : err});
        }
});

// POST / ADD EXPERIENCE TEMPLATE
router.post("/addExperienceTemplate", async function(req, res) {
  const {addET, pID} = req.body;
  const token = req.cookies["x-auth-token"]
  try {                   
    await manageContents.addExperienceTemplate(pID, addET, token)
    res.redirect("/pathways")
    } catch (err) {
        return res.render("errors", {errors : err});
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

    const data = await manageContents.getManagedPathways(managerId);
    console.log('Managed pathways found:', data.pathways.length);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching managed pathways:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /updatePathwayEnrollment - Update pathway enrollment status
router.put('/updatePathwayEnrollment', async function(req, res) {
  try {
    const { enrollmentId, ...updateData } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE PATHWAY ENROLLMENT REQUEST ===');
    console.log('Enrollment ID:', enrollmentId);
    console.log('Update data:', updateData);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await manageContents.updatePathwayEnrollment(enrollmentId, updateData);
    console.log('Pathway enrollment updated successfully');
    
    res.json({ message: 'Pathway enrollment updated successfully', result });
  } catch (error) {
    console.error('Error updating pathway enrollment:', error);
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
    const result = await manageContents.updatePathway(pathwayID, updateData);
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
        
        const result = await manageContents.updateCourseEnrollment(enrollmentId, updateData);
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
        
        const result = await manageContents.updateAssessmentEnrollment(enrollmentId, updateData);
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

// PUT /bulkUpdatePathwayEnrollments - Bulk update pathway enrollments
router.put('/bulkUpdatePathwayEnrollments', async function(req, res) {
  try {
    const { enrollmentIds, newStatus } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== BULK UPDATE PATHWAY ENROLLMENTS REQUEST ===');
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
        const result = await manageContents.updatePathwayEnrollment(enrollmentId, updateData);
        results.push({ enrollmentId, success: true, result });
      } catch (error) {
        console.error(`Failed to update pathway enrollment ${enrollmentId}:`, error);
        results.push({ enrollmentId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Bulk pathway update completed: ${successCount}/${enrollmentIds.length} successful`);
    
    res.json({ 
      message: `Bulk update completed: ${successCount}/${enrollmentIds.length} successful`,
      results 
    });
  } catch (error) {
    console.error('Error in bulk update pathway enrollments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router