//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
const apiai = require("../../apiai.js");
//Dependencies
const channelTest = require('./dependencies/inboundEvents/channelTest');
const apiaiMsg = require('./dependencies/apiAiResponse');
const firebase = require('./../../DB/firebase');
const expect = require("chai").expect;
const assert = require('assert');
const workplace = require("./../../channels/facebook/wphook")

describe('*****ApiAi Test Suite: ', function() {
    var agent;

    before(() => {
        // runs for each test before each test in this block
        sessionsManager.setChannel(channelTest.channel, workplace, process.env.APIAI_TOKEN);
        agent = sessionsManager.getApiAiAgent(channelTest.channel);
        const firebaseDatabase = require('../..//DB/firebase').firebaseDatabase
        sessionsManager.setDB(firebaseDatabase);
    });

    describe('Function: getApiAiAgent() ', function() {
        it('should get return an apiai agent', function() {
            expect(agent.app.hostname).to.equal('api.api.ai');
        });
    });


    describe('Function: sendTextMessageToApiAi() ', function() {
        it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
            return sessionsManager.getSessionByChannelEvent(channelTest).then(function(session) {
                return agent.sendTextMessageToApiAi("This is a test.", session.sessionId).then(function(apiAiresponse) {
                    expect(apiAiresponse).to.exist;
                    expect(apiAiresponse.result.resolvedQuery).to.equal("This is a test.");
                });
            })
        })
    });

    describe('Function: sendEventToApiAi() ', function() {
        it('should get session, sendEventToApiAi, then handleApiaiResponse ', function() {
            return sessionsManager.getSessionByChannelEvent(channelTest).then(function(session) {
                return agent.sendEventToApiAi(channelTest, session.sessionId).then(function(apiAiresponse) {
                    expect(apiAiresponse).to.exist;
                    expect(apiAiresponse.result.resolvedQuery).to.equal("FB_WORKPLACE");
                });
            })
        })
    });
});