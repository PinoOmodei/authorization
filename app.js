//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const _ = require("lodash");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema = new mongoose.Schema({
  // email: {
  //   type: String,
  //   unique: true
  // },
  // password: String
});

userSchema.plugin(passportLocalMongoose, {usernameField: "email"});

const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }

});

app.post("/login", function(req, res) {
  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      res.redirect("/login")
    } else {
      passport.authenticate("local", {failureRedirect: "/login"})(req, res, function () {
        res.redirect("/secrets");
      })
    }
  })
});

app.post("/register", function(req, res) {
  User.register({email: req.body.email}, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      })
    }
  })
});

app.listen(3000, function() {
  console.log("Secrets server started on port 3000");
});
