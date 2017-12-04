const hdap = require("../hdap.js")

   
function sendSMS(essentialUserId, from, to, message) {
	/**
    * For Future improvments: 
    * update access_token when expired (wating on refresh token API calll)
    * rather than forcing user to relogin
    */
    
	hdap.getUser(essentialUserId)
		.then( user => {
			return hdap.sendSMS(user, to, from, message)
		})
		.catch( error => {
			console.error("essential command sendSMS caught an error: " + error)
		})
}

module.exports.sendSMS = sendSMS