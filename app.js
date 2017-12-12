// This loads the environment variables from the .env file
require('dotenv-extended').load();

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var opnUrl = require('opn');

// Web app
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

// Register your web app routes here
app.get('/', function (req, res, next) {
  res.render('index', { title: 'Concert Reservation' });
});

// Register Checkout page
var checkout = require('./checkout');
app.use('/checkout', checkout);

// Register Bot
var bot = require('./bot');
app.post('/api/messages', bot.listen());

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
//  console.log(res);
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handlers

// Development error handler, will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// Production error handler, no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Start listening
var port = process.env.port || process.env.PORT || 3978;
app.listen(port, function () {
  console.log('Web Server listening on port %s', port);
});


/* ******************************************* Handoff Module Being ******************************************* */

var handoff_0 = require("botbuilder-handoff");
var bot = require("./bot");

const isAgent = (session) => session.message.user.name.startsWith("Agent");

handoff_0.setup(bot.bot, app, isAgent, {
    retainData: process.env.RETAIN_DATA,
    textAnalyticsKey: process.env.CG_SENTIMENT_KEY,
    mongodbProvider: process.env.MONGODB_PROVIDER,
    directlineSecret: process.env.MICROSOFT_DIRECTLINE_SECRET
//    appInsightsInstrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
//    customerStartHandoffCommand: process.env.CUSTOMER_START_HANDOFF_COMMAND
});

//triggerHandoff manually
bot.bot.dialog('/connectToHuman', (session) => {
    session.send("Hold on, buddy! Connecting you to the next available agent!");
    handoff_0.triggerHandoff(session);
    // Open URL
    opnUrl('http://'
      + 'localhost:'
      + port
      + '/index.html?s='
      + process.env.MICROSOFT_DIRECTLINE_SECRET);

}).triggerAction({
    matches: /^agent/i,
});

/* ******************************************* Handoff Module End ******************************************* */

