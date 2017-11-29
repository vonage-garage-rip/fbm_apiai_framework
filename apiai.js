var apiai = require("apiai")
const sessionsManager = require("./sessionsManager")

var apiaiAgents ={}

class ApiAi {
	constructor (apiaiToken) {
		this.app = apiai(apiaiToken)
	}

	sendTextMessageToApiAi(textMessage, sessionId) {
		var self = this
		return new Promise((resolve, reject) => {
			let session = sessionsManager.getSessionBySessionId(sessionId)

			var request = self.app.textRequest(textMessage, {sessionId: sessionId, contexts: session.apiaiContexts})

			request.on("response", function(response) {
				console.log("sendTextMessageToApiAi: response=" + JSON.stringify(response))
				return resolve(response)
			})

			request.on("error", function(error) {
				return reject(error)
			})

			request.end()
		})
	}

	sendEventToApiAi(event, sessionId) { 
		var self = this
		return new Promise( (resolve, reject) => {
			let session = sessionsManager.getSessionBySessionId(sessionId)
			
			let eventArg = {
				"name": event.type,
				"data": event.data, 
			}

<<<<<<< HEAD
			var request = self.app.eventRequest(eventArg, {sessionId: sessionId, contexts: session.apiaiContexts});

			request.on('response', function(response) {
				console.log("sendEventToApiAi: received response");
				return resolve(response);
			});
=======
			var request = self.app.eventRequest(eventArg, {sessionId: sessionId, contexts: session.apiaiContexts})
			request.on("response", function(response) {
				console.log("sendEventToApiAi: received response")
				return resolve(response)
			})
>>>>>>> feature/refactor_II

			request.on("error", function(error) {
				console.log(error)
				return reject(error)
			})

			request.end()
		})
	}
}

const getAgent = (apiaiToken) => {
	if (!apiaiAgents[apiaiToken]) {
		apiaiAgents[apiaiToken] = new ApiAi(apiaiToken)
	}
	return apiaiAgents[apiaiToken]
}

module.exports = {getAgent}
