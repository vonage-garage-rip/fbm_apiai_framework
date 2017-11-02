var Nexmo = require('nexmo');
var sessionsManager = require("../../sessionsManager")

const QUEUE_DELAY = 1000
const MAX_MESSAGES_PER_SECOND = 10

class NexmoChannel {
  
  constructor () {
    /// see if you can use HTTP 1/1 for persistent conncection
    this.nexmo = new Nexmo({
      apiKey: process.env.NEXMO_API_KEY,
      apiSecret: process.env.NEXMO_API_SECRET
      },
      {debug: process.env.NEXMO_DEBUG || false}
    );
    this.messagesQueue = []
    this.dispatchMessages = this.dispatchMessages.bind(this);
  }

  resumeQueue(delay) {
    setTimeout(this.dispatchMessages, delay)
  }

  sendMessage(message, session) {
    this.messagesQueue.push({
      /// Should we add sessionID ? other identifying parameters?q  
      message: message.speech,
      to: session.phoneNumbers[0],
      from: process.env.NEXMO_NUMBER,
      sendAttempts: 0
    })
  }

  dispatchMessages() {
    let maxMessagesToSend = Math.min(MAX_MESSAGES_PER_SECOND, this.messagesQueue.length)
    let messageResponses = 0
    let retriesArray = []
    let backoff = 0

    let handleNexmoResponse = (messageObj, err, responseData) => {
      messageResponses++
      if (err) {
        console.error("dispatchMessages error: " + err);
        // https://developer.nexmo.com/api/sms#error-codes
        if ( err.status==1 && messageObj.sendAttempts<4 ) {
          console.log("err. pushing messgae to retriesArray. retry #" + messageObj.sendAttempts)
          backoff = Math.max(backoff, messageObj.sendAttempts)
          retriesArray.push(messageObj)
        }
      }
      else {
        let errorMessages = responseData.messages.filter(message => message.status===1)
        if ( errorMessages.length>0 ) {
          console.log("error in responseData. pushing messgae to retriesArray. retry #" + messageObj.sendAttempts)
          backoff = Math.max(backoff, messageObj.sendAttempts)
          retriesArray.push(messageObj)
        }
        else {
          console.log("dispatchMessages: %d message(s) sent: %s", 
            responseData["message-count"], responseData.messages.map(message => "msgID="+message["message-id"]+", status="+message.status+" ").toString())
        }
      }
      if ( messageResponses===maxMessagesToSend ) {
        this.messagesQueue = retriesArray.concat(this.messagesQueue.slice(maxMessagesToSend))
        this.resumeQueue(2**backoff*process.env.NEXMO_THROUGHPUT /*+ add jitter */ )
      }
    };

    if ( maxMessagesToSend===0 ) {
      this.resumeQueue(process.env.NEXMO_THROUGHPUT)
    }
    for (var index=0 ; index < maxMessagesToSend ; index++) {
      let messageObj = this.messagesQueue[index]

      /// add simulation of sent messages with 0.2 probability of velocity errors
      messageObj.sendAttempts++
      console.log("sending message. attempt number " + messageObj.sendAttempts)
      this.nexmo.message.sendSms(messageObj.from, messageObj.to, messageObj.message, handleNexmoResponse.bind(this, messageObj))
    }
  }



  handleInboundEvent(req, res) {
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
}

var nexmoChannel = new NexmoChannel()
module.exports = nexmoChannel