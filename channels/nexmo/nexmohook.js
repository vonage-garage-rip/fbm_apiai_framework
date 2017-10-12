var Nexmo = require('nexmo');
var sessionsManager = require("../../sessionsManager")

var nexmo = new Nexmo({
    apiKey: process.env.NEXMO_API_KEY,
    apiSecret: process.env.NEXMO_API_SECRET
  });


  exports.sendScheduleOptionsToCandidate = function(to, name) {
      let message = "Dear " + name + ", \nWe're thrilled to invite you to an interview for a position in Vonage.\n\nPlease reply:\n1. for Monday between 10:00am to 1:00pm\n\n2. for Tuesday between 2:00pm-5:00pm\n\n3.  for Thursday between 1:00pm-4:00pm"
      nexmo.message.sendSms(process.env.NEXMO_NUMBER, to, message,
        (err, responseData) => {
            if (err) {
              console.error(err);
            } 
          });
  }

  exports.handleInboundEvent = function(req, res) {
    console.log("nexmoInterface.handleInboundEvent " + from + " saying: " + req.query.text)
    res.sendStatus(200)
    let inboundMessage = {
      from: req.query.msisdn,
      to: req.query.to,
      text: req.query.text
    }

    sessionsManager.handleInboundChannelMessage(inboundMessage);
  }
