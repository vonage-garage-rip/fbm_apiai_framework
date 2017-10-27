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
    FB_MESSENGER: Symbol("FB_MESSENGER"),
    FB_WORKPLACE: Symbol("FB_WORKPLACE"),
    NEXMO: Symbol("Nexmo")
}

const SOURCE_TYPE = {
    POST: Symbol("POST"),
    GROUP_CHAT: Symbol("GROUP_CHAT"),
    ONE_ON_ONE_CHAT: Symbol("ONE_ON_ONE_CHAT")
}

const apiaiUsersAgent = require('./apiai').getAgent(process.env.APIAI_TOKEN)
const apiaiBusinessAgent = require('./apiai').getAgent(process.env.APIAI_TOKEN)

const nexmoChannel = require('./channels/nexmo/nexmohook');
const wpChannel = require('./channels/facebook/wphook');
const fbmChannel = require('./channels/facebook/fbmhook');

/// TODO clean sessions that were not active for a certain duration
var chatSessions = {};
var userChannelToSessions = {}; // channels/integrations from user are pointing to chat sessions
var db

const initialize = dbReference => {
    db = dbReference /// TODO should be an interface
}

const inboundFacebookMessengerEvent = (req, res) => {
    fbmChannel.handleInboundEvent(req, res);
}

const inboundFacebookWorkplaceEvent = (req, res) => {
    wpChannel.handleInboundEvent(req, res);
}

const inboundNexmoEvent = (req, res) => {
    nexmoChannel.handleInboundEvent(req, res);
}

const getSessionBySessionId = sessionId => {
    return chatSessions[sessionId];
}

const getSessionContext = (session, contextId) => {
    return new Promise(function (resolve, reject) {
        db.getContext(contextId)
            .then(function (context) {
                resolve(context)
            }).catch(function (error) {
                reject(error)
            })
    })
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
    return new Promise(function (resolve) {

        mappedChatSession = userChannelToSessions[messagingEvent.source]
        if (mappedChatSession) {
            mappedChatSession.lastInboundMessage = moment();
            return resolve(mappedChatSession);
        }
        else {
            // Set new session 
            let sessionId = uuidv4();
            let apiaiAgent;
            // TODO this should be moved to parent app logic
            switch ( messagingEvent.channel ) {
                case CHANNELS.FB_MESSENGER:
                case CHANNELS.NEXMO:
                    apiaiAgent = apiaiUsersAgent
                    break;
                case CHANNELS.FB_WORKPLACE:
                    apiaiAgent = apiaiBusinessAgent
                    break;
            }

            mappedChatSession = chatSessions[sessionId] = {
                channel: messagingEvent.channel,
                apiaiAgent: apiaiAgent,
                sessionId: sessionId,
                profile: {},
                sourceType: messagingEvent.sourceType,
                source: messagingEvent.source, 
                from: messagingEvent.from,
                lastInboundMessage: moment(),
                externalIntegrations: {},
                phoneNumbers: [],
                data: {}
            }

            if ( messagingEvent.channel===CHANNELS.NEXMO ) {
                mappedChatSession.phoneNumbers.push(messagingEvent.source)                
            }

            userChannelToSessions[messagingEvent.source] = mappedChatSession;

            db.getUser(messagingEvent.source)
            .then(user => {
                if ( user ) {
                    Object.assign(mappedChatSession, user)
                    mappedChatSession.lastInboundMessage = moment(mappedChatSession.lastInboundMessage)
                    return resolve(mappedChatSession)
                }
                else if ( messagingEvent.channel===CHANNELS.FB_MESSENGER ) {
                    fbmChannel.getUserProfile(messagingEvent.source)
                    .then(json => {
                        console.log("user profile:" + JSON.stringify(json));
                        mappedChatSession.profile = json;
                        return resolve(mappedChatSession);
                    })
                }
                else {
                    return resolve(mappedChatSession);
                }
            })
            .catch(err => {
                console.log("sessionManaer.getSessionByChannelEvent caught an error: " + err);
                return resolve(mappedChatSession);
            })
        }
    });
}

var handleResponseWithMessages = (messages, session) => {
    
    
    messages.forEach( (message, index) => {
        //Delay or queue messages so we'll keep order in place
        /// TODO: find better way
        setTimeout( () => {
            switch (session.channel) {
                /// TODO should we filter based on message.platform value?
                case CHANNELS.FB_MESSENGER:
                    fbmChannel.sendMessage(message, session);
                    break;x
                case CHANNELS.FB_WORKPLACE:
                    wpChannel.sendMessage(message, session)
                    break;
                case CHANNELS.NEXMO:
                    nexmoChannel.sendMessage(message, session)
                    break;
            }
        }, 1460 * index);
    })
}

const handleApiaiResponse = (apiairesponse) => {
    if (apiairesponse) {
        console.log("HANDLE APIAI RESPONSE: ", apiairesponse);
        let actionName = apiairesponse.result.action
        if ( actionName && actionName!=="input.unknown" ) {
            actionsManager.handleAction(apiairesponse.result.action, apiairesponse.result, getSessionBySessionId(apiairesponse.sessionId))
        }
        
        let messages = apiairesponse.result.fulfillment.messages ? apiairesponse.result.fulfillment.messages : [apiairesponse.result.fulfillment.speech]
        handleResponseWithMessages(messages, getSessionBySessionId(apiairesponse.sessionId))
    }
}

const handleInboundChannelMessage = (message) => {
    getSessionByChannelEvent(message)
        .then((session) => {
            console.log("session", session, "sessionsManager.handleInboundChannelMessage: " + JSON.stringify(message));
            if (message.quick_reply) {
                return session.apiaiAgent.sendTextMessageToApiAi(unescape(message.quick_reply.payload), session.sessionId);
            }
            return session.apiaiAgent.sendTextMessageToApiAi(message.text, session.sessionId);
        })
        .then(apiairesponse => {
            handleApiaiResponse(apiairesponse);
        })
        .catch(err => {
            console.log("sessionsManager.handleInboundChannelMessage caught an error: " + err);
        });
}

const handleInboundChannelPostback = (message) => {
    getSessionByChannelEvent(message)
        .then(session => {
            console.log("session", session, "sessionsManager.handleInboundChannelPostback: " + message);
            return session.apiaiAgent.sendTextMessageToApiAi(unescape(message.payload), session.sessionId);
        })
        .then(apiairesponse => {
            handleApiaiResponse(apiairesponse);
        })
        .catch(err => {
            console.log("sessionsManager.handleInboundChannelPostback caught an error: " + err);
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
            session.apiaiAgent.sendEventToApiAi(event, session.sessionId)
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
            apiai.sendEventToApiAi(event, session.sessionId)
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
module.exports.getSessionContext = getSessionContext;
module.exports.initialize = initialize;

