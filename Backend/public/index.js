const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// SSO Routes
app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

app.get("/auth/google/callback", passport.authenticate("google", {
    failureRedirect: "/"
}), (req, res) => {
    res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
    req.logout(() => {});
    res.redirect("/");
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
