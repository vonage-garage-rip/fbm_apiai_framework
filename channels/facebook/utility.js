"use strict"

const
	bodyParser = require("body-parser"),
	crypto = require("crypto"),
	rpn = require("request-promise-native"),
	moment = require("moment")


const AUTHORIZATION_URL = process.env.AUTHORIZATION_URL

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v2.12/"

const PROFILE_API = {
	PERSISTENT_MENU: "persistent_menu",
	GET_STARTED_MESSAGE: "get_started",
	GREETING:"greeting"
}

const sendProfileApiBatch = ( propertyBody, path = "me", accessToken) => {

	var options = {
		method: "POST",
		uri:FACEBOOK_GRAPH_URL+path+"?"+generateProof(accessToken),
		headers: { "Content-Type": "application/json" },
		body: propertyBody,
		json: true // Automatically stringifies the body to JSON
	}
	rpn(options)
		.then( parsedBody => {
			// POST succeeded...
			console.log("sendProfileApiBatch returned: ",parsedBody)
		})
		.catch( err => {
			// POST failed...
			console.log("sendProfileApiBatch returned error: " + err)
		})
}

const getProfileApiBatch = (keys, path = "me", accessToken) => {
	return new Promise(function (resolve, reject) {
		var options = {
			method: "GET",
			uri:FACEBOOK_GRAPH_URL+path+"?fields="+keys+"&"+generateProof(accessToken),

		}
		rpn(options)
			.then( json => {
				console.log("getProfileApiBatch returned: ",json)
				resolve(JSON.parse(json))
			})
			.catch( err => {
				console.log("getProfileApiBatch returned error: " + err)
				reject(err)
			})
		})

}

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
	var signature = req.headers["x-hub-signature"]

	if (!signature) {
		// For testing, let's log an error. In production, you should throw an 
		// error.
		console.error("Couldn't validate the signature.")
	} else {
		var elements = signature.split("=")
		//var method = elements[0];
		var signatureHash = elements[1]
    
		var expectedHash = crypto.createHmac("sha1", req.appSecret)
			.update(buf)
			.digest("hex")

		if (signatureHash != expectedHash) {
			throw new Error("Couldn't validate the request signature.")
		}
	}
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messaging_optins
 *
 */
function receivedAuthentication(event) {
	var senderID = event.sender.id
	var recipientID = event.recipient.id
	var timeOfAuth = event.timestamp

	// The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
	// The developer can set this to an arbitrary value to associate the 
	// authentication callback with the 'Send to Messenger' click event. This is
	// a way to do account linking when the user clicks the 'Send to Messenger' 
	// plugin.
	var passThroughParam = event.optin.ref

	console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
	timeOfAuth)

	// When an authentication is received, we'll send a message back to the sender
	// to let them know it was successful.
	sendTextMessage(senderID, "Authentication successful")
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */

function receivedDeliveryConfirmation(event) {
	//var senderID = event.sender.id
	//var recipientID = event.recipient.id
	var delivery = event.delivery
	var messageIDs = delivery.mids
	//var watermark = delivery.watermark
	//var sequenceNumber = delivery.seq

	if (messageIDs) {
		messageIDs.forEach(function(messageID) {
			console.log("Received delivery confirmation for message ID: %s", messageID)
		})
	}
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
	//var senderID = event.sender.id
	//var recipientID = event.recipient.id

	// All messages before watermark (a timestamp) or sequence have been seen.
	var watermark = event.read.watermark
	var sequenceNumber = event.read.seq

	console.info("Received message read event for watermark %d and sequence " + "number %d", watermark, sequenceNumber)
}

function sendTextMessage(recipientId, text, accessToken) {
	var messageData = {
		messaging_type:"RESPONSE",
		recipient: {
			id: recipientId
		},
		message: {
			text: text,
			metadata: "CHATBOT_METADATA"
		}
	}

	callMessageAPI(messageData, accessToken)
}

