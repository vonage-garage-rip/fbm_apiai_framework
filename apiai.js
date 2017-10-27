var apiai = require('apiai');
const sessionsManager = require('./sessionsManager');

var apiaiAgents ={}

class ApiAi {
    constructor (apiaiToken) {
        this.app = apiai(apiaiToken);
    }

    sendTextMessageToApiAi(textMessage, sessionId) {
        var self = this
        return new Promise(function(resolve, reject) {
            let session = sessionsManager.getSessionBySessionId(sessionId);
            let userProfileContext = {
                "name": "user-profile",
                "parameters": {
                    "full_name": session.profile.first_name + " " + session.profile.last_name,
                    "first_name": session.profile.first_name,
                    "last_visit": session.lastInboundMessage.format()
                },
                "lifespan": 5
            };
            var request = self.app.textRequest(textMessage, {sessionId: sessionId, contexts: [userProfileContext], timezone: session.profile.timezone});

            request.on('response', function(response) {
                console.log("sendTextMessageToApiAi: response=" + JSON.stringify(response));
                return resolve(response);
            });

            request.on('error', function(error) {
                return reject(error);
            });

            request.end();
        });
    }

    sendEventToApiAi(event, sessionId) {
        var self = this
        return new Promise(function(resolve, reject) {
            let session = sessionsManager.getSessionBySessionId(sessionId);
            let userProfileContext = {
                "name": "user-profile",
                "parameters": {
                    "full_name": session.profile.first_name + " " + session.profile.last_name,
                    "first_name": session.profile.first_name,
                    "last_visit": session.lastInboundMessage.format(),
                },
                "lifespan": 5
            };
            let eventArg = {
                "name": event.type,
                "data": event.data, 
            };

            var request = self.app.eventRequest(eventArg, {sessionId: sessionId, contexts: [userProfileContext]});

            request.on('response', function(response) {
                console.log("sendEventToApiAi: response=" + JSON.stringify(response));
                return resolve(response);
            });

            request.on('error', function(error) {
                return reject(error);
            });

            request.end();
        });
    }
}

const getAgent = (apiaiToken) => {
    if (!apiaiAgents[apiaiToken]) {
        apiaiAgents[apiaiToken] = new ApiAi(apiaiToken)
    }
    return apiaiAgents[apiaiToken]
}

module.exports = {getAgent}
