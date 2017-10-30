var Nexmo = require('nexmo');
var sessionsManager = require("../../sessionsManager")

const QUEUE_DELAY = 1000
const MAX_MESSAGES_PER_SECOND =1

class NexmoChannel {
  
  constructor () {
    /// see if you can use HTTP 1/1 for persistent conncection
    this.nexmo = new Nexmo({
      apiKey: process.env.NEXMO_API_KEY,
      apiSecret: process.env.NEXMO_API_SECRET
    });
    this.messagesQueue = []
    this.intervalId = -1
    this.dispatchMessages = this.dispatchMessages.bind(this);
  }

  startQueue() {
    this.intervalId = setInterval(this.dispatchMessages, QUEUE_DELAY)
  }

  stopQueue() {
    clearInterval(this.intervalId)
  }

  sendMessage(message, session) {
    this.messagesQueue.push({
      message: message.speech,
      to: session.phoneNumbers[0],
      from: process.env.NEXMO_NUMBER
    })
  }

  dispatchMessages() {
    let maxMessagesToSend = Math.min(MAX_MESSAGES_PER_SECOND, this.messagesQueue.length)
    for (var index=0 ; index < maxMessagesToSend ; index++) {
      let messageObj = this.messagesQueue[index]
      nexmo.message.sendSms(messageObj.from, messageObj.to, messageObj.message, 
        (err, responseData) => {
          if (err) {
            /// TODO handle errors. Most importantly, velocity
            console.error(err);
          } 
        });
    }
    /// TODO delete only upon getting delivery-receipt
    this.messagesQueue = this.messagesQueue.slice(0, maxMessagesToSend)
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