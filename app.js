//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const _ = require("lodash");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true
  },
  password: String
});
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});
const User = new mongoose.model("User", userSchema);


app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  User.findOne({
      email: _.toLower(req.body.username),
    },
    function(err, foundUser) {
      if (err) {
        res.render("error", {
          err: err
        });
      } else if (foundUser) {
        if (foundUser.password === req.body.password) {
          res.render("secrets")
        } else {
          res.render("error", {
            err: "wrong password"
          })
        }
      } else {
        res.render("error", {
          err: "Username (email) unknown"
        })
      }
    })
})

app.post("/register", function(req, res) {
  const newUser = new User({
    email: _.toLower(req.body.username),
    password: req.body.password
  });
  newUser.save(function(err) {
    if (err) {
      res.render("error", {
        err: err
      });
    } else {
      res.render("secrets");
    }
  })
})



app.listen(3000, function() {
  console.log("Secrets server started on port 3000");
});
