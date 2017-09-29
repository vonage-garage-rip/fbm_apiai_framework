// https://developers.facebook.com/docs/messenger-platform/identity/account-linking/

const express = require('express');
const session = require('express-session');
const port = process.env.PORT || 3000;
const app = express();

// Add your automatic client id and client secret here or as environment variables
const AUTOMATIC_CLIENT_ID = process.env.AUTOMATIC_CLIENT_ID || 'your-automatic-client-id';
const AUTOMATIC_CLIENT_SECRET = process.env.AUTOMATIC_CLIENT_SECRET || 'your-automatic-client-secret';

// Set the configuration settings
const credentials = {
    client: {
      id: AUTOMATIC_CLIENT_ID,
      secret: AUTOMATIC_CLIENT_SECRET
    },
    auth: {
      tokenHost: 'https://accounts.automatic.com',
      tokenPath: '/oauth/access_token'
    }
  };

const oauth2 = require('simple-oauth2').create(credentials);

// Authorization uri definition
const authorizationUri = oauth2.authorizationCode.authorizeURL({
  scope: 'scope:user:profile scope:trip scope:location scope:vehicle:profile scope:vehicle:events scope:behavior'
});

// Enable sessions
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// Initial page redirecting to Automatic's oAuth page
app.get('/auth', (req, res) => {
  res.redirect(authorizationUri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/redirect', (req, res) => {
  const code = req.query.code;

  function saveToken(error, result) {
    if (error) {
      console.log('Access token error', error.message);
      res.send('Access token error: ' +  error.message);
      return;
    }

    // Attach `token` to the user's session for later use
    // This is where you could save the `token` to a database for later use
    req.session.token = oauth2.accessToken.create(result);

    res.redirect('/welcome');
  }

  oauth2.authorizationCode.getToken({
    code: code
  }, saveToken);
});

app.get('/welcome', (req, res) => {
  if (req.session.token) {
    // Display token to authenticated user
    console.log('Automatic access token', req.session.token.token.access_token);
    res.send('You are logged in.<br>Access Token: ' +  req.session.token.token.access_token);
  } else {
    // No token, so redirect to login
    res.redirect('/');
  }
});

// Main page of app with link to log in
app.get('/', (req, res) => {
  res.send('<a href="https://accounts.automatic.com/oauth/authorize/?client_id=085e19abb5ad5376dbb5&amp;response_type=code&amp;scope=scope:public%20scope:user:profile%20scope:location%20scope:vehicle:profile%20scope:vehicle:events%20scope:trip%20scope:behavior" target="_blank"><img src="https://d1qbqqxx54sk5g.cloudfront.net/website/img/developer/buttons/signin-xlarge@2x.271d1595432a.png"></a>');
});

// Start server
app.listen(port);

console.log('Express server started on port ' + port);