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

const apiaiUsersAgent = require('./apiai').getAgent(process.env.APIAI_TOKEN)
const apiaiBusinessAgent = require('./apiai').getAgent(process.env.APIAI_TOKEN)

const nexmoChannel = require('./channels/nexmo/nexmohook');
const wpChannel = require('./channels/facebook/wphook');
const fbmChannel = require('./channels/facebook/fbmhook');
const fbUtility = require('./channels/facebook/utility');

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

const setSessionPhone = (session, phone) => {
    session.phoneNumbers.push(phone)
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
            mappedChatSession.from = messagingEvent.from
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
                source: messagingEvent.source, 
                from: messagingEvent.from,
                lastInboundMessage: moment(),
                externalIntegrations: [],
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
                    fbUtility.getUserProfile(messagingEvent.source)
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

//Get url type: Audio, Video or Image
var identifyUrl = (message, url) => {
    var type = message.type;

    if (message.payload.isVideo) {
        type = 6;
    }
    else if (message.payload.isAudio) {
        type = 5;
    }
    else if (url.includes("images")) {
        type = 3;
    }

    return { "type": type, "payload": url }
}

var handleResponseWithMessages = (apiairesponse) => {
    var messages = apiairesponse.result.fulfillment.messages;

    messages.forEach(function (message, index) {
        //Delay or queue messages so we'll keep order in place
        /// TODO: find better way
        setTimeout(function () {
            //TODO: REFACTOR
            let session = getSessionBySessionId(apiairesponse.sessionId)
            if (message.payload && message.payload.urls || message.payload && message.payload.facebook.attachment.payload.isVideo || message.payload && message.payload.facebook.attachment.payload.isAudio) {
                if (message.payload.facebook && message.payload.facebook.attachment.payload.isVideo || message.payload.facebook && message.payload.facebook.attachment.payload.isAudio) {
                    //Handle API.AI custom payload response
                    message.payload = message.payload.facebook.attachment.payload;
                }
                //Handle many content urls
                message.payload.urls.forEach(function (url) {
                    //Check if Message contains audio, video or image.
                    var urlMessage = identifyUrl(message, url);

                    switch (session.channel) {
                        case CHANNELS.FB_MESSENGER:
                            fbmChannel.sendMessageToUser(urlMessage, apiairesponse.sessionId);
                            break;
                        case CHANNELS.NEXMO:
                            // can't send rich media
                            break;
                        case CHANNELS.FB_WORKPLACE:
                            wpChannel.sendMessageToUser(urlMessage, apiairesponse.sessionId);
                            break;
                    }
                });
            }
            else {
                switch (session.channel) {
                    case CHANNELS.FB_MESSENGER:
                        fbmChannel.sendMessageToUser(message, apiairesponse.sessionId);
                        break;
                    case CHANNELS.FB_WORKPLACE:
                        // message is the comment we're sending, source is actually the post ID
                        wpChannel.sendCommentToPost(message.speech, session.source); 
                        break;
                    case CHANNELS.NEXMO:
                        nexmoChannel.sendMessage(session.phoneNumbers[0], message.speech)
                        break;
                }
                
                

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
        if (apiairesponse.result.fulfillment.data && apiairesponse.result.fulfillment.data.facebook) {
            /// TODO choose the right channel (fbm, nexmo, ..
            fbmChannel.sendMessageToUser({ type: MESSAGE_TYPES.CUSTOME, payload: { facebook: apiairesponse.result.fulfillment.data.facebook } }, apiairesponse.sessionId);
        }

        if (apiairesponse.result.fulfillment.messages && apiairesponse.result.fulfillment.messages.length > 0) {
            handleResponseWithMessages(apiairesponse);
        }
        else {
            /// TODO choose the right channel (fbm, nexmo, ..
            fbmChannel.sendMessageToUser({ type: MESSAGE_TYPES.TEXT, speech: apiairesponse.result.fulfillment.speech }, apiairesponse.sessionId);
        }
    }
}

const handleInboundChannelMessage = (message) => {
    getSessionByChannelEvent(message)
        .then((session) => {
            console.log("session", session, "sessionsManager.handleInboundChannelMessage: " + JSON.stringify(message));
            if (message.quick_reply) {
                return session.apiaiAgent.sendTextMessageToApiAi(unescape(message.quick_reply.payload), session.sessionId);
            }
            // send message to api.ai
            console.log("session", session, "sessionsManager.handleInboundChannelMessage: sending message to api.ai: " + JSON.stringify(message));
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
        console.log("sessionManager: couldn't find sessiosn for user channel ID: " + userChannelId)
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
            session.externalIntegrations.push(event.data)
            userChannelToSessions[event.data.userId] = session /// do we need that?
            actionsManager.handleAction("accountLinked", event.data, session)
            break;
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
module.exports.CHANNELS = CHANNELS;
module.exports.handleEventBySessionId = handleEventBySessionId;
module.exports.handleEventByUserChannelId = handleEventByUserChannelId;
module.exports.setSessionPhone = setSessionPhone;
module.exports.initialize = initialize;