const console = require("console")
const moment = require("moment")

const ESSENTAIALS_USERS_DB_NAME = "Essentials_users"

var essentialDB

class EssentialDB {

	constructor (firebaseDatabase) {
		this.db = firebaseDatabase
	}

	getEssentialsUser(essentialUserId, logout = false) {
		let self = this
		return new Promise( (resolve, reject) => {
			self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(essentialUserId)
				.once("value")
				.then( snapshot => {
					var value = snapshot.val()
					if (value) {
						var foundUser = value.oauthUser
						//check the expiration
						var expires_in = foundUser.expires_in
						var token_created_date = value.token_created_date
						var now = moment()
						var token_expiration_date = moment(token_created_date)
						//check if expiration 60ms BEFORE its expiring
						//calling refresh_token grant fails when token is already expired
						token_expiration_date.add(expires_in - 60, "seconds")
						if (logout) {
							resolve(value)
							return
						}
						var difference = moment.duration(now.diff(token_expiration_date))

						if (difference.asMilliseconds() > 1) {
							console.error("access token expiring soon...")
							var error = new Error("access token expired")
							error.code = "ACCESS_TOKEN_ERROR"
							var result = {
								error: error,
								user: value
							}

							reject(result)
						} else {
							console.info("getEssentialsUser: Retrived value user from FB")
							resolve(value)
						}

					} else {
						reject(new Error("User Not found"))
					}
				})
		})
	}

	updateUser(account_ext_ID, tokenData) {
		let self = this
		return new Promise( resolve => {
			var usersRef = self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(account_ext_ID)
			usersRef.once("value")
				.then( snapshot => {
					var value = snapshot.val()
					if (value) {
						tokenData.token_created_date = new Date().toISOString()
						usersRef.update(tokenData)
						usersRef.once("value", snapshot => {
							resolve(snapshot.val())
						})

					} else {
						tokenData.token_created_date = new Date().toISOString()
						self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(account_ext_ID).set(tokenData)
						resolve(tokenData)
					}
				})
		})
	}

	removeUser(fbID) {
		let self = this
		return new Promise( resolve => {
			var usersRef = self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(fbID)
			usersRef.on("child_removed", () => {
				console.info("user removed")
				resolve()
			})
			usersRef.remove()
		})
	}
}

const getDB = (firebaseDatabase) => {
	if (!essentialDB) {
		essentialDB = new EssentialDB(firebaseDatabase)
	}
	return essentialDB
}

module.exports = { getDB }