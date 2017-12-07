var util = require('util');
var builder = require('botbuilder');

var lib = new builder.Library('qna');
lib.dialog('/', [
    function (session, args) {
        var recognizer = new cognitiveservices.QnAMakerRecognizer({
            knowledgeBaseId: 'set your kbid here', 
            subscriptionKey: 'set your subscription key here',
            top: 4});

        var qnaMakerTools = new cognitiveservices.QnAMakerTools();
//        bot.library(qnaMakerTools.createLibrary());
            
        var basicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
            recognizers: [recognizer],
            defaultMessage: 'No match! Try changing the query terms!',
            qnaThreshold: 0.3,
            feedbackLib: qnaMakerTools,
            question: args.text
        });

        // Override to also include the knowledgebase question with the answer on confident matches
        basicQnAMakerDialog.respondFromQnAMakerResult = function(session, qnaMakerResult) {
            var result = qnaMakerResult;
            console.log(result);
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
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};