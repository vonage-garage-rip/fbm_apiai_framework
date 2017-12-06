const hdap = require("../hdap.js")
var notifications = require("../notifications.js")
var nonVerifiedSessions = []

const sessionsManager = require("../../sessionsManager")

const LOGIN_SUCCESSFUL_EVENT = "LOGIN_SUCCESSFUL_EVENT"
const LOGIN_URL_CREATED_EVENT = "LOGIN_URL_CREATED_EVENT"
const LOGIN_ERROR_EVENT = "LOGIN_ERROR_EVENT"


const loginError = session => {
	nonVerifiedSessions.push(session)
	let event = {type: LOGIN_ERROR_EVENT, data: {url: hdap.generateAuthURL()}}
	sessionsManager.handleEventBySessionId(session.sessionId, event)
}

const triggerLogin = (session) => {
	nonVerifiedSessions.push(session)
	let event = {type: LOGIN_URL_CREATED_EVENT, data: {url: hdap.generateAuthURL()}}
	sessionsManager.handleEventBySessionId(session.sessionId, event)
}

function getStarted(session) {
	if ( !session.data || !session.data.essentialUserId) {
		console.log("login.js:getStarted no essentialUserId in session.data. calling triggerLogin")
		triggerLogin(session)
	}
	else {
		console.log("login.js:getStarted connecting to " + session.data.essentialUserId)
		connect(session.data.essentialUserId)
			.then( user => {
				console.log("login.js:getStarted connected to a user:", user)
				sessionsManager.handleEventBySessionId(session.sessionId, {type: LOGIN_SUCCESSFUL_EVENT})
			})
			.catch( err => {
				//either user haven't logged-in or the access_token expired
				console.warn("login.js:getStarted caught an error: ", err)
				triggerLogin(session)
			})
	}
}

function connect(essentialUserId) {
	return new Promise( (resolve, reject) => {
		hdap.getUser(essentialUserId)
			.then( user => {
				return notifications.disconnectPusher(user)
			})
			.then( user => {
				resolve(notifications.connectPusher(user))
			})
			.catch( err => {
				console.error("could not login", err)
				reject(err)
			})
	})
}

function verifyCode(session, code) {
	return new Promise( resolve => {
		hdap.connect(session, code)
			.then( result => {
				console.info("login success", result)
				sessionsManager.handleEventBySessionId(session.sessionId, {type: LOGIN_SUCCESSFUL_EVENT})				
				resolve( result )
			})
	})
}

exports.verifyCode = verifyCode
exports.getStarted = getStarted
exports.triggerLogin = triggerLogin
exports.nonVerifiedSessions = nonVerifiedSessions
exports.loginError = loginError