/* function sendButtonMessage(recipientId, text, buttons, accessToken) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: text,
					buttons: buttons
				}
			}
		}
	}

	callMessageAPI(messageData, accessToken)
} */

function sendGenericMessage(recipientId, title, subtitle, imageUrl, buttons, accessToken) {
	let element = {
		title: title,
		image_url: imageUrl,
	}
	if (subtitle) element.subtitle = subtitle
	if (buttons && buttons.length > 0) element.buttons = buttons

	var messageData = {
		messaging_type:"RESPONSE",
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "generic",
					elements: [element]
				}
			}
		}
	}

	callMessageAPI(messageData, accessToken)
}

function sendCustomMessage(recipientId, messageObject, accessToken) {
	var messageData = {
		messaging_type:"RESPONSE",
		recipient: {
			id: recipientId
		},
		message: messageObject
	}

	callMessageAPI(messageData, accessToken)
}

function sendQuickReply(recipientId, title, quickReplies, accessToken) {
	var messageData = {
		messaging_type:"RESPONSE",
		recipient: {
			id: recipientId
		},
		message: {
			text: title,
			quick_replies: quickReplies.map( quickReply => {
				if (typeof (quickReply) === "string") {
					return {
						content_type: "text",
						title: quickReply,
						payload: quickReply
					}
				}
				else {
					return quickReply
				}
			})
		}
	}

	callMessageAPI(messageData, accessToken)
}

function sendImageMessage(recipientId, url, accessToken) {
	var messageData = {
		messaging_type:"RESPONSE",
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "image",
				payload: {
					url: url
					/// TODO consider adding is_reusable
				}
			}
		}
	}

	callMessageAPI(messageData, accessToken)
}

/* function sendReadReceipt(recipientId, accessToken) {
	console.log("Sending a read receipt to mark message as seen")

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "mark_seen"
	}

	callMessageAPI(messageData, accessToken)
} 

 function sendTypingOn(recipientId, accessToken) {
	console.log("Turning typing indicator on")

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "typing_on"
	}

	callMessageAPI(messageData, accessToken)
}

function sendTypingOff(recipientId, accessToken) {
	console.log("Turning typing indicator off")

	var messageData = {
		recipient: {
			id: recipientId
		},
		sender_action: "typing_off"
	}

	callMessageAPI(messageData, accessToken)
} */

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId, accessToken) {
	var messageData = {
		messaging_type:"RESPONSE",
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: "Welcome. Link your account.",
					buttons: [{
						type: "account_link",
						url: AUTHORIZATION_URL
					}]
				}
			}
		}
	}

	callMessageAPI(messageData, accessToken)
}

/* function sendTextMessageToExistingGroup(message, threadId, accessToken)
{
	var messageData = {
		recipient: {
			thread_key: threadId
		},
		message: {text: message}
	}

	callMessageAPI(messageData, accessToken)
} */

function callMessageAPI(messageData, accessToken) {
	var options = {
		method: "POST",
		uri: FACEBOOK_GRAPH_URL + "me/messages?"+generateProof(accessToken) ,
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		body: messageData,
		json: true
	}

	rpn(options)
		/* .then( json => {
			var recipientId = json.recipient_id
			var messageId = json.message_id
		}) */
		.catch(err => {
			console.error("Failed calling Send API", err) /// show status code, status message and error
		})
}

/*
 * Call the User Profile API. USER_ID and fields are part of query string.
 */
/// 10/24 passed
function getUserProfile(userId, fields, accessToken) {
	return new Promise(function (resolve, reject) {
		if ( !userId ) {
			return resolve({})
		}

		var options = {
			method: "GET",
			uri: FACEBOOK_GRAPH_URL + userId + "?fields=" + fields + "&"+generateProof(accessToken) ,
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
			json: true
		}
  
		rpn(options)
			.then( json => {
				return resolve(json)
			})
			.catch(err => {
				console.error("facebook/utility getUserProfile caught an error: " + err)
				return reject(err)
			})    
	})
}

