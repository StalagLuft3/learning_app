const express = require("express");
const { PrismaClient } = require('@prisma/client');
const auth = require("./routes/auth");
const CourseCatalogue = require("./routes/courseCatalogue");
const pathways = require("./routes/pathways");
const manageContents = require("./routes/manageContents");
const record = require("./routes/record");
const feedback = require("./routes/feedback");
// MySQL db.js removed - now using PostgreSQL via Prisma
const path = require("path");
const cors = require("cors");

// Load environment variables
require('dotenv').config();

// Initialize Prisma Client
const prisma = new PrismaClient();

const app = express()
const port = process.env.PORT || 5000;

const { json } = require("body-parser");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.set('view engine', 'jsx');
app.engine('jsx', require('express-react-views').createEngine());

app.use(cors({ credentials: true, origin: ["http://localhost:5173"] }));

app.use(express.json());

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(__dirname, "/node_modules")));

app.use(
  express.urlencoded({
    extended: true,
  })
);


app.get("/", (req, res) => {
    res.redirect("/Record");
});

//These strings are the url paths
app.use("/Auth", auth);
app.use("/CourseCatalogue", CourseCatalogue);
app.use("/ManageContents", manageContents);
app.use("/Pathways", pathways);
app.use("/Record", record);
app.use("/Feedback", feedback);

// Error handler middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });
  return;
});

//Listen
const server = app.listen(port, () => {
    console.log(`Jungle Book listening at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await prisma.$disconnect();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await prisma.$disconnect();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});