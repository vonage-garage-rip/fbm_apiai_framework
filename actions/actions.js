
const actionsManager = require('./manager.js');
const firebase = require('../integrations/firebase.js')
const nexmoInterface = require('../integrations/nexmoInterface.js')
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

        userProfile.contexts = [sessionID]
        firebase.saveUser(facebookUserID, userProfile)
        .then (function (user) {
            return firebase.saveContext(sessionID, context)
        }).then(function () {
            console.log("Data saved to Firebase")
        }).catch (function (error) {
            console.error(error)
        });
}

const enterPhoneNumberAction =  (apiresponse) => {
    var phoneNumber = apiresponse.result.resolvedQuery;

    var userProfile = apiresponse.result.contexts.filter (function (context) {
        return context.name == "user-profile"
    })[0].parameters

    if (userProfile == null) {
        console.error("Could not find user profile")
        return
    }
    var facebookUserID = userProfile.user_id

    var _user = null;
    firebase.getUser(facebookUserID)
    .then (function (user) {
      _user = user
        //append the phone number to the user
        _user.phoneNumbers = [phoneNumber]
        return firebase.saveUser(facebookUserID, _user)
    }).then(function (user) {
       return firebase.getAllContexts(user.contexts[0])
    }).then (function (session) {
      let message = "Dear " + _user.first_name
      message += " I see that you are looking for a ";
      message += session.carFuel + " powered " + session.carType;
      message += " with a interest in " + session.carFeature + " ";
      message += "Please call us at " + process.env.ESSENTIALS_NUMBER + " to discuss your options"
      return nexmoInterface.sendSMS(phoneNumber, message)
    }).then(function () {
     console.log("Phone Number action completed")
    }).catch(function (error) {
        console.error(error)
    })
}

const subscribeActions = () => {
    actionsManager.registerAction("buycar-completed", buyCarAction)
    actionsManager.registerAction("enterPhoneNumber-completed", enterPhoneNumberAction)
}

subscribeActions()