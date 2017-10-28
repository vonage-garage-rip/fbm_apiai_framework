var Nexmo = require('nexmo');
var sessionsManager = require("../../sessionsManager")

var nexmo = new Nexmo({
    apiKey: process.env.NEXMO_API_KEY,
    apiSecret: process.env.NEXMO_API_SECRET
  });


  exports.sendMessage = function(message, session) {
    
    nexmo.message.sendSms(process.env.NEXMO_NUMBER, session.phoneNumbers[0], message.speech,
      (err, responseData) => {
          if (err) {
            console.error(err);
          } 
        });
  }

  exports.handleInboundEvent = function(req, res) {
    console.log("nexmoInterface.handleInboundEvent " + req.query.msisdn + " saying: " + req.query.text)
    res.sendStatus(200)
    let inboundMessage = {
      channel: sessionsManager.CHANNELS.NEXMO,
      source: req.query.msisdn,
      to: req.query.to,
      text: req.query.text
    }

    sessionsManager.handleInboundChannelMessage(inboundMessage);
  }
