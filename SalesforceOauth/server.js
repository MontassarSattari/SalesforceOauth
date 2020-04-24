// server/server.js
const httpClient = require('request');
const http = require('http');
const express = require('express');
const jsforce = require('jsforce');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');


const app = express();
//initialize session
app.use(session({secret: 'S3CRE7', resave: true, saveUninitialized: true}));

//bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//jsForce connection
const oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl : 'https://login.salesforce.com',
  clientId : '3MVG9wEVwV0C9ejAMiJIz88NixLJl7ch6UatHHFbNVq3B6GSh9SorSZkZ8px4Xa5MWCjhXnEQCXOyk2xOQOip\n',
  clientSecret : '79FD3B71310BF4142027BB565326319F39DF12061BFCB89F4E80E48E44733C75',
  redirectUri : 'http://localhost:3000/callback'
});

/**
 * Root endpoint
 */
app.set("view options", {layout: false});
app.use(express.static(__dirname + '/dist/SalesforceOauth'));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname));
});
/**
 * Login endpoint
 */

app.get("/auth/login", function(req, res) {
  // Redirect to Salesforce login/authorization page
  res.redirect(oauth2.getAuthorizationUrl({scope: 'api id web refresh_token'}));
});

/**
 * Login callback endpoint (only called by Force.com)
 */
app.get('/callback', function(req, res) {

  const conn = new jsforce.Connection({oauth2: oauth2});
  const code = req.query.code;
  conn.authorize(code, function(err, userInfo) {
    if (err) { return console.error("This error is in the auth callback: " + err); }

    console.log('Access Token: ' + conn.accessToken);
    console.log('Instance URL: ' + conn.instanceUrl);
    console.log('refreshToken: ' + conn.refreshToken);
    console.log('User ID: ' + userInfo.id);
    console.log('Org ID: ' + userInfo.organizationId);

    req.session.accessToken = conn.accessToken;
    req.session.instanceUrl = conn.instanceUrl;
    req.session.refreshToken = conn.refreshToken;
    //res.send(JSON.stringify({"accessToken":conn.accessToken,"instanceUrl":conn.instanceUrl,"refreshToken": conn.refreshToken}));
    res.redirect('http://localhost:3000');
  });
});


app.get('/somePath', function(req, res){

});



//get a list of accounts.
app.get('/api/accounts', function(req, res) {

    if (!req.session.accessToken || !req.session.instanceUrl) { res.redirect('/'); }

  //SOQL query
  let q = 'SELECT id, name FROM account LIMIT 10';

  //instantiate connection
  let conn = new jsforce.Connection({
    oauth2 : {oauth2},
     accessToken: req.session.accessToken,
     instanceUrl: req.session.instanceUrl
  });


  let records = [];
  let query = conn.query(q)
    .on("record", function(record) {
      records.push(record);
    })
    .on("end", function() {
      console.log("total in database : " + query.totalSize);
      console.log("total fetched : " + query.totalFetched);
      res.json(records);
    })
    .on("error", function(err) {
      console.error(err);
    })
    .run({ autoFetch : true, maxFetch : 4000 });
});


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, () => {
  console.log(`Server listening on port ${port} http://localhost:3000 !`);
});
module.exports = app;
