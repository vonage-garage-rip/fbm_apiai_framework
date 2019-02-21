const dialogflow = require('dialogflow').v2beta1;
const structJson = require('./structjson.js')

const sessionsManager = require("./sessionsManager")

var apiaiAgents = {}

class ApiAi {
	constructor() {
		// this.app = apiai(apiaiToken)
	}

	sendTextMessageToApiAi(textMessage, sessionId) {
		var self = this
		return new Promise((resolve, reject) => {
			return resolve(self.sendText(textMessage, sessionId))
		})
	}

	sendEventToApiAi(event, sessionId) {
		var self = this
		return new Promise((resolve, reject) => {
			let session = sessionsManager.getSessionBySessionId(sessionId)

			let eventArg = {
				"name": event.type,
				"parameters": structJson.jsonToStructProto(event.data),
				"languageCode": "en-US"
			}

			return resolve(self.sendEvent(eventArg, sessionId))

		})
	}


	async sendText(textMessage, sessionId) {
		// A unique identifier for the given session

		// Create a new session
		const sessionClient = new dialogflow.SessionsClient();
		const sessionPath = sessionClient.sessionPath(process.env.GCLOUD_PROJECT_ID, sessionId);
		const knowledgebase = new dialogflow.KnowledgeBasesClient();
		
		const knowledgeBasePath = knowledgebase.knowledgeBasePath(
			process.env.GCLOUD_PROJECT_ID,
			process.env.KNOWLEDGE_BASE_NAME
		);

		// The text query request.
		var request = {
			session: sessionPath,
			queryInput: {
				text: {
					// The query to send to the dialogflow agent
					text: textMessage,
					// The language used by the client (en-US)
					languageCode: 'en-US',
				},
			},
			queryParams: {
				knowledgeBaseNames:[knowledgeBasePath]
			}
		};
		
		// Send request and log result
		const responses = await sessionClient.detectIntent(request);
		console.log('Detected intent');
		const result = responses[0].queryResult;
		result.sessionId = sessionId
		result.parameters = structJson.structProtoToJson(result.parameters)
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

	async sendEvent(event, sessionId) {
		// A unique identifier for the given session

		// Create a new session
		const sessionClient = new dialogflow.SessionsClient();
		const sessionPath = sessionClient.sessionPath(process.env.GCLOUD_PROJECT_ID, sessionId);

		// The text query request.
		const request = {
			session: sessionPath,
			queryInput: {
				event: event,
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

module.exports = { getAgent }
