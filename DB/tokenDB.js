const TOKENS_DB_NAME = "Tokens"

class TokenDB {

	constructor (db) {
		this.db = db
    } 
    
    saveAccessToken(companyData) {
		let self = this
		return new Promise(resolve => {
			var usersRef = self.db.ref(TOKENS_DB_NAME).child(companyData['id'])
			usersRef.once("value")
				.then(snapshot => {
					var value = snapshot.val()
					if (value) {
						usersRef.update(companyData)
						usersRef.once("value", snapshot => {
							resolve(snapshot.val())
						})
	
					} else {
						self.db.ref(TOKENS_DB_NAME).child(companyData['id']).set(companyData)
						resolve(companyData)
					}
				})
		})
	
	}

	getAccessToken(communityId) {
		let self = this
		return new Promise( resolve => {
			if (!communityId) {
				resolve()
				return
			}
			var usersRef = self.db.ref(TOKENS_DB_NAME).child(communityId)
			usersRef.once("value")
				.then(snapshot => {
					var value = snapshot.val()
					resolve(value)
				}).catch(error => {
					resolve()
				})
		})
	}

}

//var sessionsDB = new SessionsDB()
module.exports = TokenDB