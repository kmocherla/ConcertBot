var util = require('util');
var builder = require('botbuilder');
var siteUrl = require('./site-url');
var cognitiveservices = require('botbuilder-cognitiveservices');
var azure = require('botbuilder-azure');
var opnUrl = require('opn');
const parseXml = require('@rgrove/parse-xml');
var urlencode = require('urlencode');
var request = require('request');

var needle = require('needle'),
    url = require('url'),
    validUrl = require('valid-url'),
    captionService = require('./caption-service');

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Welcome Dialog
var MainOptions = {
    Lookup: 'main_options_lookup',
    Search: 'main_options_search',
    Support: 'main_options_talk_to_support'
};

var bot = new builder.UniversalBot(connector, function (session) {

        if(session.userData.first_name === undefined) {
            session.userData.first_name = '';
        }

        if (session.message && session.message.value) {
            processSubmitAction(session, session.message.value);
            return;
        }

        if (hasImageAttachment(session)) {
            var stream = getImageStreamFromMessage(session.message);
            captionService
                .getCaptionFromStream(stream)
                .then(function (caption) { handleSuccessResponse(session, caption); })
                .catch(function (error) { handleErrorResponse(session, error); });
                return;
        } else if(session.message.text) {
            var imageUrl = parseAnchorTag(session.message.text)
                || (validUrl.isUri(session.message.text) ? session.message.text : null);
            if (imageUrl) {
                captionService
                    .getCaptionFromUrl(imageUrl)
                    .then(function (caption) { handleSuccessResponse(session, caption); })
                    .catch(function (error) { handleErrorResponse(session, error); });
            } else {
                //session.send('Did you upload an image? I\'m more of a visual person. Try sending me an image or an image URL');
            }
            return;
        }

        var welcomeCard = {
            'contentType': 'application/vnd.microsoft.card.adaptive',
            'content': {
                '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                'type': 'AdaptiveCard',
                'version': '1.0',
                'body': [
                    {
                        'type': 'Container',
                        'speak': '<s>' + session.gettext('hello') + '</s><s>' + session.gettext('option') + '</s>',
                        'items': [
                            {
                                'type': 'ColumnSet',
                                'columns': [
                                    {
                                        'type': 'Column',
                                        'size': 'auto',
                                        'items': [
                                            {
                                                'type': 'Image',
                                                'url': 'https://placeholdit.imgix.net/~text?txtsize=65&txt=Caesars+Concert+Bot&w=300&h=300',
                                                'size': 'medium',
                                                'style': 'person'
                                            }
                                        ]
                                    },
                                    {
                                        'type': 'Column',
                                        'size': 'stretch',
                                        'items': [
                                            {
                                                'type': 'TextBlock',
                                                'text': session.gettext('hello'),
                                                'weight': 'bolder',
                                                'isSubtle': true
                                            },
                                            {
                                                'type': 'TextBlock',
                                                'text': session.gettext('option'),
                                                'wrap': true
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ],
                'actions': [
                    {
                        'type': 'Action.ShowCard',
                        'title': session.gettext(MainOptions.Lookup),
                        'speak': '<s>' + session.gettext(MainOptions.Lookup) + '</s>',
                        'card': {
                            'type': 'AdaptiveCard',
                            'body': [
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('concert_finder'),
                                    'speak': '<s>' + session.gettext('concert_finder') + '</s>',
                                    'weight': 'bolder',
                                    'size': 'medium'
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('choose_celebrity')
                                },
                                {
                                    "type": "Input.ChoiceSet",
                                    "id": "celebrity",
                                    "style": "compact",
                                    "isMultiSelect": false,
                                    "value": "1",
                                    "choices": [
                                        {
                                            "title": session.gettext('celebrity_1'),
                                            "value": "1"
                                        },
                                        {
                                            "title": session.gettext('celebrity_2'),
                                            "value": "2"
                                        },
                                        {
                                            "title": session.gettext('celebrity_3'),
                                            "value": "3"
                                        }
                                    ]
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('event_date')
                                },
                                {
                                    'type': 'Input.Date',
                                    'id': 'event_date',
                                    'speak': '<s>' + session.gettext('event_date') + '</s>'
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('num_tickets')
                                },
                                {
                                    'type': 'Input.Number',
                                    'id': 'num_tickets',
                                    'min': 1,
                                    'max': 60,
                                    'speak': '<s>' + session.gettext('num_tickets') + '</s>'
                                }
                            ],
                            'actions': [
                                {
                                    'type': 'Action.Submit',
                                    'title': 'Lookup',
                                    'speak': '<s>Lookup</s>',
                                    'data': {
                                        'type': 'lookup'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        'type': 'Action.ShowCard',
                        'title': session.gettext(MainOptions.Search),
                        'speak': '<s>' + session.gettext(MainOptions.Search) + '</s>',
                        'card': {
                            'type': 'AdaptiveCard',
                            'body': [
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('celebrity_info'),
                                    'speak': '<s>' + session.gettext('celebrity_info') + '</s>',
                                    'weight': 'bolder',
                                    'size': 'medium'
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('enter_celebrity')
                                },
                                {
                                    'type': 'Input.Text',
                                    'id': 'celebrity',
                                    'speak': '<s>' + session.gettext('enter_celebrity') + '</s>',
                                    'placeholder': 'Celine Dion',
                                    'style': 'text'
                                }
                            ],
                            'actions': [
                                {
                                    'type': 'Action.Submit',
                                    'title': 'Search',
                                    'speak': '<s>Search</s>',
                                    'data': {
                                        'type': 'search'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        'type': 'Action.ShowCard',
                        'title': 'Hotels',
                        'speak': '<s>Hotels</s>',
                        'card': {
                            'type': 'AdaptiveCard',
                            'body': [
                                {
                                    'type': 'TextBlock',
                                    'text': 'Welcome to the Caesars Hotels Reservation !',
                                    'speak': '<s>Welcome to the Caesars Hotels Reservation !</s>',
                                    'weight': 'bolder',
                                    'size': 'medium'
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': 'Please choose your Location:'
                                },
                                {
                                  "type": "Input.ChoiceSet",
                                  "id": "destination",
                                  "style": "compact",
                                  "placeholder": 'Select from below choices',
                                  //"value": "0",
                                  "choices": [
                                    {
                                      "title": "Las Vegas",
                                      "value": "Las Vegas"
                                    },
                                    {
                                      "title": "Atlantic City",
                                      "value": "Atlantic City"
                                    },
                                    {
                                      "title": "Baltimore",
                                      "value": "Baltimore"
                                    },
                                    {
                                      "title": "Gulf Coast",
                                      "value": "Gulf Coast"
                                    },                                    
                                    {
                                      "title": "Lake Tahoe",
                                      "value": "Lake Tahoe"
                                    }
                                  ]
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': 'When do you want to check in?'
                                },
                                {
                                    'type': 'Input.Date',
                                    'id': 'checkin',
                                    'speak': '<s>When do you want to check in?</s>'
                                },
                                {
                                    'type': 'TextBlock',
                                    'text': 'How many nights do you want to stay?'
                                },
                                {
                                    'type': 'Input.Number',
                                    'id': 'nights',
                                    'min': 1,
                                    'max': 60,
                                    'speak': '<s>How many nights do you want to stay?</s>'
                                }
                            ],
                            'actions': [
                                {
                                    'type': 'Action.Submit',
                                    'title': 'Search',
                                    'speak': '<s>Search</s>',
                                    'data': {
                                        'type': 'hotelSearch'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        'type': 'Action.ShowCard',
                        'title': session.gettext(MainOptions.Support),
                        'speak': '<s>' + session.gettext(MainOptions.Support) + '</s>',
                        'card': {
                            'type': 'AdaptiveCard',
                            'body': [
                                {
                                    'type': 'TextBlock',
                                    'text': session.gettext('support'),
                                    'speak': '<s>' + session.gettext('support') + '</s>',
                                    'size': 'small'
                                }
                            ]
                        }
                    }
                ]
            }
        };

        session.send(new builder.Message(session)
            .addAttachment(welcomeCard));
    }
);

function processSubmitAction(session, value) {
    var defaultErrorMessage = 'Please complete all the search parameters';
    switch (value.type) {
        case 'lookup':
            if (validateLookup(value)) {
                session.beginDialog('lookup:/', value);
            } else {
                session.send(defaultErrorMessage);
            }
            break;

        case 'search':
            if (validateSearch(value)) {
                session.beginDialog('search:bing', value);
            } else {
                session.send(defaultErrorMessage);
            }
            break;

        case 'hotelSearch':
            if (validateHotelSearch(value)) {
                session.beginDialog('hotel-search:/', value);
            } else {
                session.send(defaultErrorMessage);
            }
            break;

        case 'hotelSelection':
            sendHotelSelection(session, value);
            break;

        case 'showSummary':
            showSummaryCard(session, value);
            break;


        default:
            session.send(defaultErrorMessage);
    }
}

function validateLookup(concertSearch) {
    if (!concertSearch) {
        return false;
    }

    // Event Date
    var eventdate = Date.parse(concertSearch.event_date);
    var hasEventdate = !isNaN(eventdate);

    // Number of Tickets
    var numtickets = parseInt(concertSearch.num_tickets, 10);
    var hasNumtickets = !isNaN(numtickets);

    return hasEventdate && hasNumtickets;
}

function validateSearch(celebritySearch) {
    if (!celebritySearch) {
        return false;
    }

    if(! typeof celebritySearch.celebrity === 'string' ) {
        return false;
    }

    return true;
}

// Enable User Data persistence
bot.set('persistUserData', true);

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

// Set default locale
bot.set('localizerSettings', {
    botLocalePath: './bot/locale',
    defaultLocale: 'en'
});


/* ******************************************* Multi-Lingual Module Begin ******************************************* */

var TOLOCALE = 'en';
var FROMLOCALE = 'zh-CHS';

var detectLanguage = function(session, callback) {

    var options = {
        method: 'POST',
        url: 'https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/languages?numberOfLanguagesToDetect=1',
        body: { documents: [{ id: 'message', text: session.message.text }]},
        json: true,
        headers: {
            'Ocp-Apim-Subscription-Key': process.env.LANG_DETECTION_KEY
        }
    };
    request(options, function (error, response, body) {
        if (!error && body) {
            if (body.documents && body.documents.length > 0) {
                var languages = body.documents[0].detectedLanguages;
                if (languages && languages.length > 0) {
                    return callback(languages[0].iso6391Name);
                }
            }
        }
    });
}

var translator = function (session, languageCode, callback) {

    if (session.message && session.message.text) {

        var urlencodedtext = urlencode(session.message.text);
        var options = {
            method: 'GET',
            url: 'http://api.microsofttranslator.com/v2/Http.svc/Translate'
                +'?text=' + urlencodedtext
                +'&from=' + languageCode +'&to=' + TOLOCALE,
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.LANG_TRANSLATION_KEY
            }
        };
        console.log("The request url is " + options.url);
        request(options, function (error, response, body){
            if(error){
                console.log('Error:', error);
                return 'error';
            } else if(response.statusCode !== 200){
                console.log('Invalid Status Code Returned:', response.statusCode);
                return 'error';
            } else {
                var stringResponse = JSON.stringify(response.body);
                var translatedText = JSON.parse(JSON.stringify(parseXml(response.body)));
//                session.message.text = translatedText.children[0].children[0].text.toLowerCase();
                return callback(translatedText.children[0].children[0].text);
            }
        });
    }
 }
/* ******************************************* Multi-Lingual Module End ******************************************* */


/* ******************************************* Image Module Begin ******************************************* */


//=========================================================
// Utilities
//=========================================================
function hasImageAttachment(session) {

    if(!session
        || !session.message
        || !session.message.attachments
        || !session.message.attachments.length) return false;

    return session.message.attachments.length > 0 &&
        session.message.attachments[0].contentType.indexOf('image') !== -1;
}

function getImageStreamFromMessage(message) {
    var headers = {};
    var attachment = message.attachments[0];
    if (checkRequiresToken(message)) {
        // The Skype attachment URLs are secured by JwtToken,
        // you should set the JwtToken of your bot as the authorization header for the GET request your bot initiates to fetch the image.
        // https://github.com/Microsoft/BotBuilder/issues/662
        connector.getAccessToken(function (error, token) {
            var tok = token;
            console.log(token);
            headers['Authorization'] = 'Bearer ' + token;
            headers['Content-Type'] = 'application/octet-stream';

            return needle.get(attachment.contentUrl, { headers: headers });
        });
    }

    headers['Content-Type'] = attachment.contentType;
    return needle.get(attachment.contentUrl, { headers: headers });
}

function checkRequiresToken(message) {
    return message.source === 'skype' || message.source === 'msteams';
}

/**
 * Gets the href value in an anchor element.
 * Skype transforms raw urls to html. Here we extract the href value from the url
 * @param {string} input Anchor Tag
 * @return {string} Url matched or null
 */
function parseAnchorTag(input) {
    var match = input.match('^<a href=\"([^\"]*)\">[^<]*</a>$');
    if (match && match[1]) {
        return match[1];
    }

    return null;
}

//=========================================================
// Response Handling
//=========================================================
function handleSuccessResponse(session, caption) {
    if (caption) {
        session.send('I think it\'s ' + caption);
        redirectUrl(caption);
    }
    else {
        session.send('Couldn\'t find a caption for this one');
    }

}

function handleErrorResponse(session, error) {
    var clientErrorMessage = 'Oops! Something went wrong. Try again later.';
    if (error.message && error.message.indexOf('Access denied') > -1) {
        clientErrorMessage += "\n" + error.message;
    }

    console.error(error);
    session.send(clientErrorMessage);
}

function redirectUrl(caption) {

    if(caption.toLowerCase().indexOf('caesars') > -1) {
        opnUrl('https://www.caesars.com/caesars-palace');
    } else if(caption.toLowerCase().indexOf('paris') > -1) {
        opnUrl('https://www.caesars.com/paris-las-vegas');
    } else if(caption.toLowerCase().indexOf('celine') > -1) {
        opnUrl('http://www.celineinvegas.com/tickets.php');
    } else if(caption.toLowerCase().indexOf('britney') > -1) {
        opnUrl('https://www.caesars.com/planet-hollywood/shows/britney-spears-las-vegas');
    } else if(caption.toLowerCase().indexOf('j-lo') > -1) {
        opnUrl('https://www.caesars.com/planet-hollywood/shows/jennifer-lopez');
    }
}

/* ******************************************* Image Module End ******************************************* */



/* ******************************************* DocDB Module Begin ******************************************* */

// Azure DocumentDb State Store
var docDbClient = new azure.DocumentDbClient({
   host: process.env.DOCUMENT_DB_HOST,
   masterKey: process.env.DOCUMENT_DB_MASTER_KEY,
   database: process.env.DOCUMENT_DB_DATABASE,
   collection: process.env.DOCUMENT_DB_COLLECTION
});
var botStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

// Set Custom Store
bot.set('storage', botStorage);

/* ******************************************* DocDB Module End ******************************************* */


// Sub-Dialogs
bot.library(require('./dialogs/hotel-search').createLibrary());
bot.library(require('./dialogs/lookup').createLibrary());
bot.library(require('./dialogs/search').createLibrary());
bot.library(require('./dialogs/celebrity').createLibrary());
bot.library(require('./dialogs/address').createLibrary());
bot.library(require('./dialogs/concert-selection').createLibrary());
bot.library(require('./dialogs/event').createLibrary());
bot.library(require('./dialogs/details').createLibrary());
bot.library(require('./dialogs/checkout').createLibrary());
bot.library(require('./dialogs/settings').createLibrary());
bot.library(require('./dialogs/help').createLibrary());

// Validators
bot.library(require('./validators').createLibrary());

// Trigger secondary dialogs when 'settings' or 'support' is called
bot.use({
    botbuilder: function (session, next) {
        var text = session.message.text;

        var settingsRegex = localizedRegex(session, ['main_options_settings']);
        var supportRegex = localizedRegex(session, ['main_options_talk_to_support', 'help']);
        var restartRegex = localizedRegex(session, ['restart', 'start_over', 'change_my_mind', 'menu']);

        if (settingsRegex.test(text)) {
            // interrupt and trigger 'settings' dialog 
            return session.beginDialog('settings:/');
        } else if (supportRegex.test(text)) {
            // interrupt and trigger 'help' dialog
            return session.beginDialog('help:/');
        } else if (restartRegex.test(text)) {
            session.send(
                session.gettext('restart_message'),
                session.userData.first_name
            );
            return bot.beginDialog(session.message.address, '/');
        } else {
            // continue normal flow
            next();
        }
    }
});

// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});


/* ******************************************* QnA Module Begin ******************************************* */
var recognizer = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: process.env.QnAKnowledgebaseId, 
    subscriptionKey: process.env.QnASubscriptionKey,
    top: 4});

var qnaMakerTools = new cognitiveservices.QnAMakerTools();
bot.library(qnaMakerTools.createLibrary());
    
var basicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
    recognizers: [recognizer],
    defaultMessage: 'No match! Try changing the query terms!',
    qnaThreshold: 0.3,
    feedbackLib: qnaMakerTools
});

// Override to also include the knowledgebase question with the answer on confident matches
basicQnAMakerDialog.respondFromQnAMakerResult = function(session, qnaMakerResult){
    var result = qnaMakerResult;
    console.log(result);
    console.log(JSON.stringify(result));
    var response = 'Here is the match from FAQ:  \r\n  Q: ' + result.answers[0].questions[0] + '  \r\n A: ' + result.answers[0].answer;
    session.send(response);
}

// Override to log user query and matched Q&A before ending the dialog
basicQnAMakerDialog.defaultWaitNextMessage = function(session, qnaMakerResult){
    if(session.privateConversationData.qnaFeedbackUserQuestion != null && qnaMakerResult.answers != null && qnaMakerResult.answers.length > 0 
        && qnaMakerResult.answers[0].questions != null && qnaMakerResult.answers[0].questions.length > 0 && qnaMakerResult.answers[0].answer != null){
            console.log('User Query: ' + session.privateConversationData.qnaFeedbackUserQuestion);
            console.log('KB Question: ' + qnaMakerResult.answers[0].questions[0]);
            console.log('KB Answer: ' + qnaMakerResult.answers[0].answer);
        }
    session.endDialog();
}

bot.dialog('qna', basicQnAMakerDialog)
.triggerAction({
    matches: [/^(?!.*(help|menu|settings|support|restart|start over|Changed my mind|agent))/i],
    onSelectAction: (session, args, next) => {

        var languageDetect = detectLanguage(session, function(languageCode) {
            console.log(languageCode);

            if(languageCode.indexOf('en') > -1) {
                session.beginDialog(args.action, args);
            } else {
                var translatedText = translator(session, languageCode, function(response) {
                    console.log(response);
                    session.message.text = response;
                    session.beginDialog(args.action, args);
                });
            }
        });
    }
});
/* ******************************************* QnA Module End ******************************************* */


// Cache of localized regex to match selection from main options
var LocalizedRegexCache = {};
function localizedRegex(session, localeKeys) {
    var locale = session.preferredLocale();
    var cacheKey = locale + ":" + localeKeys.join('|');
    if (LocalizedRegexCache.hasOwnProperty(cacheKey)) {
        return LocalizedRegexCache[cacheKey];
    }

    var localizedStrings = localeKeys.map(function (key) { return session.localizer.gettext(locale, key); });
    var regex = new RegExp('^(' + localizedStrings.join('|') + ')', 'i');
    LocalizedRegexCache[cacheKey] = regex;
    return regex;
}

// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        // We'll later need this url to create the checkout link 
        var url = req.protocol + '://' + req.get('host');
        siteUrl.save(url);
        connectorListener(req, res);
    };
}

// Other wrapper functions
function beginDialog(address, dialogId, dialogArgs) {
    bot.beginDialog(address, dialogId, dialogArgs);
}

function sendMessage(message) {
    bot.send(message);
}

module.exports = {
    listen: listen,
    beginDialog: beginDialog,
    sendMessage: sendMessage,
    bot: bot
};


function validateHotelSearch(hotelSearch) {
    if (!hotelSearch) {
        return false;
    }

    // Destination
    var hasDestination = typeof hotelSearch.destination === 'string' && hotelSearch.destination.length > 3;

    // Checkin
    var checkin = Date.parse(hotelSearch.checkin);
    var hasCheckin = !isNaN(checkin);
    if (hasCheckin) {
        hotelSearch.checkin = new Date(checkin);
    }

    // Nights
    var nights = parseInt(hotelSearch.nights, 10);
    var hasNights = !isNaN(nights);
    if (hasNights) {
        hotelSearch.nights = nights;
    }

    return hasDestination && hasCheckin && hasNights;
}
var hotelObj;
function sendHotelSelection(session, hotel) {
    hotelObj=hotel;
    var description = util.format('%d stars with %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting);
    var card = {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'type': 'AdaptiveCard',
            'version': '1.0',
            'body': [
                {
                    'type': 'Container',
                    'items': [
                        {
                            'type': 'TextBlock',
                            'text': hotel.name + ' in ' + hotel.location,
                            'weight': 'bolder',
                            'speak': '<s>' + hotel.name + '</s>'
                        },
                        {
                            'type': 'TextBlock',
                            'text': description,
                            'speak': '<s>' + description + '</s>'
                        },
                        {
                            'type': 'Image',
                            'size': 'auto',
                            'url': hotel.image
                        },
                        {
                          "type": "TextBlock",
                          "text": "Your registration completition is few steps away",
                          "size": "medium",
                          "weight": "bolder"
                        },
                        {
                          "type": "TextBlock",
                          "text": "What type of room do you prefer?",
                          "wrap": true
                        },
                        {
                          "type": "ImageSet",
                          "imageSize": "medium",
                          "images": [

                            {
                              "type": "Image",
                              "text": "1 King Bed",
                              "url": "/Users/hgamineni/Projects/BotBuilder-Samples/Node/cards-AdaptiveCards/images/cp_1kingbed.jpg"
                            },
                            {
                              "type": "Image",
                              "url": "/Users/hgamineni/Projects/BotBuilder-Samples/Node/cards-AdaptiveCards/images/cp_2queenbed.jpg"
                            },
                            {
                              "type": "Image",
                              "url": "/Users/hgamineni/Projects/BotBuilder-Samples/Node/cards-AdaptiveCards/images/cp_classic_suite.jpg"
                            },
                            {
                              "type": "Image",
                              "url": "/Users/hgamineni/Projects/BotBuilder-Samples/Node/cards-AdaptiveCards/images/cp_exec_suite.jpg"
                            },
                            {
                              "type": "Image",
                              "url": "/Users/hgamineni/Projects/BotBuilder-Samples/Node/cards-AdaptiveCards/images/cp_duplex_suite.jpg"
                            }

                          ]
                        },
                        {
                              "type": "Input.ChoiceSet",
                              "id": "roomType",
                              "style": "compact",
                              "placeholder": 'Choose room type',
                              //"value": "0",
                              "choices": [
                                {
                                  "title": "1 King Bed",
                                  "value": "1 King Bed"
                                },
                                {
                                  "title": "2 Queen Bed",
                                  "value": "2 Queen Bed"
                                },
                                {
                                  "title": "Classic Suite",
                                  "value": "Classic Suite"
                                },
                                {
                                  "title": "Executie Suite",
                                  "value": "Executive Suite"
                                },                                    
                                {
                                  "title": "Duplex Suite",
                                  "value": "Duplex Suite"
                                }
                              ]
                          },
                          { // form for registration
                              "type": "ColumnSet",
                              "columns": [
                                {
                                  "type": "Column",
                                  "width": 2,
                                  "items": [
                                    {
                                      "type": "TextBlock",
                                      "text": "Tell us about yourself",
                                      "weight": "bolder",
                                      "size": "medium"
                                    },
                                    {
                                      "type": "TextBlock",
                                      "text": "We just need a few more details to get you booked for the trip of a lifetime!",
                                      "isSubtle": true,
                                      "wrap": true
                                    },
                                    {
                                      "type": "TextBlock",
                                      "text": "Don't worry, we'll never share or sell your information.",
                                      "isSubtle": true,
                                      "wrap": true,
                                      "size": "small"
                                    },
                                    {
                                      "type": "TextBlock",
                                      "text": "Your name",
                                      "wrap": true
                                    },
                                    {
                                      "type": "Input.Text",
                                      "id": "myName",
                                      "placeholder": "Last, First"
                                    },
                                    {
                                      "type": "TextBlock",
                                      "text": "Your Address",
                                      "wrap": true
                                    },
                                    {
                                      "type": "Input.Text",
                                      "id": "myAddr",
                                      "placeholder": "Apartment#, City, State, Zip"
                                    },                                        
                                    {
                                      "type": "TextBlock",
                                      "text": "Your email",
                                      "wrap": true
                                    },
                                    {
                                      "type": "Input.Text",
                                      "id": "myEmail",
                                      "placeholder": "youremail@example.com",
                                      "style": "email"
                                    },
                                    {
                                      "type": "TextBlock",
                                      "text": "Phone Number"
                                    },
                                    {
                                      "type": "Input.Text",
                                      "id": "myTel",
                                      "placeholder": "xxx.xxx.xxxx",
                                      "style": "tel"
                                    }                                        
                                 ]

                                }

                                ],
                              "actions": [
                                {
                                  "type": "Action.Submit",
                                  "title": "Submit"
                                }
                               ]                    
                            }
                        ]
                        }
                    ],
                        "actions": [
                            {
                              "type": "Action.ShowCard",
                              "title": "Preferences",
                              "card": {
                                "type": "AdaptiveCard",
                                "body": [
                                  {
                                    "type": "TextBlock",
                                    "text": "Choose which meal to be served to room ?",
                                    "size": "medium",
                                    "wrap": true
                                  },
                                  {
                                    "type": "Input.ChoiceSet",
                                    "id": "preferences",
                                    "isMultiSelect": true,
                                    //"style": "expanded",
                                    "choices": [
                                      {
                                        "title": "Breakfast",
                                        "value": "breakfast"
                                      },
                                      {
                                        "title": "Lunch",
                                        "value": "lunch"
                                      },
                                      {
                                        "title": "Dinner",
                                        "value": "dinner"
                                      }
                                    ]
                                  },
                                  {
                                    "type": "Input.Text",
                                    "id": "otherPref",
                                    "isMultiline": true,
                                    "placeholder": "Any other preferences ?"
                                  }
                                ],
                                "actions": [
                                  {
                                    "type": "Action.Submit",
                                    "title": "OK",
                                    'speak': '<s>OK/s>',
                                    'data': {
                                        'type': 'showSummary'
                                    }
                                  }
                                ]
                              }
                            }
            ]
        }
    };

    var msg = new builder.Message(session)
        .addAttachment(card);

    session.send(msg);
}

function showSummaryCard(session, regForm){

   var days = parseInt(hotelObj.checkout.substring(8,10)) - parseInt(hotelObj.checkin.substring(8,10));
 
    var card= 
            {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.0",
                "type": "AdaptiveCard",
                "speak": "Your Hotel is confirmed for you and 4 others",
                "body": [
                    {
                        "type": "TextBlock",
                        "text": "Your Hotel stay info",
                        "weight": "bolder",
                        "isSubtle": false
                    },
                    {
                        "type": "TextBlock",
                        "text": "Hotel: "+hotelObj.name,
                        "separator": true
                    },
                    {
                        "type": "TextBlock",
                        "text": "Location: "+hotelObj.location,
                        "spacing": "none"
                    },
                    {
                        'type': 'Image',
                        'size': 'auto',
                        'url': hotelObj.image
                    },
                    {
                        "type": "TextBlock",
                        "text": "Room type choosen: "+regForm.roomType,
                        "spacing": "none"
                    },
                    {
                        "type": "TextBlock",
                        "text": "Booked on Name: "+regForm.myName,
                        "weight": "bolder",
                        "spacing": "medium"
                    },
                    {
                        "type": "TextBlock",
                        "text": "Address: "+regForm.myAddr,
                        //"weight": "bolder",
                        "spacing": "medium"
                    },
                   {
                        "type": "TextBlock",
                        "text": "Contact: "+regForm.myEmail+" "+regForm.myTel,
                        //"weight": "bolder",
                        "spacing": "medium"
                    },                    
                    {
                        "type": "TextBlock",
                        "text": "Date Booked on: "+hotelObj.checkin.substring(0,4)+'-'+hotelObj.checkin.substring(5,7)+'-'+hotelObj.checkin.substring(8,10)+" through Caesars Bot",
                        //"weight": "bolder",
                        "spacing": "none"
                    },
                    {
                        "type": "ColumnSet",
                        "separator": true,
                        "columns": [
                            {
                                "type": "Column",
                                "width": 1,
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": "Check - in",
                                        "isSubtle": true
                                    },
                                    {
                                        "type": "TextBlock",
                                        "size": "extraLarge",
                                        "color": "accent",
                                        "text": hotelObj.checkin.substring(0,4)+'-'+hotelObj.checkin.substring(5,7)+'-'+hotelObj.checkin.substring(8,10),
                                        "spacing": "none"
                                    }
                                ]
                            },
                            {
                                "type": "Column",
                                "width": "auto",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": " "
                                    },
                                    {
                                        "type": "Image",
                                        "url": "/Users/hgamineni/Projects/BotBuilder-Samples/Node/cards-AdaptiveCards/images/cp_duplex_suite.jpg", 
                                        //"http://messagecardplayground.azurewebsites.net/assets/airplane.png",
                                        "size": "small",
                                        "spacing": "none"
                                    }
                                ]
                            },
                            {
                                "type": "Column",
                                "width": 1,
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "horizontalAlignment": "right",
                                        "text": "Check - out",
                                        "isSubtle": true
                                    },
                                    {
                                        "type": "TextBlock",
                                        "horizontalAlignment": "right",
                                        "size": "extraLarge",
                                        "color": "accent",
                                        "text": hotelObj.checkout.substring(0,4)+'-'+hotelObj.checkout.substring(5,7)+'-'+hotelObj.checkout.substring(8,10),
                                        "spacing": "none"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "TextBlock",
                        "text": "Preferences: Serve "+regForm.preferences+" to room",
                        //"weight": "bolder",
                        "spacing": "medium"
                    },
                    {
                        "type": "TextBlock",
                        "text": "Other preferences: "+regForm.otherPref,
                        //"weight": "bolder",
                        "spacing": "none"
                    },
                    // {
                    //     "type": "ColumnSet",
                    //     "separator": true,
                    //     "columns": [
                    //         {
                    //             "type": "Column",
                    //             "width": 1,
                    //             "items": [
                    //                 {
                    //                     "type": "TextBlock",
                    //                     "text": "Amsterdam",
                    //                     "isSubtle": true
                    //                 },
                    //                 {
                    //                     "type": "TextBlock",
                    //                     "size": "extraLarge",
                    //                     "color": "accent",
                    //                     "text": "AMS",
                    //                     "spacing": "none"
                    //                 }
                    //             ]
                    //         },
                    //         {
                    //             "type": "Column",
                    //             "width": "auto",
                    //             "items": [
                    //                 {
                    //                     "type": "TextBlock",
                    //                     "text": " "
                    //                 },
                    //                 {
                    //                     "type": "Image",
                    //                     "url": "http://messagecardplayground.azurewebsites.net/assets/airplane.png",
                    //                     "size": "small",
                    //                     "spacing": "none"
                    //                 }
                    //             ]
                    //         },
                    //         {
                    //             "type": "Column",
                    //             "width": 1,
                    //             "items": [
                    //                 {
                    //                     "type": "TextBlock",
                    //                     "horizontalAlignment": "right",
                    //                     "text": "San Francisco",
                    //                     "isSubtle": true
                    //                 },
                    //                 {
                    //                     "type": "TextBlock",
                    //                     "horizontalAlignment": "right",
                    //                     "size": "extraLarge",
                    //                     "color": "accent",
                    //                     "text": "SFO",
                    //                     "spacing": "none"
                    //                 }
                    //             ]
                    //         }
                    //     ]
                    // },
                    {
                        "type": "ColumnSet",
                        "spacing": "medium",
                        "columns": [
                            {
                                "type": "Column",
                                "width": "1",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": "Total",
                                        "size": "medium",
                                        "isSubtle": true
                                    }
                                ]
                            },
                            {
                                "type": "Column",
                                "width": 1,
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "horizontalAlignment": "right",
                                        "text": "$"+(days*hotelObj.priceStarting),
                                        "size": "medium",
                                        "weight": "bolder"
                                    }
                                ]
                            }
                        ]
                    }
                ],
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Confirm & Proceed"
                    }
                  ]
            }
        };
    var msg = new builder.Message(session)
        .addAttachment(card);
    session.send(msg);
}
