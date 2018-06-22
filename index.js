const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const app = express();
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/airbnb"); //après le localhost = nom de ta BDD

// Défition du Schéma - À faire qu'une seule fois
const RoomSchema = new mongoose.Schema({
  title: String,
  description: String,
  photos: [String],
  price: Number,
  ratingValue: {
    type: Number,
    default: null
  },
  reviews: {
    type: Number,
    default: 0
  },
  city: String,
  loc: {
    type: [Number], // Longitude et latitude
    index: "2dsphere" // Créer un index geospatial https://docs.mongodb.com/manual/core/2dsphere/
  }
});

const UserSchema = new mongoose.Schema({
  account: {
    username: String,
    biography: String
  },
  email: String,
  token: String, //clé qui va être générée aléatoirement, permet d'authentifier l'utilisateur
  hash: String, //mot de passe hashé
  salt: String //sécurité supplémenaire ajouté au mdp
});

//Définition du Model - À faire qu'une seule fois
const Room = mongoose.model("Room", RoomSchema);
const User = mongoose.model("User", UserSchema);

//ajout d'une annonce
app.post("/api/room/publish", function(req, res) {
  let newRoom = new Room(req.body);
  newRoom.save();
  Room.find().exec(function(err, obj) {
    if (!err) {
      res.json(obj);
    }
  });
});

//Obtenir les informations d'un appartement. findOne permet de renvoyer l'objet directement seul, sans un tableau autour
app.get("/api/room/:id", function(req, res) {
  Room.findOne({ _id: req.params.id }).exec(function(err, obj) {
    if (!err) {
      res.json(obj);
    }
  });
});

//Rechercher un appartement par ville

app.get("/api/rooms", function(req, res) {
  Room.find({ city: req.query.city }).exec(function(err, obj) {
    if (!err) {
      res.json({
        rooms: obj,
        count: obj.length
      });
    }
  });
});

//Trier par prix minimum et maximum
app.get("/api/rooms/tri", function(req, res) {
  Room.find({
    price: { $gte: req.query.priceMin, $lte: req.query.priceMax }
  }).exec(function(err, obj) {
    if (!err) {
      res.json({
        rooms: obj,
        count: obj.length
      });
    }
  });
});

app.listen(3000, function() {
  console.log("Server started");
});

//Pagination avec skip, et limit --> BONUS

// app.get("/api/rooms/pagination", function(req, res) {
//   Room.find({ skip: req.query.skip }, { limit: req.query.limit }).exec(function(
//     err,
//     obj
//   ) {
//     if (!err) {
//       res.json({
//         rooms: obj,
//         count: obj.length
//       });
//     }
//   });
// });

// Partie User

//ajout d'un utilisateur
app.post("/api/user/sign_up", function(req, res) {
  //création du salt
  const salt = uid2(64);
  //création du hash
  const hash = SHA256(req.body.password + salt).toString(encBase64);
  //création du token
  const token = uid2(16);

  let newUser = new User({
    account: {
      username: req.body.username,
      biography: req.body.biography
    },
    email: req.body.email,
    token: token, //clé qui va être générée aléatoirement, permet d'authentifier l'utilisateur
    hash: hash, //mot de passe hashé
    salt: salt //sécurité supplémenaire ajouté au mdp
  });
  newUser.save();
  User.find().exec(function(err, obj) {
    if (!err) {
      res.json(obj); //pb d'affichage d'utilisateur alors que ca rentre bien en BDD
    }
  });
});

//connexion d'un utilisateur
app.post("/api/user/log_in", function(req, res) {
  User.find({ email: req.body.email }).exec(function(err, obj) {
    if (!err) {
      if (obj.length === 0) {
        // si l'email n'existe pas alors
        res.status(401).json({ error: "Access denied" });
      } else {
        // si l'email existe alors
        //on hash le mdp avec le salt de la BDD
        const salt = obj[0].salt;
        const passwordBody = SHA256(req.body.password + salt).toString(
          encBase64
        );
        if (obj[0].hash === passwordBody) {
          const responseConnect = {
            _id: obj[0]._id,
            account: {
              username: obj[0].account.username,
              biography: obj[0].account.biography
            },
            email: obj[0].email,
            token: obj[0].token
          };
          res.json(responseConnect);
        } else {
          res.status(401).json({ error: "Access denied" });
        }
      }
    } else {
      res.status(400).json({ error: "Error" });
    }
  });
});

// Pour interrompre la connexion avec la base de données :
// mongoose.connection.close();
