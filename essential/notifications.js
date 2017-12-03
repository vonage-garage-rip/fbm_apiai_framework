var request = require("request")
const firebaseDatabase = require("../DB/firebase").firebaseDatabase
const essentialDB = require("../DB/essentialDB").getDB(firebaseDatabase)
var utils = require("./utils.js")
const actionsManager = require("../actions/manager")

const moment = require("moment")

const NOTIFICATION_EVENTS = {
	INITIALIZING: "Initializing",
	START_RINGING: "Start Ringing",
	RINGING: "Ringing",
	ANSWERED: "Answered",
	CONNECTED: "Connected",
	TERMINATED: "Terminated",
	DISCONNECTED: "Disconnected"
}

var pusher_connections = []
var last_timestamp
var last_callid
var last_event

const Pusher = require("pusher-client")

exports.calls = []

exports.connectPusher = (tokenData) => {
	return new Promise( resolve => {
		getAccountID(tokenData)
			.then( tokenData => {
				return exports.disconnectPusher(tokenData)
			})
			.then( () => {   
				resolve(connectPusherInternal(tokenData))
			})
	})
}

exports.disconnectPusher = (user) => {
	//get account id
	return new Promise( resolve  => {
		Pusher.logToConsole = true
		var pusherObj = pusherObjForAccount(user.account_id)
		if (!pusherObj) {
			console.error("Could not disconnect from pusher, object does not exist")
			resolve(user)
		}
		else {
			var pusher = pusherObj.pusher
			var ch = "private-account-" + pusherObj.account_id + "-presence"
			console.info("disconnecting from channel", ch)
			pusher.unsubscribe(ch)
			pusher.disconnect()
			removePusherObj(pusherObj.account_id)
			resolve(user)
		}
	})
}

function getAccountID(tokenData) {

	return new Promise( (resolve, reject) => {
		var options = {
			method: "GET",
			url: process.env.HDAP_URL + "/pusher/v1/account",
			headers: {
				"X-Von-Token": tokenData.oauthUser.access_token,
				"Authorization": "Bearer " + tokenData.oauthClient.access_token
			},
			rejectUnauthorized: false
		}

		request(options, (error, response, body) => {
			if (response.statusCode > 300 || error) { 
				reject(new Error("getAccountID Error", body))
				return
			}
			tokenData.account_id = JSON.parse(body).accountId
			resolve(tokenData)
		})
	})
}

function connectPusherInternal(tokenData) {
	return new Promise( resolve  => {
		Pusher.logToConsole = true
		Pusher.log = function(m){console.log("Pusher log " + m)}
		var pusher = null
		var account_id = tokenData.account_id
		var pusherObj = pusherObjForAccount(account_id)

		if (pusherObj) {
			pusher = pusherObj.pusher
		} 
		else {
			console.info("New pusher Obj")

			pusher = new Pusher(process.env.PUSHER_APP_ID, {
				authEndpoint: process.env.HDAP_URL + "/pusher/auth",
				encrypted: true,
				rejectUnauthorized: false,
				auth: {
					headers: {
						"X-Von-Token": tokenData.oauthUser.access_token,
						"Authorization": "Bearer " + tokenData.oauthClient.access_token
					}
				}
			})

			pusher.connection.on("error", error => {
				//connection to 
				console.log("PUSER  error", error)
				let account_ext = tokenData.account_id + "_" + tokenData.settings.extensions[0].extension				
				essentialDB.getEssentialsUser(account_ext)
					.then( essentialUser => {
						let eventName = "pusherError"
						let eventData = 
						actionsManager.handleEssentialEvent(eventName, essentialUser, eventData)
					})
			})

			pusher_connections.push({ "account_id": account_id, "pusher": pusher })
		}

		var ch = "private-account-" + account_id + "-presence"
		console.info("channel", ch)
		const channel = pusher.subscribe(ch)
		pusher.subscribe.bind("pusher:subscribe", () => {
			console.log("Something happend on pusher.subscribe.bind")
		})

      
		var pusherEventCallback = notification => {
			var timestamp = moment(notification.eventTimestamp,"MMM DD, YYYY hh:mm:ss z")
			var callid = notification.callId.split("-")[1]
			var diff = moment(last_timestamp).diff(timestamp, "seconds")
			var event = notification.event 
      
			if(diff< 10 && callid == last_callid && event == last_event) {
				console.error("Duplicate " + notification.event +" EVENT")
				return
			} 
			last_timestamp = timestamp
			last_callid = callid
			last_event = event

			let account_ext = notification.accountNumber + "_" + (notification.local.extension || notification.remote.extension)
			essentialDB.getEssentialsUser(account_ext)
				.then( essentialUser => {
					let eventName = notification.direction + "EssentialCall" + event.replace(" ","")
					let eventData = parseNotificationData(notification)
					actionsManager.handleEssentialEvent(eventName, essentialUser, eventData)
				})
		}

		Object.values(NOTIFICATION_EVENTS).forEach(eventName => {
			channel.bind(eventName, pusherEventCallback)
		})
    
		resolve(tokenData)
	})
}

function parseNotificationData(notification) {
	var localData = notification.local
	var remoteData = notification.remote
	let direction = notification.direction.charAt(0).toUpperCase() + notification.direction.slice(1)
	let event = notification.event

	var localNumber = (localData ? (localData.number   || localData.extension) : null ) || null
	var localName   = (localData ? (localData.username || localData.name)      : null ) || null

	var remoteNumber = (remoteData ? (remoteData.number   || remoteData.extension) : null ) || null
	var remoteName   = (remoteData ? (remoteData.username || remoteData.name) : null) || null

	let otherPartyNameOrNum = (remoteName ? remoteName+" " : "") +  (remoteData.number ? utils.formatPhoneNumber(remoteData.number) : ("ext:" + remoteData.extension))
	let messagePrefix = direction + " call event (" + notification.event + ")" 
	let messgaeSuffix = ((direction == "Inbound") ? " from " : " to ") + otherPartyNameOrNum
	let message = messagePrefix + messgaeSuffix

	console.log("********* Got notification: " + message)
	return {
		event: event,
		direction: direction,
		localNumber: localNumber,
		localName: localName,
		remoteNumber: remoteNumber,
		remoteName: remoteName,
		otherPartyNameOrNum: otherPartyNameOrNum
	}
}

function pusherObjForAccount(account_id) {
	return pusher_connections.find(pusher => pusher.account_id == account_id)
}

function removePusherObj(account_id) {
	for(var i in pusher_connections) {
		if( pusher_connections[i].account_id == account_id ) {
			console.info("removed pusher obj from array")
			pusher_connections.splice(i, 1)
			break
		}
	}
}
