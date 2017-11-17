//Loads all .env variables into PROCESS.ENV
require('dotenv').config();
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js");
//Dependencies
const expect = require("chai").expect;
const assert = require('assert');

describe('*****SessionsManager Test Suite: ', function() {
  beforeEach(() => {
    // runs before each test in this block
    var message = {};
    var session = {};
  });

  describe('Function: handleInboundChannelPostback() ', function() {
    it('should get session, sendTextMessageToApiAi, then handleApiaiResponse ', function() {
      // sessionsManager.handleInboundChannelPostback();
    });
  });
});