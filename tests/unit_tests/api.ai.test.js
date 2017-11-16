//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
const apiai = require("../../apiai.js");
//Dependencies
const session = require('./dependencies/session');
const apiaiMsg = require('./dependencies/message');
const expect = require("chai").expect;
const assert = require('assert');
const nock = require('nock');

describe('*****ApiAi Test Suite: ', function() {
    describe('Function: getAgent() ', function() {
      var agent;
        
        before(() => {
          agent = apiai.getAgent(process.env.APIAI_TOKEN);
        });

        it('should get return an apiai agent', function() {
          expect(agent.app.hostname).to.equal('api.api.ai');
        });
    });


    describe('Function: sendTextMessageToApiAi() ', function() {
        before(() => {
            nock('https://api.dialogflow.com/v1/')
                .post('/query/?v=20150910')
                .reply(200, apiaiMsg);
        });

        it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
            // sessionsManager.handleInboundChannelPostback();
        });
    });
});