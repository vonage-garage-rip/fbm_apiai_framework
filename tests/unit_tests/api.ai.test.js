//Loads all .env variables into PROCESS.ENV
require("dotenv").config({path: "../.env"})
//Main Target File TO TEST
const sessionsManager = require("../../sessionsManager")
const apiai = require("../../apiai.js")
const firebaseDatabase = require("../../DB/firebase").firebaseDatabase
//Dependencies
const channelTest = require("./dependencies/inboundEvents/wpChannelTest")
const workplaceChannel = require("./../../channels/facebook/wphook")
const expect = require("chai").expect
const describe = require("mocha").describe
const before = require("mocha").before
const beforeEach = require("mocha").beforeEach
const it = require("mocha").it

describe("*****ApiAi Test Suite: ", function() {
	var agent

	before(() => {
		// runs before each test in this block
		sessionsManager.setDB(firebaseDatabase)
		sessionsManager.setChannel(sessionsManager.CHANNELS.FB_WORKPLACE, workplaceChannel, process.env.APIAI_TOKEN)
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
			return sessionsManager.getSessionByChannelEvent(channelTest)
				.then( session => {
					return agent.sendTextMessageToApiAi("This is a test.", session.sessionId)
						.then( apiAiresponse => {
							expect(apiAiresponse).to.exist
							expect(apiAiresponse.result.resolvedQuery).to.equal("This is a test.")
						})
				})
		})
	})

	describe("Function: sendEventToApiAi() ", function() {
		it("should get session, sendEventToApiAi, then handleApiaiResponse ", function() {
			return sessionsManager.getSessionByChannelEvent(channelTest)
				.then( session => {
					return agent.sendEventToApiAi(channelTest, session.sessionId)
						.then( apiAiresponse => {
							expect(apiAiresponse).to.exist
							expect(apiAiresponse.result.resolvedQuery).to.equal("FB_WORKPLACE")
						})
				})
		})
	})
})