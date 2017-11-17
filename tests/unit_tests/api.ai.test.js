//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
const apiai = require("../../apiai.js");
//Dependencies
const messageEvent = require('./dependencies/messageEvent');
const apiaiMsg = require('./dependencies/apiAiResponse');
const firebaseAdmin = require('./dependencies/firebase')
const expect = require("chai").expect;
const assert = require('assert');
const nock = require('nock');

describe('*****ApiAi Test Suite: ', function() {
    var agent;

    beforeEach(() => {
        agent = apiai.getAgent(process.env.APIAI_TOKEN);
    });

    describe('Function: getAgent() ', function() {
        it('should get return an apiai agent', function() {
            expect(agent.app.hostname).to.equal('api.api.ai');
        });
    });


    describe('Function: sendTextMessageToApiAi() ', function() {
        before(() => {
            nock('https://api.dialogflow.com/v1/')
                .post('/query')
                .reply(200, apiaiMsg);

            sessionsManager.initializeDb(firebaseAdmin);
        });
        it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
            return sessionsManager.getSessionByChannelEvent(messageEvent).then(function(session) {
                return agent.sendTextMessageToApiAi("This is a test.", session.sessionId).then(function(apiAiresponse) {
                    expect(apiAiresponse).to.exist;
                    expect(apiAiresponse.result.resolvedQuery).to.equal("This is a test.");
                });
            })
        })
    });
});