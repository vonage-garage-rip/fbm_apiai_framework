//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
//Dependencies
const expect = require("chai").expect;
const assert = require('assert');
const apiAi = require('../../apiai');
const firebaseAdmin = require('./dependencies/firebase');


describe('*****SessionsManager Test Suite: ', function() {
    var agent

    before(() => {
        // runs before each test in this block
        sessionsManager.initializeDb(firebaseAdmin);
    });

    beforeEach(() => {
        // runs before each test in this block
        agent = apiAi.getAgent(process.env.APIAI_TOKEN);
    });

    describe('Function: initializeDB() ', function() {
        it('should have an initialized DB', function() {
            var db = sessionsManager.returnDb();
            expect(db).to.exist;
        });
    });

    describe('Function: initializeChannels() ', function() {
        it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
            // sessionsManager.handleInboundChannelPostback();
        });
    });
});