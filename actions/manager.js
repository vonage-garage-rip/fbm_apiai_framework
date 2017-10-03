'use strict';

var actions = {};

const handleAction = (actionName, resBody) => {
    if (actions[actionName])
        return actions[actionName](resBody);
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
require('require-all')(__dirname);
