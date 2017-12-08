var builder = require('botbuilder');
var siteUrl = require('./site-url');
var cognitiveservices = require('botbuilder-cognitiveservices');
var azure = require('botbuilder-azure');

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
});

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
    matches: [/^(?!.*(help|menu|settings|support|restart|start over|Changed my mind))/i],
    onSelectAction: (session, args, next) => {
        session.beginDialog(args.action, args);
    }
});
/* ******************************************* QnA Module End ******************************************* */


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
    sendMessage: sendMessage
};