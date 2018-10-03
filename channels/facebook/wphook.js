/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

"use strict"

const sessionsManager = require("../../sessionsManager")
const utility = require("./utility")
const firebaseDatabase = require("../../DB/firebase").firebaseDatabase
const tokenDBClass = require("../../DB/tokenDB")
var tokenDB = new tokenDBClass(firebaseDatabase)


// Arbitrary value used to validate a workplace webhook
const WORKPLACE_VERIFY_TOKEN = process.env.WORKPLACE_VERIFY_TOKEN
const WORKPLACE_PAGE_ACCESS_TOKEN = process.env.WORKPLACE_PAGE_ACCESS_TOKEN

var community

var startChannel= () => {
	console.log("Facebook Workplace Channel started")
}

var handleInboundEvent = function (req, res) {
	if (req.method == "GET") {
		req.appSecret = WORKPLACE_VERIFY_TOKEN
		utility.verifySubscription(req, res)
	}
	else if (req.method === "POST") {
		handlePostRequest(req, res)
	}
}

var handleInboundInstallEvent = function (req, res) {
	return handleInstallEvent(req, res)
}
var handleInboundUninstallEvent = function (req, res) {
	if (req.method == "GET") {
		req.appSecret = WORKPLACE_VERIFY_TOKEN
		utility.verifySubscription(req, res)
	}
	else if (req.method === "POST") {
		handleUninstallEvent(req, res)
	}
}

/*
 * All callbacks for webhooks are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks.
 *
 * On Workplace, webhooks can be sent for 'page', 'group' and
 * 'workplace_security' objects:
 *
 * 'Page' webhooks relate to page messages or mentions, where the page ID is
 * the ID of the bot the user is interacting with.
 *
 * 'Group' webhooks relate to updates in a specific Workplace group, including
 * posts, comments and group membership changes.
 *
 * 'Workplace Security' webhooks relate to security-specific events in
 * Workplace, including login, logout, password changes etc.
 *
 * https://developers.facebook.com/docs/workplace/integrations/custom-integrations/webhooks
 *
 */
const handlePostRequest = (req, res) => {
	try {
		console.log("handlePostRequest started")
		var data = req.body
		// On Workplace, webhooks can be sent for page, group, user and
		// workplace_security objects
		switch (data.object) {
		case "page":
			processPageEvents(data)
			break
		case "group":
			processGroupEvents(data)
			break
		case "user":
			processUserEvents(data)
			break
		case "workplace_security":
			processWorkplaceSecurityEvents(data)
			break
		default:
			console.log("Unhandled Webhook Object", data.object)
		}
	} catch (error) {
		// Write out any exceptions for now
		console.error("handlePostRequest caught an error: " + error)
	} finally {
		// Always respond with a 200 OK for handled webhooks, to avoid retries
		// from Facebook
		/// TODO we should find a way to return this quicker rather than waiting for handling to complete
		let send200Result = res.sendStatus(200)
		console.log("handlePostRequest finished. call to res.sendStatus(200) returned status code", send200Result.statusCode)
		
	}
}

function processPageEvents(data) {
	// Iterate over each entry
	// There may be multiple if batched
	data.entry.forEach(pageEntry => {
		var pageID = pageEntry.id
		//var timeOfEvent = pageEntry.time;

		// Iterate over each messaging event
		if (pageEntry.messaging) {
			pageEntry.messaging.forEach(messagingEvent => {
				console.log("received event",messagingEvent)
				if (messagingEvent.message) {
					receivedMessage(messagingEvent, pageID)
				} else if (messagingEvent.delivery) {
					utility.receivedDeliveryConfirmation(messagingEvent)
				} else if (messagingEvent.postback) {
					receivedPostback(messagingEvent)
				} else if (messagingEvent.read) {
					utility.receivedMessageRead(messagingEvent)
				} else {
					console.log("Webhook received unknown messagingEvent: ", messagingEvent)
				}
			})
		} else if (pageEntry.changes) {
			pageEntry.changes.forEach(function (change) {
				console.log("Page Change", pageID, change)
				let inboundMessage = {
					channel: sessionsManager.CHANNELS.FB_WORKPLACE,
					sourceType: sessionsManager.SOURCE_TYPE.POST,
					source: change.value.post_id,
					from: change.value.sender_id || change.value.from.id, 
					to: pageID,
					text: change.value.message.substring(change.value.message.indexOf(" ") + 1)
				}

				if (process.env.WP_PRODUCTION) {
					inboundMessage.community = change.value.community.id
					console.log("inboundMessage.community ", inboundMessage.community);

				}

				sessionsManager.handleInboundChannelMessage(inboundMessage)
			})
		}
	})
}

