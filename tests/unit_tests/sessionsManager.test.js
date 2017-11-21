//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
//Dependencies
const expect = require("chai").expect;
const assert = require('assert');
const apiAi = require('../../apiai');
const firebase = require('./../../DB/firebase');
const wpCh = require('./../../channels/facebook/wphook');
const fbmCh = require('./../../channels/facebook/fbmhook');
const httpResponse = require('./dependencies/httpResponse');
const nexmoCh = require('./../../channels/nexmo/nexmohook');
const inboundWorkplaceGETEvent = require('./dependencies/inboundEvents/workplace/inboundWorkplaceGET');
const inboundWorkplacePagePOSTEvent = require('./dependencies/inboundEvents/workplace/inboundWorkplacePagePOST');
const inboundWorkplaceUserPOSTEvent = require('./dependencies/inboundEvents/workplace/inboundWorkplacePagePOST');
const inboundWorkplaceGroupPOSTEvent = require('./dependencies/inboundEvents/workplace/inboundWorkplacePagePOST');
const inboundWorkplaceSecurityPOSTEvent = require('./dependencies/inboundEvents/workplace/inboundWorkplacePagePOST');



describe('*****SessionsManager Test Suite: ', function() {
    var agent

    beforeEach(() => {
        // runs before each test in this block
        agent = apiAi.getAgent(process.env.APIAI_TOKEN);
    });

    // describe('Function: initializeDB() ', function() {
    //     it('should have an initialized DB', function() {
    //         var db = sessionsManager.returnDb();
    //         expect(db).to.exist;
    //     });
    // });

    // describe('Function: initializeChannels() ', function() {

    //     it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
    //         var channels = sessionsManager.initializeChannels(fbmCh, wpCh, nexmoCh);

    //         expect(channels.length).to.equal(3);
    //         for (let channel of channels) {
    //             expect(channel).to.exist;
    //             expect(channel.handleInboundEvent).to.exist;
    //         }
    //     });
    // });

    // describe('Function: inboundFacebookWorkplaceEvent() ', function() {

    //     it('should handle TRUTHY inbound facebook workplace GET events', function() {
    //         var truthyEvent = inboundWorkplaceGETEvent;

    //         sessionsManager.inboundFacebookWorkplaceEvent(truthyEvent, httpResponse);

    //         expect(httpResponse.statusCode).to.equal(200);
    //     });

    //     it('should handle FALSY inbound facebook workplace GET events', function() {
    //         inboundWorkplaceGETEvent.query['hub.mode'] = "test_false_scenario";
    //         var falsyEvent = inboundWorkplaceGETEvent;

    //         sessionsManager.inboundFacebookWorkplaceEvent(falsyEvent, httpResponse);

    //         expect(httpResponse.statusCode).to.equal(403);
    //     });

    //     it('should handle TRUTHY inbound facebook workplace Page POST events', function() {
    //         var truthyEvent = inboundWorkplacePagePOSTEvent;

    //         sessionsManager.inboundFacebookWorkplaceEvent(truthyEvent, httpResponse);

    //         expect(httpResponse.statusCode).to.equal(200);
    //     });
    // });

    // describe('Function: inbound FacebookMessengerEvent() ', function() {

    //     it('should handle inbound facebook messenger events', function() {
    //         // sessionsManager.inboundFacebookMessengerEvent(req, res);

    //         expect(true).to.be.true
    //     });
    // });

    // describe('Function: inbound NexmoEvent() ', function() {

    //     it('should handle inbound Nexmo messenger events', function() {
    //         // sessionsManager.inboundNexmoEvent(req, res);

    //         expect(true).to.be.true
    //     });
    // });
});