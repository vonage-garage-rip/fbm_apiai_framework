const sessionsManager = require("../../../sessionsManager")
var firebaseAdmin = require("firebase-admin")

const FB_USERS_DB_NAME = "FB_Users"

class Firebase {

	constructor() {
		var privateKey = null
		try {
			privateKey = JSON.parse(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
		} catch (e) {
			privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
		}

		firebaseAdmin.initializeApp({
			credential: firebaseAdmin.credential.cert({
				"private_key": privateKey,
				"client_email": process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
			}),
			databaseURL: process.env.FIREBASE_DB
		}
		)
		this.db = firebaseAdmin.database()
	}

	getUser(userID) {
		let self = this
		return new Promise( resolve => {
			var ref = self.db.ref(FB_USERS_DB_NAME)
			ref.child(userID)
				.once("value")
				.then( snapshot => {
					var value = snapshot.val()
					if (value) {
						resolve(value)
					} else {
						console.error("getUser: User Not found")
						resolve(null)
					}
				})
		})
	}
}

var firebase = new Firebase()
sessionsManager.initializeDb(firebase)
module.exports = firebase