var sendNewPostToGroup = (groupId, message, accessToken) => {
	return new Promise(resolve => {
		var options = {
			method: "POST",
			uri: FACEBOOK_GRAPH_URL + groupId + "/feed?" + generateProof(accessToken)+"&message=" + message ,
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}
		rpn(options)
			.then( json => {
				var newPostId = JSON.parse(json).id
				console.log("sendNewPostToGroup: Published post. post ID= " + newPostId)
				return resolve(newPostId)
			})
			.catch(err => {
				console.error("sendNewPostToGroup got an error:", err) /// show status code, status message and error
			})
	})
}

var sendCommentToPost = (postId, message, accessToken) => {
	return new Promise(resolve => {
		var options = {
			method: "POST",
			uri: FACEBOOK_GRAPH_URL + postId + "/comments?"+generateProof(accessToken)+ "&message=" + message ,
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then( json => {
				var commentId = JSON.parse(json).id
				console.log("sendCommentToPost: Published comment. comment ID= " + commentId)
				return resolve(commentId)
			})
			.catch(err => {
				console.error("sendCommentToPost got an error:", err) /// show status code, status message and error
			})
	})
}

var verifyWithChannelAppSecretHandler = (appSecret) => {
	return function(req, res, next) {
		req.appSecret = appSecret
		return bodyParser.json({ verify: verifyRequestSignature })(req, res, next)
	}
}

var verifySubscription = (req, res) => {
	if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === req.appSecret) {
		console.log("Validating webhook")
		res.status(200).send(req.query["hub.challenge"])
	} else {
		console.error("Failed validation. Make sure the validation tokens match.")
		res.sendStatus(403)
	}
}

