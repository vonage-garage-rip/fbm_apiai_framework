//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
console.log("here");
const sessionsManager = require("../../sessionsManager.js");
const apiai = require("../../apiai.js");
console.log("there", apiai);
//Dependencies
const session = require('./dependencies/session');
const apiaiMsg = require('./dependencies/message');
const expect = require("chai").expect;
const assert = require('assert');
const nock = require('nock');

describe('*****ApiAi Test Suite: ', function() {
    beforeEach(() => {
    nock('https://api.dialogflow.com/v1/')
      .post('/query/?v=20150910')
      .reply(200, apiaiMsg);
  });

  describe('Function: sendTextMessageToApiAi() ', function() {
    it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
      // sessionsManager.handleInboundChannelPostback();
    });
  });
});