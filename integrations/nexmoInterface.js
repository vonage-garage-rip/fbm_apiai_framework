var Nexmo = require('nexmo');


var nexmo = new Nexmo({
    apiKey: process.env.NEXMO_API_KEY,
    apiSecret: process.env.NEXMO_API_SECRET
  });


exports.sendSMS = function (to, message) {
    return new Promise(function (fulfill, reject) {
        nexmo.message.sendSms(process.env.NEXMO_NUMBER, to, message,
            (err, responseData) => {
                if (err) {
                    console.error(err);
                    reject(err)
                    return
                }
                fulfill()
            });
    });
}

  exports.handleInbound = function(req, res) {
        
  }
