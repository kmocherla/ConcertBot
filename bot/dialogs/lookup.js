var util = require('util');
var builder = require('botbuilder');

var lib = new builder.Library('lookup');
lib.dialog('/', [
    function (session, args) {
        var price_per_ticket = Math.floor(Math.random() * 100) + 10 + .99;
        console.log(args);
        console.log(session.gettext('celebrity_' + args.celebrity));
        session.dialogData.celebrity = session.gettext('celebrity_' + args.celebrity);
        session.dialogData.eventDate = args.event_date;
        session.dialogData.numTickets = args.num_tickets;
        session.dialogData.price = session.dialogData.numTickets * price_per_ticket;
        session.send('confirm_choice', session.dialogData.numTickets,
            session.dialogData.celebrity, session.dialogData.eventDate);
        session.send('confirm_price', price_per_ticket, session.dialogData.price);
        session.beginDialog('details:/');
    },
    function (session, args) {
        // Retrieve details, continue to billing address
        session.dialogData.details = args.details;
        session.beginDialog('details:address');
    },
    function (session, args, next) {
        // Retrieve billing address
        session.dialogData.billingAddress = args.billingAddress;
        next();
    },
    function (session, args) {
        // Continue to checkout
        var order = {
            selection: {
                celebrity: session.dialogData.celebrity,
                eventDate: session.dialogData.eventDate,
                numTickets: session.dialogData.numTickets,
                price: session.dialogData.price
            },
            details: session.dialogData.details,
            billingAddress: session.dialogData.billingAddress
        };

        console.log('order', order);
        session.beginDialog('checkout:/', { order: order });
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};