const hdap = require("../hdap.js")

const initiateCallback = (essentialUserId, from, to) => {
	hdap.getUser(essentialUserId)
		.then( user => {
			return hdap.callback(user, to, from)
		})
		.catch( error => {
			console.error("essential command initiateCallback caught an error: " + error)
		})
}

module.exports.initiateCallback = initiateCallback


