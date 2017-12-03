const actionsManager = require("../../actions/manager")
const hdap = require("../hdap.js")

const callbackAction = (apiresponse, session) => {
	var callData = session.data.lastCall
    
	hdap.getUser(session.data.essentialUserId)
		.then( user => {
			return hdap.callback(user, callData.remoteNumber, callData.localNumber)
		})
		.catch( error => {
			console.error(error)
		})
}
actionsManager.registerAction("action_callback", callbackAction)

