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
  try{
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
  data.entry.forEach(function(entry){
    let page_id = entry.id;
    // Chat messages sent to the page/bot
    let inboundMessage = {}
    if(entry.messaging) {
      entry.messaging.forEach(function(messaging_event){
        console.log('Page Messaging Event', page_id, messaging_event);
        
        inboundMessage = {
          channel: sessionsManager.CHANNELS.FB_WORKPLACE,
          sourceType: messaging_event.thread ? sessionsManager.SOURCE_TYPE.GROUP_CHAT : sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT,
          source: messaging_event.thread ? messaging_event.thread.id : messaging_event.sender.id, 
          from: messaging_event.sender.id, 
          to: page_id,
          text: messaging_event.message.text
        };
      });
    }
		// Page related changes, or mentions of the page/bot in a group post
    else if(entry.changes) {
      entry.changes.forEach(function(change){
        console.log('Page Change', page_id, change);
        inboundMessage = {
          channel: sessionsManager.CHANNELS.FB_WORKPLACE,
          sourceType: sessionsManager.SOURCE_TYPE.POST,
          source: change.value.post_id, 
          from: change.value.sender_name, //  perhaps this should be added to session.data
          to: page_id,
          text: change.value.message.substring(change.value.message.indexOf(' ')+1)
        };
      });
    }
    sessionsManager.handleInboundChannelMessage(inboundMessage)
  });
}

function processGroupEvents(data) {
  data.entry.forEach(function(entry){
    let group_id = entry.id;
    entry.changes.forEach(function(change){
      console.log('Group Change', group_id, change);
    });
  });
}

function processUserEvents(data) {
  data.entry.forEach(function(entry){
    let group_id = entry.id;
    entry.changes.forEach(function(change){
      console.log('User Change',group_id,change);
    });
  });
}

function processWorkplaceSecurityEvents(data) {
  data.entry.forEach(function(entry){
    let group_id = entry.id;
    entry.changes.forEach(function(change){
      console.log('Workplace Security Change', group_id, change);
    });
  });
}

function sendMessage(message, session) {
  switch ( session.sourceType ) {
    case sessionsManager.SOURCE_TYPE.POST:
        sendCommentToPost(message.speech, session.source); // post ID
        break;
    case sessionsManager.SOURCE_TYPE.GROUP_CHAT:
        sendTextMessageToExistingGroup(message.speech, session.source); // thread ID
        break;
    case sessionsManager.SOURCE_TYPE.ONE_ON_ONE_CHAT:
        /// TODO Once more types of content are required, do similar to fbmChannel.sendMessage
        sendTextMessageToUser(message.speech, session.source); // user ID
        break;
  }  
}

function sendNewPostToGroup(message, groupId) {
  return utility.sendNewPostToGroup(message, groupId, WORKPLACE_PAGE_ACCESS_TOKEN)
}

function sendCommentToPost(message, postId) {
  return utility.sendCommentToPost(message, postId, WORKPLACE_PAGE_ACCESS_TOKEN)
}

function sendTextMessageToUser(message, userId) {
  return utility.sendTextMessage(message, userId, WORKPLACE_PAGE_ACCESS_TOKEN)
}

function sendTextMessageToExistingGroup(message, threadId) {
  return utility.sendTextMessageToExistingGroup(message, threadId, WORKPLACE_PAGE_ACCESS_TOKEN)
}

const getUserProfile = userId => {
  return utility.getUserProfile(userId, "first_name,last_name", WORKPLACE_PAGE_ACCESS_TOKEN)
}
 
module.exports.handleInboundEvent = handleInboundEvent
module.exports.sendMessage = sendMessage
module.exports.sendNewPostToGroup = sendNewPostToGroup
module.exports.getUserProfile = getUserProfile