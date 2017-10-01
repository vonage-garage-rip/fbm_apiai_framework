//const sessionsManager = require('../sessionsManager');
var admin = require("firebase-admin");

var serviceAccount = require("../.vscode/dealership-board-demo-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dealership-board-demo.firebaseio.com"
});

var getAllContexts = () => {
 
    return new Promise(function (resolve, reject) {
        // Get a database reference to our posts
        var db = admin.database();
        var ref = db.ref("/Contexts");

        // Attach an asynchronous callback to read the data at our posts reference
        ref.on("value", function (snapshot) {

            resolve(snapshot.val());
        }, function (errorObject) {

            reject(errorObject);
        });
    })
}

var saveUserContext = (userID, data) => {
    return new Promise(function (fulfill, reject) {
        var usersRef = firebase.database().ref("/").child("Contexts")
        usersRef.set(data)
    })
}

module.exports = { getAllContexts, saveUserContext };