/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const sessionsMsessionsManageranager = require('../../sessionsManager');

/* jshint node: true, devel: true */
'use strict';
const utility = require('./utility');

var request = require('request');

var graphapi = request.defaults({
    baseUrl: 'https://graph.facebook.com',
    auth: {
        'bearer' : process.env.WORKPLACE_PAGE_ACCESS_TOKEN
    }
});


// Arbitrary value used to validate a workplace webhook
const WORKPLACE_VERIFY_TOKEN = process.env.WORKPLACE_VERIFY_TOKEN;
  
  var handleInboundEvent = function (req, res, next) {
    if (req.method == 'GET') {
      utility.verifySubscription(req, res, WORKPLACE_VERIFY_TOKEN)
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
    res.sendStatus(200);
  }
}

function processPageEvents(data) {
  data.entry.forEach(function(entry){
    let page_id = entry.id;
		// Chat messages sent to the page
    if(entry.messaging) {
      entry.messaging.forEach(function(messaging_event){
        console.log('Page Messaging Event',page_id,messaging_event);
      });
    }
		// Page related changes, or mentions of the page
    if(entry.changes) {
      entry.changes.forEach(function(change){
        console.log('Page Change', page_id, change);
        let inboundMessage = {
          channel: sessionsMsessionsManageranager.CHANNELS.FB_WORKPLACE,
          from: change.value.sender_id, /// Change to group ID
          to: page_id,
          text: change.value.message.substring(change.value.message.indexOf(' ')+1)
        };
        /// TODO considerf adding conversation context here such as sales agent name
        sessionsMsessionsManageranager.handleInboundChannelMessage(inboundMessage)
      });
    }
  });
}

function processGroupEvents(data) {
  data.entry.forEach(function(entry){
    let group_id = entry.id;
    entry.changes.forEach(function(change){
      console.log('Group Change',group_id,change);
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
      console.log('Workplace Security Change',group_id,change);
    });
  });
}

function sendMessageToGroup(message, groupId) {
  graphapi({
    method: 'POST',
    url: '/' + groupId + '/feed',
    qs: {
        'message': message
    }
  },function(error, response, body) {
      if(error) {
          console.error(error);
      } else {
          var post_id = JSON.parse(body).id;
          console.log('sendMessageToGroup: Published message. Post ID= ' + post_id);
      }
  });
}

module.exports.handleInboundEvent = handleInboundEvent
module.exports.sendMessageToGroup = sendMessageToGroup