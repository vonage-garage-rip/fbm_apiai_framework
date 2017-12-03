"use strict"

var actions = {}
var essentialsHandlers = {}

const handleAction = (actionName, body, session) => {
	if (actions[actionName])
		return actions[actionName](body, session)
	return defaultHandler(actionName)
}

const handleEssentialEvent = (eventName, essentialUser, eventData) => {
	if ( essentialsHandlers[eventName] ) {
		return essentialsHandlers[eventName](essentialUser, eventData)
	}
	return defaultHandler(eventName)
}

const defaultHandler = (name) => {
	return new Promise( resolve => {
		console.log("defaultHandler: for action/handler " + name)
		return resolve({}) 
	})
}

/// TODO add an option to register an array of methods to be called sequentially
const registerAction = (actionName, method) => {
	actions[actionName] = method
}

const registerEssentialEventHandler = (eventName, method) => {
	essentialsHandlers[eventName] = method
}


module.exports = {registerAction, handleAction, registerEssentialEventHandler, handleEssentialEvent}
