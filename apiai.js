var apiai = require("apiai")
const dialogflow = require('dialogflow');

const sessionsManager = require("./sessionsManager")

var apiaiAgents ={}

class ApiAi {
	constructor () {
		// this.app = apiai(apiaiToken)
	}

	sendTextMessageToApiAi(textMessage, sessionId) {
		var self = this
		return new Promise((resolve, reject) => {
			
			return resolve(self.runSample(textMessage, sessionId))
	
		// 	var request = self.app.textRequest(textMessage, {sessionId: sessionId, contexts: session.apiaiContexts})

		// 	request.on("response", function(response) {
		// 		console.log("sendTextMessageToApiAi: response=" + JSON.stringify(response))
		// 		return resolve(response)
		// 	})

		// 	request.on("error", function(error) {
		// 		return reject(error)
		// 	})

		// 	request.end()

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

			var request = self.app.eventRequest(eventArg, {sessionId: sessionId, contexts: session.apiaiContexts})
			request.on("response", function(response) {
				console.log("sendEventToApiAi: received response")
				return resolve(response)
			})

			request.on("error", function(error) {
				console.log(error)
				return reject(error)
			})

			request.end()
		})
	}
	

	async runSample(textMessage, sessionId, projectId = 'vee-v2') {
		// A unique identifier for the given session
	  
		// Create a new session
		const sessionClient = new dialogflow.SessionsClient();
		const sessionPath = sessionClient.sessionPath(projectId, sessionId);
	  
		// The text query request.
		const request = {
		  session: sessionPath,
		  queryInput: {
			text: {
			  // The query to send to the dialogflow agent
			  text: textMessage,
			  // The language used by the client (en-US)
			  languageCode: 'en-US',
			},
		  },
		};
	  
		// Send request and log result
		const responses = await sessionClient.detectIntent(request);
		console.log('Detected intent');
		const result = responses[0].queryResult;
		result.sessionId = sessionId
		console.log(result)
		console.log(`  Query: ${result.queryText}`);
		console.log(`  Response: ${result.fulfillmentText}`);
		if (result.intent) {
		  console.log(`  Intent: ${result.intent.displayName}`);
		} else {
		  console.log(`  No intent matched.`);
		}
		return result
	  }
}

const getAgent = (apiaiToken) => {
	if (!apiaiAgents[apiaiToken]) {
		apiaiAgents[apiaiToken] = new ApiAi(apiaiToken)
	}
	return apiaiAgents[apiaiToken]
}

module.exports = {getAgent}
