//const sessionsManager = require('../sessionsManager');
var admin = require("firebase-admin");

var serviceAccount = require("../.vscode/dealership-board-demo-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dealership-board-demo.firebaseio.com"
});

const CONTEXTS_DB_NAME = "Contexts" //saves API.AI respones by Context
const FB_USERS_DB_NAME = "FB_Users"

var getAllContexts = () => {
 
    return new Promise(function (resolve, reject) {
        // Get a database reference to our posts
        var db = admin.database();
        var ref = db.ref(CONTEXTS_DB_NAME);

        // Attach an asynchronous callback to read the data at our posts reference
        ref.on("value", function (snapshot) {

            resolve(snapshot.val());
        }, function (errorObject) {

            reject(errorObject);
        });
    })
}

var saveContext = function (sessionID, data) {
    return new Promise(function (fulfill, reject) {
        var db = admin.database();
        var ref = db.ref(CONTEXTS_DB_NAME);
        var contextRef = ref.child(sessionID)
        contextRef.set(data)
        fulfill(data);
    })
}



var saveUser = function (userID, data) {
    return new Promise(function (fulfill, reject) {
        var db = admin.database();
        var ref = db.ref(FB_USERS_DB_NAME);
        var usersRef = ref.child(userID)
        usersRef.set(data)
        fulfill(data);
    })
}

var getUser = function(userID) {
    return new Promise(function (fulfill, reject) {
        var db = admin.database();
        var ref = db.ref(FB_USERS_DB_NAME);
        ref.child(userID)
            .once('value')
            .then(function (snapshot) {
                var value = snapshot.val();
                if (value) {
                    fulfill(value)
                } else {
                    console.error("User Not found")
                    fulfill(null)
                }
            });
    });
}

module.exports = { getAllContexts, saveContext, getUser, saveUser };