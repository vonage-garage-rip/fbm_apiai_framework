/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const sessionsManager = require('../../sessionsManager');

/* jshint node: true, devel: true */
'use strict';
const utility = require('./utility');

const rpn = require('request-promise-native')

// Arbitrary value used to validate a workplace webhook
const WORKPLACE_VERIFY_TOKEN = process.env.WORKPLACE_VERIFY_TOKEN;
const WORKPLACE_PAGE_ACCESS_TOKEN = process.env.WORKPLACE_PAGE_ACCESS_TOKEN

var handleInboundEvent = function (req, res, next) {
  if (req.method == 'GET') {
    req.appSecret = WORKPLACE_VERIFY_TOKEN
    utility.verifySubscription(req, res)
  }
  else if (req.method === 'POST') {
    handlePostRequest(req, res)
  }
}
/*
 * All callbacks for webhooks are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks.
 *
 * On Workplace, webhooks can be sent for 'page', 'group' and
 * 'workplace_security' objects:
 *
 * 'Page' webhooks relate to page messages or mentions, where the page ID is
 * the ID of the bot the user is interacting with.
 *
 * 'Group' webhooks relate to updates in a specific Workplace group, including
 * posts, comments and group membership changes.
 *
 * 'Workplace Security' webhooks relate to security-specific events in
 * Workplace, including login, logout, password changes etc.
 *
 * https://developers.facebook.com/docs/workplace/integrations/custom-integrations/webhooks
 *
 */
const handlePostRequest = (req, res) => {
  try {
    var data = req.body;
    // On Workplace, webhooks can be sent for page, group, user and
    // workplace_security objects
    switch (data.object) {
      case 'page':
        processPageEvents(data);
        break;
      case 'group':
        processGroupEvents(data);
        break;
      case 'user':
        processUserEvents(data);
        break;
      case 'workplace_security':
        processWorkplaceSecurityEvents(data);
        break;
      default:
        console.log('Unhandled Webhook Object', data.object);
    }
  } catch (e) {
    // Write out any exceptions for now
    console.error(e);
  } finally {
    // Always respond with a 200 OK for handled webhooks, to avoid retries
    // from Facebook
    /// TODO we should find a way to return this quicker rather than waiting for handling to complete
    res.sendStatus(200);
  }
}

