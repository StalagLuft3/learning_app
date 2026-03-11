const router = require("express").Router();
const contents = require('../services/CourseCatalogue');
const { jwtDecode } = require('jwt-decode');

// Test endpoint
router.get("/test", (req, res) => {
  console.log("TEST ENDPOINT HIT");
  res.json({ message: "API is working", timestamp: new Date().toISOString() });
});

router.get("/", async (req,res)=>{
  try{
    const token = req.cookies["x-auth-token"]
    console.log("=== GET COURSE CATALOGUE REQUEST ===");
    console.log("GET /CourseCatalogue - Token present:", !!token);
    console.log("All cookies received:", req.cookies);
    
    if (token) {
      console.log("Authenticated request - getting personalized data");
      data = await contents.getMultiple(token)
      return res.json(data);
    } else {
      console.log("Unauthenticated request - getting public course list");
      // Get all courses without enrollment info
      data = await contents.getMultiple(null)
      return res.json(data);
    }
  } catch (err) {
    console.log("try failed")
    console.error(`Err.message reads: -  `, err.message);
    console.error(`Full error: `, err);
    return res.status(500).json({ error: err.message, data: [], isEnrolledOnCourseList: [], isEnrolledOnAssessmentList: [] });
  }
});

// POST / ENROL FOR COURSE
router.post("/enrolCourse", async function(req, res) {
  console.log("=== ENROLL COURSE REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const {enrolCourseID} = req.body
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  
  const enrolDate = new Date().toISOString().substring(0,10)
  try {                   
    console.log("Attempting to enroll in course:", enrolCourseID);
    const result = await contents.enrolCourse(enrolCourseID, token, enrolDate)
    console.log("Enrollment successful:", result);
    return res.status(200).json({ message: "Successfully enrolled in course", enrollment: result });
    } catch (err) {
      console.error("Error enrolling in course:", err);
      if (err.message === 'Already enrolled in this course') {
        return res.status(400).json({ error: "You are already enrolled in this course"});
      }
      return res.status(500).json({ error: "Error when trying to enrol on course. Try again later!"});
        }
});

// POST / ENROL FOR ASSESSMENT
router.post("/enrolAssessment", async function(req, res) {
  console.log("=== ENROLL ASSESSMENT REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const {enrolAssessmentID} = req.body;
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  
  const enrolDate = new Date().toISOString().substring(0,10)
  try {                   
    console.log("Attempting to enroll in assessment:", enrolAssessmentID);
    const result = await contents.enrolAssessment(enrolAssessmentID, token, enrolDate)
    console.log("Assessment enrollment successful:", result);
    return res.status(200).json({ message: "Successfully enrolled in assessment", enrollment: result });
    } catch (err) {
        console.error("Error enrolling in assessment:", err);
        if (err.message === 'Already enrolled in this assessment') {
          return res.status(400).json({ error: "You are already enrolled in this assessment"});
        }
        return res.status(500).json({ error: "Error when trying to enrol on assesment. Try again later!"});
        }
});

//POST / CREATE COURSE
router.post("/createCourse", async function (req, res) {
  console.log("=== CREATE COURSE REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const {courseName, courseDescription, courseLocation, courseMethod, duration} = req.body
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to create course...");
    const result = await contents.createCourse(courseName,courseDescription, courseLocation, courseMethod, duration, token)
    console.log("Course created successfully:", result);
    return res.status(200).json({ 
      message: "Course created successfully", 
      course: result 
    });
  } catch (err) {
    console.error("Create course error:", err);
    return res.status(500).json({ error: "Error when trying to create course. Try again later!" });
  }
});

//POST / CREATE ASSESSMENT
router.post("/createAssessment", async function (req, res) {
  console.log("=== CREATE ASSESSMENT REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const {courseName, assessmentDescription, assessmentLocation, assessmentMethod, duration, maxScore, passingScore, expiry} = req.body
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to create assessment...");
    const result = await contents.createAssessment(courseName, assessmentDescription, assessmentLocation, assessmentMethod, duration, maxScore, passingScore, expiry, token)
    console.log("Assessment created successfully:", result);
    return res.status(200).json({ 
      message: "Assessment created successfully", 
      assessment: result 
    });
  } catch (err) {
    console.error("Create assessment error:", err);
    return res.status(500).json({ error: "Error when trying to create assessment. Try again later!" });
  }
});

// GET COURSES ONLY
router.get("/courses", async (req, res) => {
  try {
    const token = req.cookies["x-auth-token"];
    console.log("=== GET COURSES ONLY REQUEST ===");
    console.log("GET /CourseCatalogue/courses - Token present:", !!token);
    
    const data = await contents.getCoursesOnly(token);
    return res.json(data);
  } catch (err) {
    console.error('Error fetching courses:', err.message);
    return res.status(500).json({ error: err.message, data: [], isEnrolledOnCourseList: [], isEnrolledOnAssessmentList: [] });
  }
});

// GET ASSESSMENTS ONLY
router.get("/assessments", async (req, res) => {
  try {
    const token = req.cookies["x-auth-token"];
    console.log("=== GET ASSESSMENTS ONLY REQUEST ===");
    console.log("GET /CourseCatalogue/assessments - Token present:", !!token);
    
    const data = await contents.getAssessmentsOnly(token);
    return res.json(data);
  } catch (err) {
    console.error('Error fetching assessments:', err.message);
    return res.status(500).json({ error: err.message, data: [], isEnrolledOnCourseList: [], isEnrolledOnAssessmentList: [] });
  }
});

// PUT /updateCourse - Update course details
router.put("/updateCourse", async function(req, res) {
  try {
    const { courseID, courseName, description, delivery_location, delivery_method, duration } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE COURSE REQUEST ===');
    console.log('Course ID:', courseID);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await contents.updateCourse(courseID, {
      courseName,
      description,
      delivery_location,
      delivery_method,
      duration
    }, token);
    
    res.json({ message: 'Course updated successfully', course: result });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /updateAssessment - Update assessment details  
router.put("/updateAssessment", async function(req, res) {
  try {
    const { assessmentID, name, description, delivery_location, delivery_method, duration, max_score, passing_score, expiry } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE ASSESSMENT REQUEST ===');
    console.log('Assessment ID:', assessmentID);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await contents.updateAssessment(assessmentID, {
      name,
      description,
      delivery_location,
      delivery_method,
      duration,
      max_score,
      passing_score,
      expiry
    }, token);
    
    res.json({ message: 'Assessment updated successfully', assessment: result });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /deleteCourse/:courseId - Delete course
router.delete("/deleteCourse/:courseId", async function(req, res) {
  try {
    const { courseId } = req.params;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== DELETE COURSE REQUEST ===');
    console.log('Course ID:', courseId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await contents.deleteCourse(courseId, token);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /deleteAssessment/:assessmentId - Delete assessment
router.delete("/deleteAssessment/:assessmentId", async function(req, res) {
  try {
    const { assessmentId } = req.params;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== DELETE ASSESSMENT REQUEST ===');
    console.log('Assessment ID:', assessmentId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await contents.deleteAssessment(assessmentId, token);
    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router
