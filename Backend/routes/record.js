const router = require("express").Router();
const record = require('../services/record');
const checkAuth = require('../middleware/checkAuth');
const { jwtDecode } = require('jwt-decode');


//GET / PATHWAYS
router.get('/', async function (req, res) {
  try {
    const token = req.cookies["x-auth-token"]
    fullRecord = await record.loadRecord(token);
    return res.json(fullRecord);
  } catch (err) {
    console.log("try failed")
    console.error(`Err.message reads: -  `, err.message);
  }
});

//GET / ENROLLED PATHWAYS LIST
router.get('/enrolledPathways', async function (req, res) {
  const token = req.cookies["x-auth-token"]
  try {
    enrolledPathways = await record.enrolledPathwaysList(token);
    console.log(enrolledPathways)
    return res.json(enrolledPathways);
  } catch (err) {
    console.log("try failed -  enrolled pathways")
    console.error(`Err.message reads: -  `, err.message);
  }
});

//GET / REFEREES
router.get('/referees', async function (req, res) {
  try {
    refereesArray = await record.referees();
    return res.json(refereesArray);
  } catch (err) {
    console.log("try failed")
    console.error(`Err.message reads: -  `, err.message);
  }
});


//GET / MY PATHWAY DETAILS
router.get('/myPathwayDetails', async function (req, res) {
  const token = req.cookies["x-auth-token"]
  try {
    myPathwayDetails = await record.myPathwayDetails(token);
    return res.json(myPathwayDetails);
  } catch (err) {
    console.log("try failed")
    console.error(`Err.message reads: -  `, err.message);
  }
});

//POST 
router.post("/requestReferee", async function (req, res) {
  console.log("=== REQUEST REFEREE REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const { refereeRequest } = req.body
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  console.log("Referee request data:", refereeRequest);
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ errors: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to request referee");
    const result = await record.requestReferee(refereeRequest, token)
    console.log("Referee request successful:", result);
    return res.status(200).json({ message: "Referee request submitted successfully", request: result });
  } catch (err) {
    console.error("Request referee error:", err);
    return res.status(500).json({ errors: "Error when trying to request referee. Try again later!" });
  }
});

router.post("/recordExperience", async function (req, res) {
  console.log("=== RECORD EXPERIENCE REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const newDate = new Date();
  let mm = newDate.getMonth()+1
  if (mm < 10) {
    mm = '0' + mm
  }
  let dd = newDate.getDate()
  if (dd < 10) {
  dd = '0' + dd
  }
  let today = newDate.getFullYear() + "-" + mm + "-" + dd

  const { experienceDate, experienceDuration, experienceDescription, experienceYourFeedback, experienceReferee } = req.body
  const token = req.cookies["x-auth-token"]
  
  console.log("Token present:", !!token);
  console.log("Experience data:", { experienceDate, experienceDuration, experienceDescription });
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ errors: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to record experience");
    const result = await record.recordExperience(experienceDate, experienceDuration, experienceDescription, experienceYourFeedback, experienceReferee, today, token)
    console.log("Experience recorded successfully:", result);
    return res.status(200).json({ message: "Experience recorded successfully", experience: result });
  } catch (err) {
    console.error("Record experience error:", err);
    return res.status(500).json({ errors: "Error when trying to record experience. Try again later!" });
  }
});

router.post("/recordOwnFeedback", async function (req, res) {
  console.log("=== RECORD OWN FEEDBACK REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("Cookies:", req.cookies);
  
  const token = req.cookies["x-auth-token"]
  const {recordOwnFeedback, experienceID } = req.body
  
  console.log("Token present:", !!token);
  console.log("Own feedback data:", { recordOwnFeedback, experienceID });
  
  if (!token) {
    console.log("No authentication token provided");
    return res.status(401).json({ errors: "Authentication required. Please log in." });
  }
  
  try {
    console.log("Attempting to record own feedback");
    const result = await record.recordOwnFeedback(recordOwnFeedback, experienceID, token)
    console.log("Own feedback recorded successfully:", result);
    return res.status(200).json({ message: "Own feedback recorded successfully", feedback: result });
  } catch (err) {
    console.error("Record own feedback error:", err);
    return res.status(500).json({ errors: "Error when trying to record feedback. Try again later!" });
  }
});

module.exports = router


