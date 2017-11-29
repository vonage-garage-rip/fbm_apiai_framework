var firebaseAdmin = require("firebase-admin")
var firebaseDatabase

const initializeFirebaseApp = () => {
	var privateKey = null
	try {
		privateKey = JSON.parse(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
	} catch(e) {
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
	firebaseDatabase = firebaseAdmin.database()
}

initializeFirebaseApp()

module.exports = { firebaseDatabase }