const actionsManager = require("../../actions/manager")
const loginActionHandler = require("./login")
const hdap = require("../hdap.js")

const busySMSAction = (apiresponse, session) => {
	sendSMS(session, apiresponse.parameters.DEFAULT_BUSY_MESSAGE)
}    

const replySMSAction = (apiresponse, session) => {
	sendSMS(session, apiresponse.resolvedQuery)
}    

function sendSMS(session, message) {
	/**
    * For Future improvments: 
    * update access_token when expired (wating on refresh token API calll)
    * rather than forcing user to relogin
    */
	var callData = session.data.lastCall
    
	hdap.getUser(session.data.essentialUserId)
		.then( user => {
			return hdap.sendSMS(user, callData.remoteNumber, callData.localNumber, message)
		})
		.catch( error => {
			console.error(error)
			if (error.code == "NO_CALLS") {
				//actionUtils.sendTextMessage(session, SMS_NO_NUMBER_FAIL)
				console.error("sendSMS got error NO_CALLS")
			} else {
				//Login Fail
				//actionUtils.sendTextMessage(session, SMS_ERROR)
				loginActionHandler.loginError(session)
			}
		})
}
actionsManager.registerAction("action_send_busy_sms", busySMSAction)
actionsManager.registerAction("action_reply_message", replySMSAction)