const handleInstallEvent = (req, res) => {
	return new Promise((resolve, reject) => {
		
		if (!req.query.code && !req.params['code']) {
			console.error('No code received.')
			reject()
			return
		}
		var _json;
		var code = req.query.code
		if (req.params['code']) {
			code = req.params['code'].replace("code=", "")
		}
		utility.getAccessToken(req.query.code)
			.then((accessToken) => {
				return utility.getCompany(accessToken)
			}).then((json) => {
				return tokenDB.saveAccessToken(json)
			}).then((json) => {
				console.log("saving access token", json['access_token'])
				_json = json
				const profile = require('../../../profile').profile
				return sendProfileApiBatch(profile, "me/messenger_profile", json['access_token']) 
			}).then(() => {
				resolve(_json)
			}).catch(error => {
				reject(error)
			})
	});
}

const handleUninstallEvent = (req, res) => {
	//TODO wating on implmention from FB
	console.log("Uninstalled")
	res.send(200)
}

const receivedMessage = (messagingEvent, pageID) => {
	console.log("receivedMessage", messagingEvent)
	if (messagingEvent.message.is_echo) {
		console.log("Messageing Event Echo: ", messagingEvent)
		return
	}
	if (messagingEvent.message.text) {
		console.log("facebook.webhook.receivedMessage. incoming text message: " + messagingEvent.message.text + ". From " + messagingEvent.sender.id)
		let inboundMessage = {
			channel: sessionsManager.CHANNELS.FB_WORKPLACE,
			sourceType: messagingEvent.thread ? sessionsManager.SOURCE_TYPE.GROUP_CHAT : sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
			source: messagingEvent.thread ? messagingEvent.thread.id : messagingEvent.sender.id,
			from: messagingEvent.sender.id,
			to: pageID,
			text: messagingEvent.message.text
		}

		if (process.env.WP_PRODUCTION) {
			inboundMessage.community = messagingEvent.sender.community.id
			console.log("inboundMessage.community ", inboundMessage.community);
		}

		sessionsManager.handleInboundChannelMessage(inboundMessage)
	}
	else if (messagingEvent.message.attachments) {
		console.log("facebook.webhook.receivedMessage. incoming attachments")
		messagingEvent.message.attachments.forEach(function (attachment) {
			switch (attachment.type) {
			default:
				console.log("facebook.webhook.receivedMessage. attachment " + attachment.type + " unhandled")
				break
			}
		})
	}
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
const receivedPostback = (messagingEvent) => {
	let payload = messagingEvent.postback.payload

	let inboundPostbackMessage = {
		channel: sessionsManager.CHANNELS.FB_WORKPLACE,
		sourceType: messagingEvent.thread ? sessionsManager.SOURCE_TYPE.GROUP_CHAT : sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
		source: messagingEvent.thread ? messagingEvent.thread.id : messagingEvent.sender.id,
		from: messagingEvent.sender.id,
		to: messagingEvent.recipient.id,
		payload: payload,
		
	}
	if (process.env.WP_PRODUCTION) {
		inboundPostbackMessage.community = messagingEvent.sender.community.id
		console.log("inboundPostbackMessage.community ", inboundPostbackMessage.community);
	}

	/// TODO: promisfy this to send the 200 response back as quickly as possible
	sessionsManager.handleInboundChannelPostback(inboundPostbackMessage)
}

function processGroupEvents(data) {
	data.entry.forEach(function (entry) {
		let group_id = entry.id
		entry.changes.forEach(function (change) {
			console.log("Group Change", group_id, change)
		})
	})
}

function processUserEvents(data) {
	data.entry.forEach(function (entry) {
		let group_id = entry.id
		entry.changes.forEach(function (change) {
			console.log("User Change", group_id, change)
		})
	})
}

function processWorkplaceSecurityEvents(data) {
	data.entry.forEach(function (entry) {
		let group_id = entry.id
		entry.changes.forEach(function (change) {
			console.log("Workplace Security Change", group_id, change)
		})
	})
}

function sendMessage(messageObj, session) {

	var accessToken = WORKPLACE_PAGE_ACCESS_TOKEN
	if (process.env.WP_PRODUCTION && session.communityAccessToken) {
		accessToken = session.communityAccessToken
	}

	if (session.sourceType) {
		switch (session.sourceType) {
		case sessionsManager.SOURCE_TYPE.POST:
			sendCommentToPost(session.source, messageObj.speech, accessToken) // post ID
			break
		case sessionsManager.SOURCE_TYPE.GROUP_CHAT:
			sendTextMessageToExistingGroup(session.source, messageObj.speech, accessToken) // thread ID
			break
		case sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT:

			//HANDLE MANY TYPES OF FB MESSAGES [TEXT, QUICK REPLY, IMAGE, CARD, CUSOTME].
			switch (messageObj.type) {
			case sessionsManager.MESSAGE_TYPES.TEXT:
				utility.sendTextMessage(session.source, messageObj.speech, accessToken)
				break
			case sessionsManager.MESSAGE_TYPES.QUICK_REPLY:
				utility.sendQuickReply(session.source, messageObj.title, messageObj.replies, accessToken)
				break
			case sessionsManager.MESSAGE_TYPES.IMAGE:
				utility.sendImageMessage(session.source, messageObj.imageUrl, accessToken)
				break
			case sessionsManager.MESSAGE_TYPES.CARD:
				utility.sendGenericMessage(session.source, messageObj.title, messageObj.subtitle, messageObj.imageUrl, messageObj.buttons, accessToken)
				break
			case sessionsManager.MESSAGE_TYPES.CUSTOME:
				utility.sendCustomMessage(session.source, messageObj.payload.facebook, accessToken)
				break
			}
			break
		}
	}
}

function sendNewPostToGroup(groupId, message, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN ) {
	return utility.sendNewPostToGroup(groupId, message, accessToken)
}

function sendCommentToPost(postId, message, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN ) {
	return utility.sendCommentToPost(postId, message, accessToken)
}

function sendTextMessageToExistingGroup(threadId, message, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN) {
	return utility.sendNewPostToGroup(threadId, message, accessToken)
}

const getUserProfile = (userId, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN) => {
	return utility.getUserProfile(userId, "first_name, last_name, email", accessToken)
}

const sendProfileApiBatch = (profile, path, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN) => {
	utility.sendProfileApiBatch(profile, path, accessToken)
}
const getProfileApiBatch = (keys, path, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN) => {
	return utility.getProfileApiBatch(keys, path, accessToken)
}


const getCommunity = (accessToken = WORKPLACE_PAGE_ACCESS_TOKEN) => {
	return new Promise( resolve => {
		if ( community ) { 
			resolve(community)
		}
		else {
			return utility.getCommunity(accessToken)
				.then(communityResult => {
					community = communityResult
					resolve(community)
				})
		}
	})
}
const getGroupInfo = (groupId, accessToken = WORKPLACE_PAGE_ACCESS_TOKEN) => {
	return new Promise( resolve => {
	utility.getGroupInfo(groupId, accessToken)
		.then(groupInfo => {
			resolve(groupInfo)
		})
	})
}

const webhookSubscribe = () => {
	utility.webhookSubscribe()
}

const generateProof = (accessToken) => {
	return utility.generateProof(accessToken)
}

const parseSignedRequest = (signedRequest) => {
	return utility.parseSignedRequest(signedRequest)
}

module.exports.handleInboundEvent = handleInboundEvent
module.exports.handleInboundInstallEvent = handleInboundInstallEvent
module.exports.handleInboundUninstallEvent = handleInboundUninstallEvent

module.exports.sendMessage = sendMessage
module.exports.sendNewPostToGroup = sendNewPostToGroup
module.exports.getUserProfile = getUserProfile
module.exports.startChannel = startChannel
module.exports.sendProfileApiBatch = sendProfileApiBatch
module.exports.getProfileApiBatch = getProfileApiBatch

module.exports.getCommunity = getCommunity
module.exports.getGroupInfo = getGroupInfo
module.exports.webhookSubscribe = webhookSubscribe
module.exports.generateProof = generateProof
module.exports.parseSignedRequest = parseSignedRequest