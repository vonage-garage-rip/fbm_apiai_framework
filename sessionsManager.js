module.exports = {};

const moment = require('moment');

const EVENTS = {
    BOT_GET_STARTED_PAYLOAD: "BOT_BOT_GET_STARTED_PAYLOAD"
};

module.exports.EVENTS = EVENTS;

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


const fbChannel = require('./channels/facebook/webhook');
const fbUtility = require('./channels/facebook/utility');

/// TODO clean sessions that were not active for a certain duration
var chatSessions = {};
var userChannelToChatSessions = {}; // channels from user are pointing to chat sessions

const inboundFacebookEvent = (req, res) => {
    fbChannel.handleInboundEvent(req, res);
}

const getSessionBySessionId = sessionId => {
    return chatSessions[sessionId];
}

const setSessionPhone = (sessionId, phone) => {
    chatSessions[sessionId].phone = phone;
}

/*
 * Return new or existing chat session Object.
 * 
 * Chat sessions are mapped by session ID. Since more than one
 *   channel can be mapped to a session, we use userChannelToChatSessions 
 *   which is mapped by sender ID of the channel (msisdn for SMS, 
 *   pageID for Facebook).
 * To add a new channel to an existing session, an empty channel
 *   object for that channel should aleady have been created in 
 *   the session and userChannelToChatSessions[sender] is pointing 
 *   to the existing session.
 */
var getSessionByChannelEvent = (messagingEvent) => {
    return new Promise(function (resolve) {

        mappedChatSession = userChannelToChatSessions[messagingEvent.from]
        if (mappedChatSession) {
            mappedChatSession.lastInboundMessage = moment();
            return resolve(mappedChatSession);
        }
        else {
            // Set new session 
            let sessionId = uuidv4();
            mappedChatSession = chatSessions[sessionId] = {
                sessionId: sessionId,
                profile: {},
                userId: messagingEvent.from,
                lastInboundMessage: moment(),
                data: {}
            }
            userChannelToChatSessions[messagingEvent.from] = mappedChatSession;
            fbUtility.getUserProfile(messagingEvent.from)
                .then(json => {
                    console.log("user profile:" + JSON.stringify(json));
                    mappedChatSession.profile = json;
                    return resolve(mappedChatSession);
                })
                .catch(err => {
                    console.log("sessionManaer.getSessionByChannelEvent caught an error: " + err);
                    return resolve(mappedChatSession);
                })
        }
    });
}



const handleInboundChannelMessage = (message) => {
    getSessionByChannelEvent(message)
        .then((session) => {
            console.log("session", session, "sessionsManager.handleInboundChannelMessage: " + JSON.stringify(message));
            if (message.text==="link") {
                fbUtility.sendAccountLinking(message.from)
            }
        })
        .catch(err => {
            console.log("sessionsManager.handleInboundChannelMessage caught an error: " + err);
        });
}

const handleInboundChannelPostback = (message) => {
    getSessionByChannelEvent(message)
        .then(session => {
            console.log("session", session, "sessionsManager.handleInboundChannelPostback: " + JSON.stringify(message));            
            handleEvent(session.sessionId, message.payload);
        })
        .catch(err => {
            console.log("sessionsManager.handleInboundChannelPostback caught an error: " + err);
        });
}

const handleEvent = (sessionId, event) => {
    let session = getSessionBySessionId(sessionId);
    
    switch (event.type) {
        case EVENTS.BOT_BOT_GET_STARTED_PAYLOAD:
            break;
    }
}


module.exports.handleInboundChannelPostback = handleInboundChannelPostback;
module.exports.handleInboundChannelMessage = handleInboundChannelMessage;
module.exports.getSessionBySessionId = getSessionBySessionId;
module.exports.getSessionByChannelEvent = getSessionByChannelEvent;
module.exports.inboundFacebookEvent = inboundFacebookEvent;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
module.exports.handleEvent = handleEvent;


