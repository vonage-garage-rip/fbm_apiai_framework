const sessionsManager = require('../../../sessionsManager')
var firebase = require("firebase-admin");
const winston = require('winston');
const moment = require('moment');

const CONTEXTS_DB_NAME = "Contexts" //saves API.AI respones by Session
const FB_USERS_DB_NAME = "FB_Users"
const AUTOMATIC_DB_NAME = "Automatic";
const NOTIFICATIONS_DB_NAME = "Notifications"

const ESSENTAIALS_USERS_DB_NAME = process.env.DEALERSHIP_BOT ? "Essentials_users" : "users"
const WORKPLACE_USERS_DB_NAME = process.env.DEALERSHIP_BOT ? "Workplace_users" : 'community'

class Firebase {

    constructor() {
        var privateKey = null
        try {
            privateKey = JSON.parse(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
        } catch (e) {
            privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
        }

        firebase.initializeApp({
            credential: firebase.credential.cert({
                "private_key": privateKey,
                "client_email": process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            }),
            databaseURL: process.env.FIREBASE_DB
        }
        );
        this.db = firebase.database();
    }

    getUser(userID) {
        let self = this
        return new Promise(function (resolve, reject) {
            var ref = self.db.ref(FB_USERS_DB_NAME);
            ref.child(userID)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        resolve(value)
                    } else {
                        console.error("User Not found")
                        resolve(null)
                    }
                });
        });
    }
}

var firebase = new Firebase()
sessionsManager.initializeDb(firebase)
module.exports = firebase