module.exports = {};

const actionsManager = require('./actions/manager')

const moment = require('moment');

const EVENTS = {
	GET_STARTED_PAYLOAD: "GET_STARTED_PAYLOAD",
	ACCOUNT_LINKED: "ACCOUNT_LINKED"
};

module.exports.EVENTS = EVENTS

require('log-timestamp');
const uuidv4 = require('uuid/v4');

const MESSAGE_TYPES = {
	TEXT: 0,
	IMAGE: 3,
	CARD: 1,
	QUICK_REPLY: 2,
	CUSTOME: 4,
	AUDIO: 5,
	VIDEO: 6,
	CAROUSEL: 7
};

const CHANNELS = {
	FB_MESSENGER: "FB_MESSENGER",
	FB_WORKPLACE: "FB_WORKPLACE",
	NEXMO: "Nexmo"
}

const SOURCE_TYPE = {
	POST: "POST",
	GROUP_CHAT: "GROUP_CHAT",
	ONE_ON_ONE_CHAT: "ONE_ON_ONE_CHAT"
}

const apiaiModule  = require('./apiai')
var channels = {}

/// TODO clean sessions that were not active for a certain duration
var chatSessions = {};
var userChannelToSessions = {}; // channels/integrations from user are pointing to chat sessions
var SessionsDbClass = require('./DB/sessionsDB')

const getAllActiveSessions = () => {
	sessionsDb.getAllActiveSessions()
	.then(activeSessions => {
		for ( const sessionID in activeSessions) {
			let session = activeSessions[sessionID]
			
			// Firebase don't save empty arrays/objects so we create them here if needed
			if ( !session.profile ) { session.profile = {} }
			if ( !session.data ) { session.data = {} }
			if ( !session.apiaiContexts ) { apiaiContexts = [] }
			
			chatSessions[sessionID] = session
			userChannelToSessions[session.source] = session;
		}
	})
	.catch(error => {
		console.error("sessionsManager.getAllActiveSessions caught an error: " + error)
	})
}

const setDB = (db) => {
	sessionsDb = new SessionsDbClass(db)
	getAllActiveSessions()
}

const updateSession = (session, newPropertiesObj) => {
	Object.assign(session, newPropertiesObj)
	sessionsDb.updateSession(session.sessionId, newPropertiesObj)
}


const setChannel = (channelType, channel, apiaiToken) => {
	channels[channelType] = {
		channel: channel,
		apiaiAgent: apiaiModule.getAgent(apiaiToken)
	}
	channel.startChannel()
}

const getChannel = (channelType) => {
	return channels[channelType].channel
}

const getApiAiAgent = (channelType) => {
	return channels[channelType].apiaiAgent

}

const inboundFacebookMessengerEvent = (req, res) => {
	getChannel(CHANNELS.FB_MESSENGER).handleInboundEvent(req, res);
}

const inboundFacebookWorkplaceEvent = (req, res) => {
	getChannel(CHANNELS.FB_WORKPLACE).handleInboundEvent(req, res);
}

const inboundNexmoEvent = (req, res) => {
	getChannel(CHANNELS.NEXMO).handleInboundEvent(req, res);
}

const getSessionBySessionId = sessionId => {
	return chatSessions[sessionId];
}

/*
 * Return new or existing chat session Object.
 * 
 * Chat sessions are mapped by session ID. Since more than one
 *   channel can be mapped to a session, we use userChannelToSessions 
 *   which is mapped by sender ID of the channel (msisdn for SMS, 
 *   pageID for Facebook).
 * To add a new channel to an existing session, an empty channel
 *   object for that channel should aleady have been created in 
 *   the session and userChannelToSessions[sender] is pointing 
 *   to the existing session.
 */
var getSessionByChannelEvent = (messagingEvent) => {
	return new Promise( (resolve, reject) => {

		console.log("getSessionByChannelEvent looking for source: %s.", messagingEvent.source)
		let mappedChatSession = userChannelToSessions[messagingEvent.source]
		if (mappedChatSession) {
			console.log("getSessionByChannelEvent found source: %s.",  messagingEvent.source)
			mappedChatSession.lastInboundMessage = moment().format('MMMM Do YYYY, h:mm:ss a');
			if ( messagingEvent.from ) {
				mappedChatSession.from = messagingEvent.from
				updateSession(mappedChatSession, {from: mappedChatSession.from})
			}
			return resolve(mappedChatSession);
		}
		else {
			// Set new session 
			console.log("getSessionByChannelEvent did not found source: %s.", messagingEvent.source)
			let sessionId = uuidv4();

			mappedChatSession = chatSessions[sessionId] = {
				channelType: messagingEvent.channel,
				sessionId: sessionId,
				profile: {},
				sourceType: messagingEvent.sourceType || null,
				source: messagingEvent.source || null, 
				from: messagingEvent.from || null,
				lastInboundMessage: moment().format('MMMM Do YYYY, h:mm:ss a'),
				externalIntegrations: {},
				data: {},
				apiaiContexts: []
			}

			userChannelToSessions[messagingEvent.source] = mappedChatSession;

			getChannel(mappedChatSession.channelType).getUserProfile(mappedChatSession.from)
			.then(json => {
				console.log("'from' profile:" + JSON.stringify(json));
				mappedChatSession.profile = json;
				return mappedChatSession;
			})
			.then(session => {
				sessionsDb.saveSession(session)
				return resolve(session)
			})
			.catch(error => {
				console.error("calling get user profile caught an error: " + error);
				reject(error);
			})
		}
	})
}


