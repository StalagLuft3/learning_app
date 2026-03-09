const router = require("express").Router();
const pathways = require('../services/pathways');
const checkAuth = require('../middleware/checkAuth');
const { jwtDecode } = require('jwt-decode');


//GET / PATHWAYS
router.get('/', async function(req, res){
    try {
      const token = req.cookies["x-auth-token"];
      
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      data = await pathways.loadPathways(token);
      return res.json(data);
    } catch (err) {
      console.log("Error loading pathways:", err);
      console.error(`Err.message reads: -  `, err.message);
      return res.status(500).json({ error: err.message });
    }
  });
  

// POST / ENROL FOR PATHWAY
router.post("/enrolPathway", async function(req, res) {
  console.log("=== ENROLL PATHWAY REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);

  const {enrolPathwayID} = req.body;
  const token = req.cookies["x-auth-token"];
  
  console.log("Token present:", !!token);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ error: "Authentication required" });
  }

  const enrolDate = new Date().toISOString().substring(0,10);
  try {                   
    console.log("Attempting to enroll in pathway:", enrolPathwayID);
    const result = await pathways.enrolPathway(enrolPathwayID, token, enrolDate);
    console.log("Pathway enrollment successful:", result);
    return res.status(200).json({ message: "Successfully enrolled in pathway", enrollment: result });
  } catch (err) {
    console.error("Error enrolling in pathway:", err);
    return res.status(500).json({ error: "Error when trying to enroll in pathway. Try again later!" });
  }
});

//POST / CREATE PATHWAY
router.post("/createPathway", async function (req, res) {
  console.log("=== CREATE PATHWAY REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("All cookies received:", req.cookies);
  console.log("Headers:", req.headers);
  console.log("Content-Type:", req.headers['content-type']);
  
  const {pathwayName, pathwayDescription} = req.body;
  const token = req.cookies["x-auth-token"];
  
  console.log("Token present:", !!token);
  console.log("Token value (first 20 chars):", token ? token.substring(0, 20) + "..." : "null");
  
  if (!token) {
    console.log("No authentication token provided - returning 401");
    return res.status(401).json({ errors: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to create pathway:", pathwayName);
    const result = await pathways.createPathway(pathwayName, pathwayDescription, token);
    console.log("Pathway created successfully:", result);
    return res.status(200).json({ message: "Pathway created successfully", pathway: result });
  } catch (err) {
    console.error("Create pathway error:", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);
    if (err.message.includes('jwt') || err.message.includes('token') || err.message.includes('Invalid token')) {
      return res.status(401).json({ errors: "Invalid authentication token. Please log in again." });
    }
    return res.status(500).json({ errors: "Error when trying to create Pathway. Try again later!" });
  }
});

// PUT / UPDATE PATHWAY
router.put("/updatePathway", async function(req, res) {
  try {
    const { pathwayID, pathwayName, pathwayDescription } = req.body;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== UPDATE PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayID);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await pathways.updatePathway(pathwayID, {
      pathwayName,
      pathwayDescription
    }, token);
    
    res.json({ message: 'Pathway updated successfully', pathway: result });
  } catch (error) {
    console.error('Error updating pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE / DELETE PATHWAY
router.delete("/deletePathway/:pathwayId", async function(req, res) {
  try {
    const { pathwayId } = req.params;
    const token = req.cookies["x-auth-token"];
    
    console.log('=== DELETE PATHWAY REQUEST ===');
    console.log('Pathway ID:', pathwayId);
    console.log('Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await pathways.deletePathway(pathwayId, token);
    res.json({ message: 'Pathway deleted successfully' });
  } catch (error) {
    console.error('Error deleting pathway:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router


