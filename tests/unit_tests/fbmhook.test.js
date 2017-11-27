require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
//Dependencies
const expect = require("chai").expect;
const assert = require('assert');
const apiAi = require('../../apiai');
const firebase = require('./../../DB/firebase');
const fbmCh = require('./../../channels/facebook/fbmhook');

const nock = require('nock')

describe('*****FBMHook Test Suite: ', function () {
    var agent

    before(() => {
        // runs before each test in this block
        // sessionsManager.initializeDb(firebase);
    });

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




    describe('Function: getUserProfile() ', function () {

        const mockProfileResponse =  {
            "first_name": "Tony",
            "last_name": "Hung",
            "locale": "en_US",
            "id": "46301265",
            "profile_pic":"http://example.com",
            "timezone":-5,
            "gender":"m",
            "is_payment_enabled":true
          }

        it('should get User profile', function() {
            nock('https://graph.facebook.com:443/v2.10/1234')
            .get('')
            .query({fields: 'first_name,last_name,profile_pic,locale,timezone,gender,is_payment_enabled', 'access_token': "undefined"})
            .reply(200, mockProfileResponse)
            .log(function (out) {
                console.log(out)
            })

            fbmCh.getUserProfile("1234")
            .then(function (result) {
                expect(result['first_name']).to.equal(mockProfileResponse['first_name'])
                expect(result['last_name']).to.equal(mockProfileResponse['last_name'])
                expect(result['profile_pic']).to.equal(mockProfileResponse['profile_pic'])
                expect(result['locale']).to.equal(mockProfileResponse['locale'])
                expect(result['timezone']).to.equal(mockProfileResponse['timezone'])
                expect(result['gender']).to.equal(mockProfileResponse['gender'])
                expect(result['is_payment_enabled']).to.equal(mockProfileResponse['is_payment_enabled'])
            })
        })

        it('should get fail getting user profile', function() {
            nock('https://graph.facebook.com:443/v2.10/1234')
            .get('')
            .query({fields: 'first_name,last_name,profile_pic,locale,timezone,gender,is_payment_enabled', 'access_token': "undefined"})
            .reply(500)
            .log(function (out) {
                console.log(out)
            })
            
            fbmCh.getUserProfile("1234")
            .then(function (){
                    
            })
            .catch(function (error) {
                expect(error).to.exist;
            })
        })
    });

    describe('Function sendMessage() ', function() {

        it ('sends a text message', function () {
            var messageObjTextMock = {
                type:sessionsManager.MESSAGE_TYPES.TEXT,
                speech:"Test 1234"
            }
            var sessionMock = {
                source:"recipient_id"
            }

            var mockTextMessageResponse = {
                message_id:"123",
                recipient_id:"recipient_id"
            }
            nock('https://graph.facebook.com:443/v2.10/me/messages')
            .post('')            
            .query({access_token:"undefined"})
            .reply(200, mockTextMessageResponse)
            .log(function (out) {
                console.log(out)
            })

            fbmCh.sendMessage(messageObjTextMock, sessionMock)
            .then(function (result) {
                console.log("result", result);
                expect(result['recipient_id']).to.equal(mockTextMessageResponse['recipient_id'])
            })
            .catch(function () {

            })
        })

        it ('sends a QUICK_REPLY message', function () {

        })
      

    })

});