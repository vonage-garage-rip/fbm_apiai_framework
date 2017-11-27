//Loads all .env variables into PROCESS.ENV
require("dotenv").config()
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager.js")
const apiai = require("../../apiai.js")
//Dependencies
const channelTest = require("./dependencies/inboundEvents/channelTest")
const apiaiMsg = require("./dependencies/apiAiResponse")
const firebaseAdmin = require("./dependencies/firebase")
const expect = require("chai").expect

describe("*****ApiAi Test Suite: ", function() {
	var agent

	before(() => {
		// runs before each test in this block
		sessionsManager.initializeDb(firebaseAdmin)
	})

	beforeEach(() => {
		// runs for each test before each test in this block
		agent = apiai.getAgent(process.env.APIAI_TOKEN)
	})

	describe("Function: getAgent() ", function() {
		it("should get return an apiai agent", function() {
			expect(agent.app.hostname).to.equal("api.api.ai")
		})
	})


	describe("Function: sendTextMessageToApiAi() ", function() {
		it("should get session, sendTextMessageToApiAi, then handleApiaiResponse ", function() {
			return sessionsManager.getSessionByChannelEvent(channelTest).then(function(session) {
				return agent.sendTextMessageToApiAi("This is a test.", session.sessionId).then(function(apiAiresponse) {
					expect(apiAiresponse).to.exist
					expect(apiAiresponse.result.resolvedQuery).to.equal("This is a test.")
				})
			})
		})
	})

	describe("Function: sendEventToApiAi() ", function() {
		it("should get session, sendEventToApiAi, then handleApiaiResponse ", function() {
			return sessionsManager.getSessionByChannelEvent(channelTest).then(function(session) {
				return agent.sendEventToApiAi(channelTest, session.sessionId).then(function(apiAiresponse) {
					expect(apiAiresponse).to.exist
					expect(apiAiresponse.result.resolvedQuery).to.equal("FB_WORKPLACE")
				})
			})
		})
	})
})