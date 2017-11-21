// code was inspired from https://github.com/fbsamples/messenger-platform-samples

module.exports = {};
require('log-timestamp');

const utility = require('./utility');
const sessionsManager = require('../../sessionsManager');

// Arbitrary value used to validate a messenger webhook
const MESSENGER_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;
const MESSENGER_PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN

var startChannel= () => {
	console.log("Facebook Messenger Channel started")
}

var sendMessage = function (messageObj, session) {
	console.log("MESSAGE: ", messageObj);

	switch (messageObj.type) {
	case sessionsManager.MESSAGE_TYPES.TEXT:
		utility.sendTextMessage(session.source, messageObj.speech, MESSENGER_PAGE_ACCESS_TOKEN);
		break;
	case sessionsManager.MESSAGE_TYPES.QUICK_REPLY:
		utility.sendQuickReply(session.source, messageObj.title, messageObj.replies, MESSENGER_PAGE_ACCESS_TOKEN);
		break;
	case sessionsManager.MESSAGE_TYPES.IMAGE:
		utility.sendImageMessage(session.source, messageObj.imageUrl, MESSENGER_PAGE_ACCESS_TOKEN);
		break;
	case sessionsManager.MESSAGE_TYPES.CARD:
		utility.sendGenericMessage(session.source, messageObj.title, messageObj.subtitle, messageObj.imageUrl, messageObj.buttons, MESSENGER_PAGE_ACCESS_TOKEN);
		break;
	case sessionsManager.MESSAGE_TYPES.CUSTOME:
		utility.sendCustomMessage(session.source, messageObj.payload.facebook, MESSENGER_PAGE_ACCESS_TOKEN);
		break;
	}
};

var handleInboundEvent = function (req, res) {
	if (req.method == 'GET') {
		req.appSecret = MESSENGER_VERIFY_TOKEN
		utility.verifySubscription(req, res)
	}
	else  if (req.method === 'POST') {
		handlePostRequest(req, res)
	}
}

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
const handlePostRequest = (req, res) => {
	var data = req.body;
	try {
		// Make sure this is a page subscription
		if (data && data.object && data.object == 'page') {
			// Iterate over each entry
			// There may be multiple if batched
			data.entry.forEach( pageEntry => {

				// Iterate over each messaging event
				pageEntry.messaging && pageEntry.messaging.forEach( messagingEvent => {
					if (messagingEvent.optin) {
						utility.receivedAuthentication(messagingEvent);
					} else if (messagingEvent.message) {
						receivedMessage(messagingEvent);
					} else if (messagingEvent.delivery) {
						utility.receivedDeliveryConfirmation(messagingEvent);
					} else if (messagingEvent.postback) {
						receivedPostback(messagingEvent);
					} else if (messagingEvent.read) {
						utility.receivedMessageRead(messagingEvent);
					} else if (messagingEvent.account_linking) {
						receivedAccountLink(messagingEvent);
					} else {
						console.log("Webhook received unknown messagingEvent: ", messagingEvent);
					}
				});
			});
		}
	}
	catch (e) {
		console.log("INSIDE CATCH KA", e)
	}
	// Assume all went well.
	//
	// You must send back a 200, within 20 seconds, to let us know you've 
	// successfully received the callback. Otherwise, the request will time out.
	res.sendStatus(200);
};


const receivedMessage = (messagingEvent) => {
	if (messagingEvent.message.is_echo) {
		console.log("Messageing Event Echo: ", messagingEvent);
		return;
	}
	if (messagingEvent.message.text) {
		console.log('facebook.webhook.receivedMessage. incoming text message: ' + messagingEvent.message.text + ". From " + messagingEvent.sender.id);
		let inboundMessage = {
			channel: sessionsManager.CHANNELS.FB_MESSENGER,
			source: messagingEvent.sender.id,
			sourceType: sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
			from: messagingEvent.sender.id,
			to: messagingEvent.recipient.id,
			text: messagingEvent.message.text,
			quick_reply: messagingEvent.message.quick_reply
		};

		sessionsManager.handleInboundChannelMessage(inboundMessage);
	}
	else if (messagingEvent.message.attachments) {
		console.log("facebook.webhook.receivedMessage. incoming attachments");
		messagingEvent.message.attachments.forEach(function (attachment) {
			switch (attachment.type) {
			default:
				console.log("facebook.webhook.receivedMessage. attachment " + attachment.type + " unhandled");
				break;
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
	let payload = messagingEvent.postback.payload;
	let inboundPostbackMessage = {
		channel: sessionsManager.CHANNELS.FB_MESSENGER,
		sourceType: sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
		source: messagingEvent.sender.id,
		from: messagingEvent.sender.id,
		to: messagingEvent.recipient.id,
		payload: payload
	};

	/// TODO: promisfy this to send the 200 response back as quickly as possible
	sessionsManager.handleInboundChannelPostback(inboundPostbackMessage);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
const receivedAccountLink = (event) => {
	var senderID = event.sender.id;
	var accountLinkedEventData = {}
	/// status can be either "linked" or "unlinked"
	var status = event.account_linking.status;
	let authCode = event.account_linking.authorization_code

	console.log("Received account link event with for user %d with status %s " + "and auth code %s ", senderID, status, authCode);
  
	if ( status==="linked") {
		try {
			let authCodeObj = JSON.parse(authCode)
			accountLinkedEventData.accessToken = authCodeObj.accessToken
			accountLinkedEventData.refreshToken = authCodeObj.refreshToken
			accountLinkedEventData.expires_at = authCodeObj.expires_at
			accountLinkedEventData.integrationName = authCodeObj.integrationName
			accountLinkedEventData.userId = authCodeObj.userId
      
			sessionsManager.handleEventByUserChannelId(senderID, 
				{ type: sessionsManager.EVENTS.ACCOUNT_LINKED, 
					channel: sessionsManager.CHANNELS.FB_MESSENGER,
					data: accountLinkedEventData})
      
		}
		catch (err) {
			console.log("receivedAccountLink, couldn't parse authorization code: ", err)
		} 
	}
}

const getUserProfile = (userId) => {
	return utility.getUserProfile(userId, "first_name,last_name,profile_pic,locale,timezone,gender,is_payment_enabled", MESSENGER_PAGE_ACCESS_TOKEN)
}

const sendProfileApiBatch = (profile, path) => {
	utility.sendProfileApiBatch(profile, path, MESSENGER_PAGE_ACCESS_TOKEN)
}

module.exports.handleInboundEvent = handleInboundEvent;
module.exports.sendMessage = sendMessage;
module.exports.getUserProfile = getUserProfile;
module.exports.startChannel = startChannel
module.exports.sendProfileApiBatch = sendProfileApiBatch