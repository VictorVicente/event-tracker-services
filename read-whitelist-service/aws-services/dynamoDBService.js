// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Create the DynamoDB service object
var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.putItem = function (key, item) {
    return new Promise((resolve, reject) => {
        var params = {
            TableName: 'polymathScriptsData',
            Key: { scriptName: key },
            Item: item
        };
        docClient.put(params, function(err, data) {
            if (err) {
                console.log(`Error in writing the item, More descripted error is: ${err}`); // an error occurred
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
};

module.exports.getItem = function (key) {
    return new Promise((resolve, reject) => {
        var params = {
            TableName: 'polymathScriptsData',
            Key: { scriptName: key }
        };
        docClient.get(params, function(err, data) {
            if (err) {
                console.log(`Error in getting the item, More descripted error is: ${err}`); // an error occurred
                return reject(err);
            } else {
                return resolve(data.Item);
            }
        });
    });
};
