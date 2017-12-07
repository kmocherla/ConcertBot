var _ = require('lodash');
var Promise = require('bluebird');
var dateFormat = require('dateformat');

var day1 = new Date();
var day2 = new Date(day1.getTime() + 3 * 86400000 );
var day3 = new Date(day2.getTime() + 6 * 86400000 );

var availableDates = [
        dateFormat(day1, 'longDate'),
        dateFormat(day2, 'longDate'),
        dateFormat(day3, 'longDate')
    ];

var allCategories = _.times(3)
    .map(function (i) {
        return {
            name: availableDates[i],
            imageUrl: 'https://placeholdit.imgix.net/~text?txtsize=48&txt=Date%20' + (i + 1) + '&w=640&h=330'
        };
    });

var allEvents = _.times(17)
    .map(function (i) {
        return {
            name: 'Event ' + (i + 1) + '\u2122',
            imageUrl: 'https://placeholdit.imgix.net/~text?txtsize=48&txt=Event%20' + (i + 1) + '&w=640&h=330',
            price: Math.floor(Math.random() * 100) + 10 + .99
        };
    });

var eventsService = {
    // Categories
    getCategories: function (pageNumber, pageSize) {
        return pageItems(pageNumber, pageSize, allCategories);
    },

    // Get Single Category
    getCategory: function (categoryName) {
        var category = _.find(allCategories, ['name', categoryName]);
        return Promise.resolve(category);
    },

    // Events
    getEvents: function (categoryName, pageNumber, pageSize) {
        return pageItems(pageNumber, pageSize, allEvents);
    },

    // Get Single Event
    getEvent: function (eventName) {
        var event = _.find(allEvents, ['name', eventName]);
        return Promise.resolve(event);
    }
};

// helpers
function pageItems(pageNumber, pageSize, items) {
    var pageItems = _.take(_.drop(items, pageSize * (pageNumber - 1)), pageSize);
    var totalCount = items.length;
    return Promise.resolve({
        items: pageItems,
        totalCount: totalCount
    });
}

// Helpers
Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};


// export
module.exports = eventsService;