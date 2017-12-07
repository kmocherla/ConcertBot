var util = require('util');
var builder = require('botbuilder');

var PhoneRegex = new RegExp(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/);
var EmailRegex = new RegExp(/[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/);

var googleMapsClient = require('@google/maps').createClient({
  key: process.env.GOOGLE_MAPS_API_KEY
});

var lib = new builder.Library('details');

lib.dialog('/', [
    function (session) {

    if (session.message && session.message.value && session.message.value.type === 'continue') {
        processSubmitAction(session, session.message.value);
        return;
    }

    // Display Welcome card with Concerts and Flights search options
    var nameCard = {
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
        .addAttachment(nameCard));
    }
]);

lib.dialog('address', [
    function (session) {

    if (session.message && session.message.value && session.message.value.type === 'checkout') {
        processSubmitAction(session, session.message.value);
        return;
    }

    var addressCard = {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'type': 'AdaptiveCard',
            'version': '1.0',
            'body': [
                {
                    'type': 'TextBlock',
                    'text': session.gettext('address'),
                    'weight': 'bolder',
                    'size': 'medium'
                },
                {
                    "type": "Input.Text",
                    "id": "street_apt",
                    'speak': '<s>' + session.gettext('ask_street_apt') + '</s>',
                    "placeholder": "Street Name, Apartment #",
                    "value": "1 harrahs ct"
                },
                {
                    "type": "Input.Text",
                    "id": "city_state_zip",
                    'speak': '<s>' + session.gettext('ask_city_state_zip') + '</s>',
                    "placeholder": "City, State, Zip",
                    "value": "las vegas nv 89119"
                }
            ],
            'actions': [
                {
                    'type': 'Action.Submit',
                    'title': 'Checkout',
                    'speak': '<s>Checkout</s>',
                    'data': {
                        'type': 'checkout'
                    }
                }
            ]
        }
    };

    session.send(new builder.Message(session)
        .addAttachment(addressCard));
    }
]);

function processSubmitAction(session, value) {
    var defaultErrorMessage = 'Please complete all the details';
    switch (value.type) {
        case 'continue':
            var returnValue = validateDetails(value);
            if (returnValue === 'true') {
                session.endDialogWithResult({details: value});
            } else {
                session.send(returnValue);
            }
            break;

        case 'checkout':
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