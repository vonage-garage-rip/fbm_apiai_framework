
const actionsManager = require('./manager.js');
const firebase = require('../integrations/firebase.js')
const buyCarAction = (apiresponse) => {
    
    var sessionID = apiresponse.sessionId

    var userProfile = apiresponse.result.contexts.filter (function (context) {
        return context.name == "user-profile"
    })[0].parameters

    if (userProfile == null) {
        console.error("Could not find user profile")
        return
    }
    var facebookUserID = userProfile.user_id

     //remove any keys that contain `car`
     Object.keys(userProfile).forEach(key => {
        if (key.indexOf("car") !== -1) {
            delete userProfile[key]
        }
    });

    var context = apiresponse.result.contexts.filter (function (context) {
        return context.name == "car-type"
    })[0].parameters

    if (context == null) {
        console.error("Could not find context")
        return
    }
    
      //append the selected car
      context.selected_model = apiresponse.result.resolvedQuery;
    
        //remove any keys with .orginal
        Object.keys(context).forEach(key => {
            if (key.indexOf(".") !== -1) {
                delete context[key]
            }
        });
        userProfile.context = [sessionID]
        firebase.saveUser(facebookUserID, userProfile)
        .then (function (user) {
            return firebase.saveContext(sessionID, context)
        }).then(function () {
            console.log("Data saved to Firebase")
        }).catch (function (error) {
            console.error(error)
        });
}

const subscribeActions = () => {
    actionsManager.registerAction("buycar-completed", buyCarAction)
}

subscribeActions()