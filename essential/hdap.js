var request = require("request")

const sessionsManager = require("../sessionsManager")
const firebaseDatabase = require("../DB/firebase").firebaseDatabase
const essentialDB = require("../DB/essentialDB").getDB(firebaseDatabase)

let notifications = require("./notifications")

const getSettings = (tokenData) => {
	return new Promise( (resolve, reject) => {

		var options = {
			method: "GET",
			url: process.env.HDAP_URL + "/general/v1/user/settings", 
			headers: { 
				"cache-control": "no-cache",
				"X-Von-Token": tokenData.oauthUser.access_token,
				"Authorization": "Bearer " + tokenData.oauthClient.access_token,
				accept: "application/json"
			},
			rejectUnauthorized: false   
		}

		request(options, (error, response, body) => {
			if (response.statusCode > 300 || error) {
				console.error(body)
				reject(new Error("Login Error"))
			}
			else {
				var json = JSON.parse(body)
				tokenData.settings = json
				console.info("User Logged In", json.basicInfo)
				resolve(tokenData)
			}
		})
	})
}
/**
 * Curently not used
 */
const userExtension = (tokenData) => {
	var extension = tokenData.settings.extensions[0].extension
	return new Promise( (resolve, reject) => {

		var options = {
			method: "GET",
			url: process.env.HDAP_URL + "/general/v1/extension/" + extension, 
			headers: {
				"cache-control": "no-cache",
				"X-Von-Token": tokenData.oauthUser.access_token,
				"Authorization": "Bearer " + tokenData.oauthClient.access_token,
				accept: "application/json"
			},
			rejectUnauthorized: false   
		}

		request(options, (error, response, body) => {
			if (response.statusCode > 300 || error) {
				console.error(body)
				reject(new Error("Login Error"))
			}
			else {
				var json = JSON.parse(body)
				tokenData.extension = json
				resolve(tokenData)
			}
		})
	})
}

const callback = (tokenData, to, from) => {
	console.log("info", "dialing " + to + " from: " + from)
    
	return new Promise( (resolve, reject) => {
		var options = { 
			method: "POST",
			url: process.env.HDAP_URL + "/messages/v1/call",
			headers: {
				"cache-control": "no-cache",
				"X-Von-Token": tokenData.oauthUser.access_token,
				"Authorization": "Bearer " + tokenData.oauthClient.access_token,
				accept: "application/json",
				"content-type": "application/json" },
			body: { to: to, from: from },
			json: true,
			rejectUnauthorized: false
		}
     
		request(options, (error, response, body) => {
			if (error) { 
				console.error("Dial error",error)
				return reject(new Error(error))
			}
			if (response.statusCode > 300 ) {
				console.error("dial error", body)
				reject(new Error("dial Error", body))
			}
			else {
				console.info("Dial",body)
				resolve()
			}
		})  
	})
}

const sendSMS = function (tokenData, to, from, msg) {
	console.log("info", "sending SMS " + to + " from: " + from + " message: " + msg)
    
	return new Promise( (resolve, reject) => {
		var options = { method: "POST",
			url: process.env.HDAP_URL + "/messages/v1/message",
			headers: { 
				"cache-control": "no-cache",
				"X-Von-Token": tokenData.oauthUser.access_token,
				"Authorization": "Bearer " + tokenData.oauthClient.access_token,
				accept: "application/json",
				"content-type": "application/json" },
			body: { to: to, from: from , msg: msg},
			json: true,
			rejectUnauthorized: false
		}
     
		request(options, (error, response, body) => {
			if (error) { console.error("Send SMS error",error); reject(new Error(error)); return}
			if (response.statusCode > 300 || error) {
				reject(new Error("Send SMS Error",body))
			}
			else {
				console.info("Send SMS",body)
				resolve()
			}
		})  
	})
}

const connect = (session, code) => {
	return new Promise( resolve => {
		console.log("hdap.connect, code: ",code)
		var tokenData = {
			code: code
		}
		
		oAuthClient(tokenData)
			.then ( tokenData => {
				return oAuthUser(tokenData) 
			})
			.then ( tokenData => {
				return getSettings(tokenData)
			})
			.then ( tokenData => {            
				return notifications.connectPusher(tokenData)
			})
			.then ( tokenData => {
				/// assuming only one extension per user
				let essentialUserId = tokenData.settings.basicInfo.accountId + "_" + tokenData.settings.extensions[0].extension 
				sessionsManager.updateSession(session, { data: { essentialUserId: essentialUserId }})
				tokenData.source = session.source
				tokenData.id = essentialUserId
				essentialDB.updateUser(essentialUserId, tokenData)
				return resolve(essentialUserId)
			})
	}) 
}
//1
const oAuthClient = (tokenData) => {
	return new Promise( (resolve, reject) => {
		var options = { 
			method: "POST",
			url: process.env.IDP_URL + "/oauth2/token",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				authorization: "Basic "+ toBase64() 
			},
			form: { 
				grant_type: "client_credentials" 
			},
			rejectUnauthorized: false
		}
      
		request(options, function (error, response, body) {
			if (error) { console.error("authenicateClient error",error); reject(new Error(error)); return}
			if (response.statusCode > 300 ) {
				console.error("authenicateClient error",body)
				reject(new Error("oAuthClient Error",body))
				return
			}

			tokenData.oauthClient = JSON.parse(body)
			resolve(tokenData)
        
		})
      
	})
}

