const actionsManager = require("../../actions/manager")
const sessionsManager = require("../../sessionsManager")
const firebaseDatabase = require("../../DB/firebase").firebaseDatabase
const essentialDB = require("../../DB/essentialDB").getDB(firebaseDatabase)
const hdap = require("../hdap.js")
var notifications = require(".././notifications.js")

const LOGOUT_SUCCESSFUL_EVENT = "LOGOUT_SUCCESSFUL_EVENT"
const LOGOUT_ERROR_EVENT = "LOGOUT_ERROR_EVENT"

const logoutAction = (apiresponse, session) => {
	console.log(apiresponse)
	console.log(session)
	logout(session)
}

function logout(session) {
	let senderID = session.data.essentialUserId
	hdap.getUser(senderID, true)
		.then( user => {
			//disconnect if we are already connected
			return notifications.disconnect(user)
		})
		.then( user => {
			//Revoke token
			return hdap.revokeToken(user)
		})
		.then( () => {
			essentialDB.removeUser(senderID)
		})
		.then( () => {
			sessionsManager.handleEventBySessionId(session.sessionId, {type: LOGOUT_SUCCESSFUL_EVENT})
		})
		.catch( error => {
			console.error("logout caught an error: " + error)
			sessionsManager.handleEventBySessionId(session.sessionId, {type: LOGOUT_ERROR_EVENT})
			
		})
}

actionsManager.registerAction("action_logout", logoutAction)
