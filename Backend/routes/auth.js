const express = require('express');
const router = require("express").Router();
const { check, validationResult, cookie } = require("express-validator");
const auth = require("../services/auth");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const dotenv = require('dotenv').config()
const cookieParser = require("cookie-parser");

// REGISTER ///////////////////////////////////////////////////////////////////
router.get("/register", (req, res) => {
    res.json("Register Up");
});

router.post("/register",[
    check("email","Please ensure valid email is provided").isEmail(),
    check("password", "Please choose a password length 12 characters or more").isLength({min:12})
    ],
    async (req,res) => {
        const {email, password, fullName, role} = req.body;
        const errors = validationResult(req);
        console.log('Registration request body:', req.body);
        
        if(!errors.isEmpty()){
            console.log('Validation errors:', errors.array());
            return res.status(400).json({section: "Failed Checks", error: errors});
        }
        
        try {
            const existingUser = await auth.search(email);
            if(existingUser.result.length >= 1 && existingUser.result[0].email === email){
                console.log('Email already exists:', email);
                return res.status(400).json({ error: "Email already registered"});
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const token = await JWT.sign(
                {
                    email
                },
                dotenv.parsed.SESSION_SECRET,
                {
                    expiresIn: 86400 //24 hours 
                }
            );
            
            console.log('Creating new user:', { email, fullName, role });
            await auth.register(email, hashedPassword, fullName, role);
            
            console.log('User created successfully');
            return res.status(200).json({ 
                message: "Registration successful",
                email: email 
            });
            
        } catch (err) {
            console.error('Registration error:', err);
            return res.status(500).json({
                section: "Final section Catch Error", 
                error: err.message || err
            });
        }
});
// ///////////////////////////////////////////////////////////////////// REGISTER //


// LOGIN ///////////////////////////////////////////////////////////////////
router.get("/login", (req, res) => {
    res.json("Login Up");
});

router.post("/login", async (req, res) => {
    const {email, password} = req.body;
    console.log('Login attempt for:', email); // Debug log
    
    try {
        const user = await auth.search(email);
        if(user.result.length !== 1 || user.result[0].email !== email) {
            console.log('User not found:', email); // Debug log
            return res.status(400).json({section: "Login Email not found error"});
        }
        
        let isMatch = await bcrypt.compare(password, user.result[0].password);
        if(!isMatch){
            console.log('Password mismatch for:', email); // Debug log
            return res.status(400).json({section: "Incorrect Password"});     
        }
        
        // Login successful - generate token
        const token = await JWT.sign(
            {
                email
            },
            dotenv.parsed.SESSION_SECRET,
            {
                expiresIn: 86400 //24 hours 
            }
        );
        
        console.log('Login successful for:', email, '- Setting cookie'); // Debug log
        
        // Set the authentication cookie
        res.cookie("x-auth-token", token, { 
            httpOnly: true, 
            secure: false, 
            sameSite: "lax", 
            path: "/",
            // Remove domain specification to work with different localhost ports
            maxAge: 86400000  // 24 hours in milliseconds
        });
        
        // Return JSON success response instead of redirect
        return res.status(200).json({ 
            message: "Login successful", 
            email: email,
            redirectTo: "/Home"
        });
        
    } catch (err) {
        console.error('Login error:', err); // Debug log
        return res.status(500).json({
            section: "Caught Failure from failed try on login", 
            error: err.message || err
        });
    }
});
///////////////////////////////////////////////////////////////////// LOGIN //

// VERIFY TOKEN ///////////////////////////////////////////////////////////
router.get("/verify", (req, res) => {
    try {
        const token = req.cookies['x-auth-token'];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify the token
        const decoded = JWT.verify(token, dotenv.parsed.SESSION_SECRET);
        
        // Token is valid
        return res.status(200).json({ 
            message: 'Token valid', 
            email: decoded.email 
        });
        
    } catch (error) {
        // Token is invalid or expired
        return res.status(401).json({ 
            message: 'Invalid or expired token',
            error: error.message 
        });
    }
});
// GET CURRENT USER DETAILS ///////////////////////////////////////////
router.get("/user", async (req, res) => {
    try {
        const token = req.cookies['x-auth-token'];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify and decode the token
        const decoded = JWT.verify(token, dotenv.parsed.SESSION_SECRET);
        
        // Get user details from database
        const userResult = await auth.search(decoded.email);
        
        if (userResult.result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = userResult.result[0];
        return res.status(200).json({ 
            employeeID: user.employeeID,
            email: user.email,
            username: user.username,
            role: user.role
        });
        
    } catch (error) {
        console.error('Error in /user endpoint:', error);
        // Token is invalid or expired
        return res.status(401).json({ 
            message: 'Invalid or expired token',
            error: error.message 
        });
    }
});
/////////////////////////////////////////////// GET CURRENT USER DETAILS //

// LOGOUT /////////////////////////////////////////////////////////////////
router.post("/logout", (req, res) => {
    try {
        // Clear the authentication cookie
        res.clearCookie("x-auth-token", { 
            httpOnly: true, 
            secure: false, 
            sameSite: "lax", 
            path: "/" 
        });
        
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ 
            message: 'Error during logout',
            error: error.message 
        });
    }
});
///////////////////////////////////////////////////////////////////// LOGOUT //

module.exports = router