var removeSessionBySource = (source) => {
	return new Promise( resolve => { 
		let session = userChannelToSessions[source]
		if ( session ) {
			console.log("removeSessionBySource: removing session for source: " + source)
			delete userChannelToSessions[source]
			delete chatSessions[session.sessionId]
			sessionsDb.removeSession(session.sessionId)
			.then(sessionId => {
				resolve(sessionId)
			})
		}
		else {
			console.log("removeSessionBySource: no session was found for source: " + source)
			resolve(-1)
		}
	})
}

var handleResponseWithMessages = (messages, session) => {

	messages.forEach( (messageObj, index) => {
		//Delay or queue messages so we'll keep order in place
		setTimeout( () => {
			let channel = getChannel(session.channelType)
			switch (session.channelType) {
			// filtering by platofmr property but this will add unneccessary delays
			case CHANNELS.FB_MESSENGER:
			case CHANNELS.FB_WORKPLACE:
				if (!messageObj.platform || messageObj.platform=="facebook") {            
					channel.sendMessage(messageObj, session);
				}
				break;
			case CHANNELS.NEXMO:
				if (!messageObj.platform) {
					channel.sendMessage(messageObj, session)
				}
				break;
			}
		}, 1460 * index);
	})
}

const handleApiaiResponse = (apiairesponse) => {
	if (apiairesponse) {
		console.log("HANDLE APIAI RESPONSE", apiairesponse);
		let actionName = apiairesponse.result.action
		if ( actionName && actionName!=="input.unknown" ) {
			actionsManager.handleAction(apiairesponse.result.action, apiairesponse.result, getSessionBySessionId(apiairesponse.sessionId))
		}
        
		let messages = apiairesponse.result.fulfillment.messages ? apiairesponse.result.fulfillment.messages : [apiairesponse.result.fulfillment.speech]
		var filteredMessages = messages.filter(function (message) {
			return message.speech != "" ;
		});
		if (filteredMessages.length == 0) {
			console.warn("handleApiaiResponse: No message to send")
			return
		}
		handleResponseWithMessages(filteredMessages, getSessionBySessionId(apiairesponse.sessionId))
	}
}

const handleInboundChannelMessage = (message) => {
	getSessionByChannelEvent(message)
		.then((session) => {
			console.log("session", session, "sessionsManager.handleInboundChannelMessage: " + JSON.stringify(message));
			if (message.quick_reply) {
				return getApiAiAgent(session.channelType).sendTextMessageToApiAi(unescape(message.quick_reply.payload), session.sessionId);
			}
			return getApiAiAgent(session.channelType).sendTextMessageToApiAi(message.text, session.sessionId);
		})
		.then(apiairesponse => {
			handleApiaiResponse(apiairesponse);
		})
		.catch(err => {
			console.error("sessionsManager.handleInboundChannelMessage caught an error: " + err);
		});
}

const handleInboundChannelPostback = (message) => {
	getSessionByChannelEvent(message)
		.then(session => {
			console.log("session", session, "sessionsManager.handleInboundChannelPostback: " + message);
			return getApiAiAgent(session.channelType).sendTextMessageToApiAi(unescape(message.payload), session.sessionId);
		})
		.then(apiairesponse => {
			handleApiaiResponse(apiairesponse);
		})
		.catch(err => {
			console.error("sessionsManager.handleInboundChannelPostback caught an error: " + err);
		});
}

const handleEventByUserChannelId = (userChannelId, event) => {
	let session = userChannelToSessions[userChannelId]
	if ( session ) {
		handleEvent(session, event)
	}
	else {
		console.log("sessionManager: couldn't find session for user channel ID: " + userChannelId)
	}
}

const handleEventBySessionId = (sessionId, event) => {
	let session = getSessionBySessionId(sessionId);
	handleEvent(session, event)
}

const handleEvent = (session, event) => {
	switch (event.type) {
	case EVENTS.GET_STARTED_PAYLOAD:
		getApiAiAgent(session.channelType).sendEventToApiAi(event, session.sessionId)
			.then(apiairesponse => {
				handleApiaiResponse(apiairesponse);
			});
		break;
	case EVENTS.ACCOUNT_LINKED:
		session.externalIntegrations[event.data.integrationName] = {"User_ID": event.data.userId}
		userChannelToSessions[event.data.userId] = session /// do we need that?
		actionsManager.handleAction("accountLinked", event.data, session)
		break;
	default:
		///TODO: REFACTOR. HANDLE PROPRIETARY EVENTS
		getApiAiAgent(session.channelType).sendEventToApiAi(event, session.sessionId)
			.then(apiairesponse => {
				handleApiaiResponse(apiairesponse);
			});
	}
}

module.exports.handleInboundChannelPostback = handleInboundChannelPostback;
module.exports.handleInboundChannelMessage = handleInboundChannelMessage;
module.exports.getSessionBySessionId = getSessionBySessionId;
module.exports.getSessionByChannelEvent = getSessionByChannelEvent;
module.exports.inboundFacebookMessengerEvent = inboundFacebookMessengerEvent;
module.exports.inboundFacebookWorkplaceEvent = inboundFacebookWorkplaceEvent;
module.exports.inboundNexmoEvent = inboundNexmoEvent;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
module.exports.SOURCE_TYPE = SOURCE_TYPE;
module.exports.CHANNELS = CHANNELS;
module.exports.handleEventBySessionId = handleEventBySessionId;
module.exports.handleEventByUserChannelId = handleEventByUserChannelId;
module.exports.setDB = setDB;
module.exports.setChannel = setChannel;
module.exports.removeSessionBySource = removeSessionBySource
module.exports.updateSession = updateSession