var getCommunity = (accessToken) => {
	return new Promise( (resolve, reject) => {
		var options = {
			uri: FACEBOOK_GRAPH_URL + "/community?"+generateProof(accessToken),
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then( json => {
				resolve(JSON.parse(json))
			})
			.catch(error => {
				console.error("getCommunity got an error:", error) /// show status code, status message and error
				reject(error)
			})
	})
}

var getMembers = (community_id, next = null, limit, accessToken) => {
	return new Promise( resolve => {
		let fields = "title, department, name, location, locale, email, primary_phone"
		var options = {      
			uri: (next != null) ? next : FACEBOOK_GRAPH_URL + community_id + "/members?limit=" + limit + "&fields=" + fields +"&" + generateProof(accessToken),
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then( json => {
				return resolve(JSON.parse(json))
			})
			.catch(err => {
				console.error("getCommunity got an error:", err) /// show status code, status message and error
			})
	})
}
var webhookSubscribe = () => {
	return new Promise( (resolve, reject) => {
		let access_token = process.env.MESSENGER_APP_ID+"|"+process.env.MESSENGER_APP_SECRET
		let fields = "mention,message_deliveries,messages,messaging_postbacks,message_reads"
		var options = {
			method:"POST",      
			uri: FACEBOOK_GRAPH_URL + 'app/subscriptions?' + "object=page" + "&fields=" + fields + "&access_token=" + access_token + "&include_values=true" + "&verify_token="+process.env.WORKPLACE_VERIFY_TOKEN +"&callback_url=" + process.env.CALLBACK_URL,
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then( json => {
				console.log("webhookSubscribe",json)
				return resolve(JSON.parse(json))
			})
			.catch(err => {
				console.error("webhookSubscribe got an error:", err) /// show status code, status message and error
				reject(err)
			})
	})
}

var getAccessToken = (code) => {

	return new Promise((resolve, reject) => {
		const clientID = process.env.MESSENGER_APP_ID
		const clientSecret = process.env.MESSENGER_APP_SECRET
		const redirectURL = process.env.REDIRECT_URL
		var options = {
			method: "GET",
			uri: FACEBOOK_GRAPH_URL + 'oauth/access_token?' + 'client_id=' + clientID + "&client_secret=" + clientSecret + "&redirect_uri=" + redirectURL + "&code=" + code,
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then(json => {
				json = JSON.parse(json)
				console.log("getAccessToken", json)
				var access_token = json['access_token']
				return resolve(access_token)
			})
			.catch(err => {
				console.error("getAccessToken got an error:", err) /// show status code, status message and error
				reject(err)
			})
	})

}

var getCompany = (accessToken) => {

	return new Promise((resolve, reject) => {
		const clientID = process.env.MESSENGER_APP_ID
		const clientSecret = process.env.MESSENGER_APP_SECRET
		const redirectURL = process.env.REDIRECT_URL
		var options = {
			method: "GET",
			uri: FACEBOOK_GRAPH_URL + 'company?' + "fields=name&" + generateProof(accessToken),
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then(json => {
				json = JSON.parse(json)
				console.log("getCompany", json)
				json['access_token'] = accessToken
				return resolve(json)
			})
			.catch(err => {
				console.error("getCompany got an error:", err) /// show status code, status message and error
				reject(err)
			})
	})

}

var getGroupInfo = (groupId, accessToken) => {
	return new Promise((resolve, reject) => {
		var options = {
			method: "GET",
			uri: FACEBOOK_GRAPH_URL + groupId + "?"+generateProof(accessToken),
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
		}

		rpn(options)
			.then(json => {
				json = JSON.parse(json)
				console.log("getGroupInfo", json)
				return resolve(json)
			})
			.catch(err => {
				console.error("getGroupInfo got an error:", err) /// show status code, status message and error
				reject(err)
			})
	})
}

var parseSignedRequest = (request) => {
	return new Promise((resolve, reject) => {

		// var SignedRequest = require('facebook-signed-request');
		console.log("signedRequest", request)
		// SignedRequest.secret = process.env.MESSENGER_APP_SECRET;
		// var signedRequest = new SignedRequest(request);
		// signedRequest.parse(function (errors, request) {
			
		// 	console.log(request.isValid());
		// 	console.log(request.data)
		// 	console.log(errors)
		// 	resolve(request.data)
		// });

		if (!request) {
			reject(new Error('No signed request sent'))
		  }
		  const parts = request.split('.');
		  if (parts.length !== 2) {
			reject(new Error('Signed request is malformatted', request))
		  }
		  const base64url = require('base64url');
		  const [signature, payload] = parts.map(value => base64url.decode(value));
		  const expectedSignature = crypto.createHmac('sha256', process.env.MESSENGER_APP_SECRET)
			.update(parts[1])
			.digest('hex');
		  if (expectedSignature !== signature) {
			reject(new Error(`Signed request does not match. Expected ${expectedSignature} but got ${signature}.`))
		  } else {
			  resolve(payload)
		  }
	});
}
/**
 * 
 * For Production installs of Application, 
 * FB reqires sending the access_token as well as hash of the key/secret
 * This is ONLY used in production apps
 * see https://developers.facebook.com/docs/workplace/integrations/third-party
 */
var generateProof = (accessToken) => {
	if (!process.env.WP_PRODUCTION) {
		return 'access_token=' + accessToken 
	}
	
	const appsecretTime = Math.floor(Date.now() / 1000) - 10;
    const appsecretProof = crypto
        .createHmac('sha256', process.env.MESSENGER_APP_SECRET)
        .update(accessToken + '|' + appsecretTime)
        .digest('hex');
	return 'access_token=' + accessToken + '&appsecret_proof=' + appsecretProof + '&appsecret_time=' + appsecretTime
}


module.exports = {
	PROFILE_API, sendProfileApiBatch, getProfileApiBatch, getUserProfile, sendNewPostToGroup, sendCommentToPost,
	sendTextMessage, sendQuickReply, sendGenericMessage, sendCustomMessage, sendImageMessage, sendAccountLinking, 
	verifyWithChannelAppSecretHandler, verifySubscription, 
	receivedDeliveryConfirmation, receivedAuthentication, receivedMessageRead,
	getCommunity, webhookSubscribe, getMembers, getAccessToken, getCompany, getGroupInfo, parseSignedRequest, generateProof
}