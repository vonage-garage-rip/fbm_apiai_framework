module.exports = {
	"id": "f6d89ffd-a0f4-4706-be66-9c569f96f197",
	"timestamp": "2017-11-16T18:26:56.889Z",
	"lang": "en",
	"result": {
		"source": "agent",
		"resolvedQuery": "get started",
		"action": "",
		"actionIncomplete": false,
		"parameters": {},
		"contexts": [{
			"name": "user-profile",
			"parameters": {
				"last_visit": "2017-11-16T13:26:53-05:00",
				"full_name": "Kevin Alwell",
				"first_name": "Kevin"
			},
			"lifespan": 4
		},
		{
			"name": "ask_question",
			"parameters": {},
			"lifespan": 2
		}
		],
		"metadata": {
			"intentId": "2420e9b3-d758-4ad1-ad98-606ad1da2200",
			"webhookUsed": "false",
			"webhookForSlotFillingUsed": "false",
			"intentName": "ASK_QUESTION"
		},
		"fulfillment": {
			"speech": "",
			"messages": [{ "type": 0, "platform": "facebook", "speech": "Please enter your question below." }]
		},
		"score": 1
	},
	"status": { "code": 200, "errorType": "success", "webhookTimedOut": false },
	"sessionId": "82b242a6-4295-4113-9d4d-f5175d376232"
}