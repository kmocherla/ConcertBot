var util = require('util');
var builder = require('botbuilder');
var stringUtils = require('./string-utils.js');
var bingSearchService = require('./bing-search-service.js');
var urlObj = require('url');

var lib = new builder.Library('search');
lib.dialog('bing', [
    function (session, args) {
        session.dialogData.celebrity = args.celebrity;
        var query = session.dialogData.celebrity + " Live Concerts Las Vegas";

        bingSearchService.findArticles(query).then((bingSearch) => {

            session.send(stringUtils.SearchTopicTypeMessage);

            var bingResult = prepareResult(query, bingSearch.webPages.value[0]);

            var summaryText = util.format("### [%s](%s)\n%s\n\n", bingResult.title,
                bingResult.url, bingResult.snippet);

            summaryText += util.format("*%s*", util.format(stringUtils.PoweredBy,
                util.format("[Bing™](https://www.bing.com/search/?q=%s site:wikipedia.org)",
                    bingResult.query)));

            session.send(summaryText).endDialog();
        });
    },
    function (session, args) {
        session.dialogData.celebrity = args.celebrity;
        session.beginDialog('search:bing');
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};


function prepareResult(query, bingSearchResult) {
    var myUrl = urlObj.parse(bingSearchResult.url, true);
    var bingResult = {};

    if (myUrl.host == "www.bing.com" && myUrl.pathname == "/cr") {
        bingResult.url = myUrl.query["r"];
    } else {
        bingResult.url = bingSearchResult.url;
    }

    bingResult.title = bingSearchResult.name;
    bingResult.query = query;
    bingResult.snippet = bingSearchResult.snippet;

    return bingResult;
}