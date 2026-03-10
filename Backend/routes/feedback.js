const router = require("express").Router();
const feedback = require('../services/feedback');
const { jwtDecode } = require('jwt-decode');


//GET / PATHWAYS
router.get('/', async function (req, res) {
  try {
    const token = req.cookies["x-auth-token"]
    data = await feedback.loadFeedbackRequests(token);
    return res.json(data);
  } catch (err) {
    console.log("try failed")
    console.error(`Err.message reads: -  `, err.message);
  }
});

//POST 
router.post("/recordRefereeFeedback", async function (req, res) {
  console.log("=== RECORD REFEREE FEEDBACK REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const { recordRefereeFeedback, employeeIndex, employeeExperienceIndex } = req.body
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  console.log("Feedback data:", recordRefereeFeedback, employeeIndex, employeeExperienceIndex);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ errors: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to record referee feedback");
    const result = await feedback.passFeedback(recordRefereeFeedback, employeeIndex, employeeExperienceIndex)
    console.log("Referee feedback recorded successfully:", result);
    return res.status(200).json({ message: "Referee feedback recorded successfully", feedback: result });
  } catch (err) {
    console.error("Record feedback error:", err);
    return res.status(500).json({ errors: "Error when trying to submit feedback. Try again later!" });
  }
});

// NEW ENDPOINTS FOR REFEREE STATUS MANAGEMENT

// GET /feedback/referee-items/:refereeId - Get items requiring referee attention
router.get('/referee-items/:refereeId', async function (req, res) {
  try {
    const managerId = parseInt(req.params.refereeId);
    const token = req.cookies["x-auth-token"];
    
    console.log('=== REFEREE ITEMS REQUEST ===');
    console.log('Manager ID:', managerId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await feedback.getRefereeItems(managerId);
    console.log('Referee items found:', {
      experiences: data.experiences.length,
      courseEnrollments: data.courseEnrollments.length,
      assessments: data.assessments.length
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching referee items:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /feedback/update-item-status - Update status of course/assessment/experience
router.put('/update-item-status', async function (req, res) {
  try {
    const { itemType, itemId, ...updateData } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE ITEM STATUS REQUEST ===');
    console.log('Item type:', itemType, 'ID:', itemId);
    console.log('Update data:', updateData);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const result = await feedback.updateItemStatus(itemType, itemId, updateData);
    console.log('Item status updated successfully');
    
    res.json({ message: 'Item status updated successfully', result });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router


