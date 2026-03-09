const JWT = require('jsonwebtoken');
const dotenv = require('dotenv').config()

const { jwtDecode } = require('jwt-decode');
const cookieParser = require("cookie-parser");

module.exports = async (req, res, next) =>{
    const token = req.cookies["x-auth-token"]
    if(typeof token === "undefined"){
        return res.json({errors: "checkAuth middleware - NO TOKEN error"})
    }
    try{
        let user = await JWT.verify(token, dotenv.parsed.SESSION_SECRET);
        req.user = user.email;
        next()
    }catch(error){
        return res.json({errors: "checkAuth middleware - INVALID TOKEN error"});
    }
}

//not returning out of this middleware properly