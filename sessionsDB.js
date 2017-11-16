const ACTIVE_SESSIONS = "activeSessions"

class SessionsDB {

    constructor (db) {
        this.db = db
    }
    
    getAllActiveSessions() {
        let self = this
        return new Promise( resolve => {    
            var ref = self.db.ref(ACTIVE_SESSIONS);
            ref.once('value')
            .then( snapshot =>  {
                var value = snapshot.val();
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
            var ref = self.db.ref(ACTIVE_SESSIONS);
            var sessionRef = ref.child(session.sessionId)
            sessionRef.set(session)
            resolve(session);
        })
    }

    /// TODO this version will only update the 'from' property. Should change 2nd argument to args, expand and save all new values
    updateSession(sessionId, from) {
        let self = this
        return new Promise( resolve => {    
            var ref = self.db.ref(ACTIVE_SESSIONS);
            var sessionRef = ref.child(sessionId)
            sessionRef.update({from: from})
            resolve(session);
        })
    }

    removeSession(sessionId) {
        let self = this
        return new Promise( resolve => {    
            var ref = self.db.ref(ACTIVE_SESSIONS);
            var sessionRef = ref.child(sessionId)
            sessionRef.remove()
            resolve(session);
        })
    }

}

//var sessionsDB = new SessionsDB()
module.exports = SessionsDB