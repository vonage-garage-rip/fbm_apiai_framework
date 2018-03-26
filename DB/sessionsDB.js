const ACTIVE_SESSIONS = "activeSessions"

class SessionsDB {

	constructor (db) {
		this.db = db
	} 
    
	getAllActiveSessions() {
		let self = this
		return new Promise( resolve => {    
			var ref = self.db.ref(ACTIVE_SESSIONS)
			ref.once("value")
				.then( snapshot =>  {
					var value = snapshot.val()
					if ( !value ) {
						console.warn("DB.getAllActiveSessions: no value was caught")
					}
					resolve(value)
				})
				.catch(err => {
					console.error("DB.getAllActiveSessions caught an error: " + err)
				})
		})
	}

	saveSession(session) {
		let self = this
		return new Promise( resolve => {    
			var ref = self.db.ref(ACTIVE_SESSIONS)
			var sessionRef = ref.child(session.sessionId)
			sessionRef.set(session)
			resolve(session)
		})
	}

	updateSession(sessionId, newPropertiesObj) {
		let self = this
		return new Promise( resolve => {    
			var ref = self.db.ref(ACTIVE_SESSIONS)
			var sessionRef = ref.child(sessionId)
			sessionRef.update(newPropertiesObj)
			resolve(sessionId)
		})
	}

	removeSession(sessionId) {
		let self = this
		return new Promise( resolve => {    
			var ref = self.db.ref(ACTIVE_SESSIONS)
			var sessionRef = ref.child(sessionId)
			sessionRef.remove()
			resolve(sessionId)
		})
	}

	removeSessionsByCommunity(communityId) {
		let self = this
        return new Promise(function (resolve, reject) {
			var meetingsRef = self.db.ref(ACTIVE_SESSIONS).orderByChild('communityId').equalTo(communityId)
            .on("value", function(response) {
				var value = response.val();
				console.log("removeSessionByCommunity", value)
                    if (value) {
                        resolve(Object.values(value))
                    } else {
                        resolve(null)
                    }
            })
        });
	}

}

//var sessionsDB = new SessionsDB()
module.exports = SessionsDB