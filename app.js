//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate')
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
  email: String,
  password: String,
  secret: { type: String, default:"Share your secret" },
  googleId: String,
  googleDisplayName: String,
  facebookId: String,
  facebookDisplayName: String
});

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email"
});
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
  console.log("serializing");
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  console.log("deserializing");
  User.findById(id, function(err, user) {
    console.log(user);
    cb(err, user);
  });
});

// OAuth2 with Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  // this is the "verify" function invoked by the (Google) strategy
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile); ESPLORARE OPZIONI !!!!
    User.findOrCreate(
      { googleId: profile.id },
      { googleDisplayName: profile.displayName },
      function(err, user) {
        return cb(err, user);
      }
    );
  }
));

// OAuth2 with Facebook

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate(
      { facebookId: profile.id },
      { facebookDisplayName: profile.displayName },
      function (err, user) {
        return cb(err, user);
      }
    );
  }
));

// ------------
// -- ROUTES --
// ------------

app.get("/", function(req, res) {
  console.log(req.session);
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login", function(req, res) {
  res.render("login");
});

// Passport (session) documentation:
// It is a good idea to use POST or DELETE requests instead of GET
// requests for the logout endpoints, in order to prevent accidental
// or malicious logouts.
app.post("/logout", function(req, res) {
  req.logout();
  console.log("Logout succeded");
  res.redirect("/");
});

app.get("/secrets", function(req, res) {
  User.find({"secret": {$ne: null}}, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if(foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers})
      }
    }
  })
});

app.get("/submit", function(req, res) {
  // in the following IF there is all the power of Passport
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }

});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect to secret area.
    res.redirect('/secrets');
  });

  app.get('/auth/facebook',
    passport.authenticate('facebook')
  );

  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
      failureRedirect: '/login'
    }),
    function(req, res) {
      // Successful authentication, redirect to secret area.
      res.redirect('/secrets');
    });


app.post("/login",

  // Authenticate the "req.BODY" user credential and automatically create an authenticated session
  passport.authenticate("local", {
    failureRedirect: "/login"
  }),

  function (req, res) {
    res.redirect("/secrets");
  }
);

app.post("/register", function(req, res) {
  User.register(
    { email: req.body.email }, req.body.password,
    function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        //passport.authenticate("local")(req, res, function() {
        req.login(user, function (err) {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/secrets")
          }
      })}
    })
});

app.post("/submit", function (req, res) {
  //update the user's secret
  if(req.isAuthenticated()) {
    User.findByIdAndUpdate(
      req.user.id,
      {secret: req.body.secret},
      function(err, user) {
        if(err) {
          console.log(err);
          res.redirect("/")
        } else {
          res.redirect("/secrets")
        }
    });
  } else {
    res.redirect("/login");
  }
})

app.listen(3000, function() {
  console.log("Secrets server started on port 3000");
});
