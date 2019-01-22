 // Imports the Dialogflow library
 const dialogflow = require('dialogflow');

 // Instantiates a session client
 const sessionClient = new dialogflow.SessionsClient();

 if (!queries || !queries.length) {
   return;
 }

 // The path to identify the agent that owns the created intent.
 const sessionPath = sessionClient.sessionPath(projectId, sessionId);

 let promise;

 // Detects the intent of the queries.
 for (const query of queries) {
   // The text query request.
   const request = {
     session: sessionPath,
     queryInput: {
       text: {
         text: query,
         languageCode: languageCode,
       },
     },
   };

   if (!promise) {
     // First query.
     console.log(`Sending query "${query}"`);
     promise = sessionClient.detectIntent(request);
   } else {
     promise = promise.then(responses => {
       console.log('Detected intent');
       const response = responses[0];
       logQueryResult(sessionClient, response.queryResult);

       // Use output contexts as input contexts for the next query.
       response.queryResult.outputContexts.forEach(context => {
         // There is a bug in gRPC that the returned google.protobuf.Struct
         // value contains fields with value of null, which causes error
         // when encoding it back. Converting to JSON and back to proto
         // removes those values.
         context.parameters = structjson.jsonToStructProto(
           structjson.structProtoToJson(context.parameters)
         );
       });
       request.queryParams = {
         contexts: response.queryResult.outputContexts,
       };

       console.log(`Sending query "${query}"`);
       return sessionClient.detectIntent(request);
     });
   }
 }

 promise
   .then(responses => {
     console.log('Detected intent');
     logQueryResult(sessionClient, responses[0].queryResult);
   })
   .catch(err => {
     console.error('ERROR:', err);
   });