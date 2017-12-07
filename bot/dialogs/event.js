var _ = require('lodash');
var builder = require('botbuilder');
var events = require('../../services/events');
var SimpleWaterfallDialog = require('./SimpleWaterfallDialog');
var CarouselPagination = require('./CarouselPagination');

var carouselOptions = {
    showMoreTitle: 'title_show_more',
    showMoreValue: 'show_more',
    selectTemplate: 'select',
    pageSize: 3,
    unknownOption: 'unknown_option'
};

var lib = new builder.Library('event');

// These steps are defined as a waterfall dialog,
// but the control is done manually by calling the next func argument.
lib.dialog('date',
    new SimpleWaterfallDialog([
        // First message
        function (session, args, next) {
            session.message.text = null;
            session.send('choose_event_date');
            next();
        },
        CarouselPagination.create(events.getCategories, events.getCategory,
            categoryMapping, carouselOptions),
        function (session, args, next) {
            session.dialogData.eventDate = args.selected.name;
            session.message.text = null;
            next({eventDate: session.dialogData.eventDate});
        }
    ]));

lib.dialog('numTickets', [
    function (session) {
        builder.Prompts.text(session, 'choose_num_tickets');
    },
    function (session, results) {
        session.endDialogWithResult({numTickets:results.response});
    }
]);

function categoryMapping(category) {
    return {
        title: category.name,
        imageUrl: category.imageUrl,
        buttonLabel: 'view_bouquets'
    };
}

function eventMapping(event) {
    return {
        title: event.name,
        subtitle: '$ ' + event.price.toFixed(2),
        imageUrl: event.imageUrl,
        buttonLabel: 'choose_this'
    };
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};