//2
const generateAuthURL = () => {
	return process.env.IDP_URL +"/oauth2/authorize?response_type=code&client_id=" +
           process.env.API_MGR_KEY + "&redirect_uri="+ process.env.ESSENTIAL_CALLBACK_URL + "&scope=openid"
}

//3
const oAuthUser = tokenData => {
	return new Promise( (resolve, reject) => {
		var options = { 
			method: "POST",
			url: process.env.IDP_URL +"/oauth2/token",
			headers: { 
				"content-type": "application/x-www-form-urlencoded",
				authorization: "Basic "+ toBase64() 
			},
			form: { 
				grant_type: "authorization_code",
				redirect_uri: process.env.SERVER_URL + "/api",
				code: tokenData.code 
			},
			rejectUnauthorized:false
		}
      
		request(options, function (error, response, body) {
			if (error) { console.error("oAuthUser error",error); reject(new Error(error)); return}
			if (response.statusCode > 300 || error) {
				console.error(body)
				reject(new Error("oAuthUser Error",body))
				return
			}
			tokenData.oauthUser = JSON.parse(body)
			resolve(tokenData)
		})
	})
}

const getUser = (essentialUserId, logout = false) => {
	return new Promise( (resolve, reject) => {
		essentialDB.getEssentialsUser(essentialUserId, logout)
			.then( user => {
				resolve(user)
			})
			.catch( result => {
				if ( result.error && result.error.code == "ACCESS_TOKEN_ERROR") {
					//try to refresh token for user
					var tokenData = result.user
					return refreshToken(tokenData.oauthUser)
						.then( data => {
							tokenData.oauthUser = data
							//refresh beaer token
							return oAuthClient(tokenData)
						})
						.then( tokenData => {
							return essentialDB.updateUser(essentialUserId, tokenData)
						})
						.then ( tokenData => {
							resolve(tokenData)
						})
						.catch ( error => {
							console.warn(error)
							reject(error)
						})
				} else {
					reject(result.error || result.message)   
				}
			})
	})
}   

const refreshToken = oAuthObject => {
	console.info("Calling Refresh Token")
	return new Promise( (resolve, reject) => {
		var options = { 
			method: "POST",
			url: process.env.IDP_URL + "/oauth2/token",
			headers: { 
				authorization: "BasicAuth "+ toBase64() 
			},
			form: { 
				refresh_token: oAuthObject.refresh_token,
				grant_type: "refresh_token" 
			},
			rejectUnauthorized: false
		}
      
		request(options, (err, response, body) => {
			if (err) { 
				console.error("refreshToken error",err) 
				reject(new Error(error)) 
				return
			}
			if (response.statusCode > 300) {
				var error = new Error("refreshToken Error", body)
				error.code = "REFRESH_TOKEN_ERROR"
				console.warn("refreshToken error", body)
				reject(error)
				return
			}
			console.info("Refresh Token Success")
			oAuthObject = JSON.parse(body)
			resolve(oAuthObject)
		})    
	})
}

const revokeToken = function (user) {
	console.info("Calling Revoke Token")
	return new Promise( (resolve, reject) => {
		var options = {
			method: "POST",
			url: process.env.IDP_URL + "/oauth2/revoke",
			headers:
                { authorization: "BasicAuth " + toBase64() },
			form: {
				token: user.oauthUser.refresh_token,
				token_type_hint: "refresh_token"
			},
			rejectUnauthorized: false
		}

		request(options, (err, response, body) => {
			if (err) { console.error("Revoke token error", err); reject(new Error(err)); return }
			if (response.statusCode > 300) {
				var error = new Error("Revoke token Error", body)
				reject(error)
			}
			else {
				console.info("Revoke Token Success")
				resolve(user)
			}
		})
	})
}

function toBase64(key = process.env.API_MGR_KEY,secret = process.env.API_MGR_SECRET) {
	var auth = new Buffer(key + ":" + secret).toString("base64")
	return auth
}

module.exports.getUser = getUser
module.exports.getSettings = getSettings
module.exports.userExtension = userExtension
module.exports.connect = connect
module.exports.oAuthClient = oAuthClient
module.exports.generateAuthURL = generateAuthURL
module.exports.oAuthUser = oAuthUser
module.exports.refreshToken = refreshToken
module.exports.callback = callback
module.exports.sendSMS = sendSMS
module.exports.revokeToken = revokeToken