function processPageEvents(data) {
  // Iterate over each entry
  // There may be multiple if batched
  data.entry.forEach(pageEntry => {
    var pageID = pageEntry.id;
    var timeOfEvent = pageEntry.time;

    // Iterate over each messaging event
    if (pageEntry.messaging) {
      pageEntry.messaging.forEach(messagingEvent => {
        if (messagingEvent.message) {
          receivedMessage(messagingEvent, pageID);
        } else if (messagingEvent.delivery) {
          utility.receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          utility.receivedMessageRead(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    } else if (pageEntry.changes) {
      pageEntry.changes.forEach(function (change) {
        console.log('Page Change', pageID, change);
        let inboundMessage = {
          channel: sessionsManager.CHANNELS.FB_WORKPLACE,
          sourceType: sessionsManager.SOURCE_TYPE.POST,
          source: change.value.post_id,
          from: change.value.sender_name, //  perhaps this should be added to session.data
          to: pageID,
          text: change.value.message.substring(change.value.message.indexOf(' ') + 1)
        };
        sessionsManager.handleInboundChannelMessage(inboundMessage)
      });
    }
  });
}

const receivedMessage = (messagingEvent, pageID) => {
  if (messagingEvent.message.is_echo) {
    console.log("Messageing Event Echo: ", messagingEvent);
    return;
  }
  if (messagingEvent.message.text) {
    console.log('facebook.webhook.receivedMessage. incoming text message: ' + messagingEvent.message.text + ". From " + messagingEvent.sender.id);
    let inboundMessage = {
      channel: sessionsManager.CHANNELS.FB_WORKPLACE,
      sourceType: messagingEvent.thread ? sessionsManager.SOURCE_TYPE.GROUP_CHAT : sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
      source: messagingEvent.thread ? messagingEvent.thread.id : messagingEvent.sender.id,
      from: messagingEvent.sender.id,
      to: pageID,
      text: messagingEvent.message.text
    };

    sessionsManager.handleInboundChannelMessage(inboundMessage);
  }
  else if (messagingEvent.message.attachments) {
    console.log("facebook.webhook.receivedMessage. incoming attachments");
    messagingEvent.message.attachments.forEach(function (attachment) {
      switch (attachment.type) {
        default:
          console.log("facebook.webhook.receivedMessage. attachment " + attachment.type + " unhandled");
          break;
      }
    })
  }
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
const receivedPostback = (messagingEvent) => {
  let payload = messagingEvent.postback.payload;

  let inboundPostbackMessage =
    {
      channel: sessionsManager.CHANNELS.FB_WORKPLACE,
      sourceType: messagingEvent.thread ? sessionsManager.SOURCE_TYPE.GROUP_CHAT : sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
      source: messagingEvent.thread ? messagingEvent.thread.id : messagingEvent.sender.id,
      from: messagingEvent.sender.id,
      to: messagingEvent.recipient.id,
      payload: payload
    };

  /// TODO: promisfy this to send the 200 response back as quickly as possible
  sessionsManager.handleInboundChannelPostback(inboundPostbackMessage);
}
function processMessageEvent(data) {

}
function processGroupEvents(data) {
  data.entry.forEach(function (entry) {
    let group_id = entry.id;
    entry.changes.forEach(function (change) {
      console.log('Group Change', group_id, change);
    });
  });
}

function processUserEvents(data) {
  data.entry.forEach(function (entry) {
    let group_id = entry.id;
    entry.changes.forEach(function (change) {
      console.log('User Change', group_id, change);
    });
  });
}

function processWorkplaceSecurityEvents(data) {
  data.entry.forEach(function (entry) {
    let group_id = entry.id;
    entry.changes.forEach(function (change) {
      console.log('Workplace Security Change', group_id, change);
    });
  });
}

function sendMessage(message, session) {

  if (session.sourceType) {
    switch (session.sourceType) {
      case sessionsManager.SOURCE_TYPE.POST:
        sendCommentToPost(session.source, message.speech); // post ID
        break;
      case sessionsManager.SOURCE_TYPE.GROUP_CHAT:
        sendTextMessageToExistingGroup(session.source, message.speech); // thread ID
        break;
      case sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT:

        //HANDLE MANY TYPES OF FB MESSAGES [TEXT, QUICK REPLY, IMAGE, CARD, CUSOTME].
        switch (message.type) {
          case sessionsManager.MESSAGE_TYPES.TEXT:
            utility.sendTextMessage(session.source, message.speech, WORKPLACE_PAGE_ACCESS_TOKEN);
            break;
          case sessionsManager.MESSAGE_TYPES.QUICK_REPLY:
            utility.sendQuickReply(session.source, message.title, message.replies, WORKPLACE_PAGE_ACCESS_TOKEN);
            break;
          case sessionsManager.MESSAGE_TYPES.IMAGE:
            utility.sendImageMessage(session.source, message.imageUrl, WORKPLACE_PAGE_ACCESS_TOKEN);
            break;
          case sessionsManager.MESSAGE_TYPES.CARD:
            utility.sendGenericMessage(session.source, message.title, message.subtitle, message.imageUrl, message.buttons, WORKPLACE_PAGE_ACCESS_TOKEN);
            break;
          case sessionsManager.MESSAGE_TYPES.CUSTOME:
            utility.sendCustomMessage(session.source, message.payload.facebook, WORKPLACE_PAGE_ACCESS_TOKEN);
            break;
        }
        break;
    }
  }
}

function sendNewPostToGroup(groupId, message) {
  return utility.sendNewPostToGroup(groupId, message, WORKPLACE_PAGE_ACCESS_TOKEN)
}

function sendCommentToPost(postId, message) {
  return utility.sendCommentToPost(postId, message, WORKPLACE_PAGE_ACCESS_TOKEN)
}

function sendTextMessageToExistingGroup(threadId, message) {
  return utility.sendTextMessageToExistingGroup(threadId, message, WORKPLACE_PAGE_ACCESS_TOKEN)
}

const getUserProfile = userId => {
  return utility.getUserProfile(userId, "first_name,last_name", WORKPLACE_PAGE_ACCESS_TOKEN)
}

module.exports.handleInboundEvent = handleInboundEvent
module.exports.sendMessage = sendMessage
module.exports.sendNewPostToGroup = sendNewPostToGroup
module.exports.getUserProfile = getUserProfile