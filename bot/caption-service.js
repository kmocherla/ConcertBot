// The exported functions in this module makes a call to Microsoft Cognitive Service Computer Vision API and return caption
// description if found. Note: you can do more advanced functionalities like checking
// the confidence score of the caption. For more info checkout the API documentation:
// https://www.microsoft.com/cognitive-services/en-us/Computer-Vision-API/documentation/AnalyzeImage

var request = require('request').defaults({ encoding: null });

var VISION_URL = 'https://westcentralus.api.cognitive.microsoft.com/vision/v1.0/analyze?visualFeatures='
+'Categories,Tags,Faces,ImageType,Color,Description';

/** 
 *  Gets the caption of the image from an image stream
 * @param {stream} stream The stream to an image.
 * @return {Promise} Promise with caption string if succeeded, error otherwise
 */
exports.getCaptionFromStream = function (stream) {
    return new Promise(
        function (resolve, reject) {
            var requestData = {
                url: VISION_URL,
                encoding: 'binary',
                json: true,
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.MICROSOFT_VISION_API_KEY,
                    'content-type': 'application/octet-stream'
                }
            };

            stream.pipe(request.post(requestData, function (error, response, body) {
                if (error) {
                    reject(error);
                } else if (response.statusCode !== 200) {
                    reject(body);
                } else {
                    var parsedJson = JSON.parse(JSON.stringify(body));
                    console.log(JSON.stringify(parsedJson));
                    console.log(parsedJson);
                    var info = extractInfo(parsedJson);
                    if(!info) {
                        info = extractCaption(parsedJson);
                    }
                    resolve(info);
                }
            }));
        }
    );
};

/** 
 * Gets the caption of the image from an image URL
 * @param {string} url The URL to an image.
 * @return {Promise} Promise with caption string if succeeded, error otherwise
 */
exports.getCaptionFromUrl = function (url) {
    return new Promise(
        function (resolve, reject) {
            var requestData = {
                url: VISION_URL,
                json: { 'url': url },
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.MICROSOFT_VISION_API_KEY
                }
            };

            request.post(requestData, function (error, response, body) {
                if (error) {
                    reject(error);
                }
                else if (response.statusCode !== 200) {
                    reject(body);
                }
                else {
                    resolve(extractCaption(body));
                }
            });
        }
    );
};

/**
 * Extracts the caption description from the response of the Vision API
 * @param {Object} body Response of the Vision API
 * @return {string} Description if caption found, null otherwise.
 */
function extractCaption(body) {
    if (body && body.description && body.description.captions && body.description.captions.length) {
        return body.description.captions[0].text;
    }

    return null;
}

/**
 * Extracts the caption description from the response of the Vision API
 * @param {Object} body Response of the Vision API
 * @return {string} Description if caption found, null otherwise.
 */
function extractInfo(parsedJson) {

    if(parsedJson
        && parsedJson.categories
        && parsedJson.categories[0].name
        && parsedJson.categories[0].detail) {

        var detail = parsedJson.categories[0].detail;
        if(parsedJson.categories[0].name === 'people_') { // celebrity
            if(detail
                && detail.celebrities
                && detail.celebrities[0]
                && detail.celebrities[0].name) {
                return detail.celebrities[0].name;
            }
        } else if(parsedJson.categories[0].name === 'building_'
                    || parsedJson.categories[0].name === 'outdoor_') { // landmarks
            if(detail
                && detail.landmarks
                && detail.landmarks[0]
                && detail.landmarks[0].name) {
                return detail.landmarks[0].name;
            }
        }
    }
    return null;
}