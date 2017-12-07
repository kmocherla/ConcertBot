var util = require('util');
var builder = require('botbuilder');
var botUtils = require('../utils');
var siteUrl = require('../site-url');
var orderService = require('../../services/orders');

var lib = new builder.Library('checkoutsss');

// Checkout flow
var RestartMessage = 'restart';
var StartOver = 'start_over';
var KeepGoing = 'continue';
var Help = 'help';

lib.dialog('/', [
    function (session) {

    if (session.message && session.message.value
        && (session.message.value.type === 'checkout' || session.message.value.type === 'restart')) {
        processSubmitAction(session, session.message.value);
        return;
    }

    var checkoutCard = {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'type': 'AdaptiveCard',
            'version': '1.0',
            'body': [
                {
                    'type': 'TextBlock',
                    'text': session.gettext('hello'),
                    'weight': 'bolder',
                    'size': 'medium'
                },
                {
                    'type': 'TextBlock',
                    'text': session.gettext('ask_first_name'),
                },
                {
                    "type": "Input.Text",
                    "id": "first_name",
                    'speak': '<s>' + session.gettext('ask_first_name') + '</s>',
                    "value": 'k'
                },
                {
                    'type': 'TextBlock',
                    'text': session.gettext('ask_last_name'),
                },
                {
                    "type": "Input.Text",
                    "id": "last_name",
                    'speak': '<s>' + session.gettext('ask_last_name') + '</s>',
                    "value": 'm'
                },
                {
                    'type': 'TextBlock',
                    'text': session.gettext('ask_phone_number'),
                },
                {
                    "type": "Input.Text",
                    "id": "phone_number",
                    'speak': '<s>' + session.gettext('ask_phone_number') + '</s>',
                    "value": '9728610084'
                },
                {
                    'type': 'TextBlock',
                    'text': session.gettext('ask_email'),
                },
                {
                    "type": "Input.Text",
                    "id": "email",
                    'speak': '<s>' + session.gettext('ask_email') + '</s>',
                    "value": 'k@c.com'
                }
            ],
            'actions': [
                {
                    'type': 'Action.Submit',
                    'title': 'Continue',
                    'speak': '<s>Continue</s>',
                    'data': {
                        'type': 'continue'
                    }
                }
            ]
        }
    };

    session.send(new builder.Message(session)
        .addAttachment(checkoutCard));
    }
]);

function processSubmitAction(session, value) {
    var defaultErrorMessage = 'Please complete all the details';
    switch (value.type) {
        case 'checkout':
            validateCheckout(session, value);
            break;

        case 'restart':
            var address = value.street_apt + " " + value.city_state_zip;
            googleMapsClient.geocode({ address: address }, function(err, response) {
                if (!err) {
                    session.endDialogWithResult({billingAddress: response.json.results[0].formatted_address});
                } else {
                    session.send(err);
                }
            });
            break;

        default:
            session.send(defaultErrorMessage);
    }
}

function validateCheckout(session, value) {

    var order = args.order;

    if (session.message.text === session.gettext('restart')) {
        // 'Changed my mind' was pressed, continue to next step and prompt for options
        return next();
    }

    // Serialize user address
    var addressSerialized = botUtils.serializeAddress(session.message.address);

    // Create order (with no payment - pending)
    orderService.placePendingOrder(order).then(function (order) {

        // Build Checkout url using previously stored Site url
        var checkoutUrl = util.format(
            '%s/checkout?orderId=%s&address=%s',
            siteUrl.retrieve(),
            encodeURIComponent(order.id),
            encodeURIComponent(addressSerialized));

        var messageText = session.gettext('final_price', order.selection.price);
        var card = new builder.HeroCard(session)
            .text(messageText)
            .buttons([
                builder.CardAction.openUrl(session, checkoutUrl, 'add_credit_card'),
                builder.CardAction.imBack(session, session.gettext(RestartMessage), RestartMessage)
            ]);

        session.send(new builder.Message(session)
            .addAttachment(card));
    });

}

function validateDetails(details) {
    if (!details) {
        return "Details are empty!";
    }

    if(! typeof details.first_name === 'string' ) {
        return "Please check your first name!";
    }
    
    if(! typeof details.last_name === 'string' ) {
        return "Please check your last name!";
    }
    
    if(details.phone_number.match(PhoneRegex) === null) {
        return "Please check your phone number!";
    }
    
    if(details.email.match(EmailRegex) === null) {
        return "Please check your email!";
    }
    return 'true';
}

/*lib.dialog('/', [
    function (session) {
        builder.Prompts.text(session, 'ask_first_name');
    },
    function (session, args) {
        session.dialogData.FirstName = args.response;
        builder.Prompts.text(session, 'ask_last_name');
    },
    function (session, args) {
        session.dialogData.LastName = args.response;
        session.beginDialog('validators:phonenumber', {
            prompt: session.gettext('ask_phone_number'),
            retryPrompt: session.gettext('invalid_phone_number')
        });
    },
    function (session, args) {
        session.dialogData.PhoneNumber = args.response;
        var details = {
            firstName: session.dialogData.FirstName,
            lastName: session.dialogData.LastName,
            phoneNumber: session.dialogData.PhoneNumber
        };
        session.endDialogWithResult({ details: details });
    }
]);*/


// Sender details
var UseSavedInfoChoices = {
    Yes: 'yes',
    No: 'edit'
};

lib.dialog('sender', [
    function (session, args, next) {
        var sender = session.userData.sender;
        if (sender) {
            // sender data previously saved
            var promptMessage = session.gettext('use_this_email_and_phone_number', sender.email, sender.phoneNumber);
            builder.Prompts.choice(session, promptMessage, [
                session.gettext(UseSavedInfoChoices.Yes),
                session.gettext(UseSavedInfoChoices.No)
            ]);
        } else {
            // no data
            next();
        }
    },
    function (session, args, next) {
        if (args.response && args.response.entity === session.gettext(UseSavedInfoChoices.Yes) && session.userData.sender) {
            // Use previously saved data, store it in dialogData
            // Next steps will skip if present
            session.dialogData.useSaved = true;
            session.dialogData.email = session.userData.sender.email;
            session.dialogData.phoneNumber = session.userData.sender.phoneNumber;
        }
        next();
    },
    function (session, args, next) {
        if (session.dialogData.useSaved) {
            return next();
        }
        session.beginDialog('validators:email', {
            prompt: session.gettext('ask_email'),
            retryPrompt: session.gettext('invalid_email')
        });
    },
    function (session, args, next) {
        if (session.dialogData.useSaved) {
            return next();
        }
        session.dialogData.email = args.response;
        session.beginDialog('validators:phonenumber', {
            prompt: session.gettext('ask_phone_number'),
            retryPrompt: session.gettext('invalid_phone_number')
        });
    },
    function (session, args, next) {
        if (session.dialogData.useSaved) {
            return next();
        }
        session.dialogData.phoneNumber = args.response;
        builder.Prompts.confirm(session, 'ask_save_info');
    },
    function (session, args) {
        var sender = {
            email: session.dialogData.email,
            phoneNumber: session.dialogData.phoneNumber
        };

        // Save data?
        var shouldSave = args.response;
        if (shouldSave) {
            session.userData.sender = sender;
        }

        // return sender information
        session.endDialogWithResult({ sender: sender });
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};