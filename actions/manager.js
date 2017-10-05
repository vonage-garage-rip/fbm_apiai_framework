'use strict';

var actions = {};

const handleAction = (actionName, body, session) => {
    if (actions[actionName])
        return actions[actionName](body, session);
    return defaultHandler(actionName);
}

const defaultHandler = (resBody) => {
    return new Promise(function(resolve) {
        console.log("defaultHandler: for action " + resBody);
        return resolve({}); 
    })
}

const registerAction = (actionName, method) => {
    actions[actionName] = method;
}

module.exports = {registerAction, handleAction};
