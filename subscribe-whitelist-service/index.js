const database = require('./aws-services/mySqlService.js');
const Web3 = require('web3');

//let web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
let web3 = new Web3(new Web3.providers.WebsocketProvider('wss://humbly-learning-spaniel.quiknode.io/de6d5d0a-acdb-43c4-9ff3-a94bc3599135/qNEkiNnOzjxwRd8HTXReSQ==/'));

let eventSignature = web3.eth.abi.encodeEventSignature('ModifyWhitelist(address,uint256,address,uint256,uint256,uint256,bool)');
var subscription = web3.eth.subscribe('logs', { topics: [eventSignature] }, function (error, result) {
    if (!error)
        console.log(result);
})
.on('data', async function (log) {
    let inputs = [
        {
            "indexed": true,
            "name": "_investor",
            "type": "address"
        },
        {
            "indexed": false,
            "name": "_dateAdded",
            "type": "uint256"
        },
        {
            "indexed": true,
            "name": "_addedBy",
            "type": "address"
        },
        {
            "indexed": false,
            "name": "_fromTime",
            "type": "uint256"
        },
        {
            "indexed": false,
            "name": "_toTime",
            "type": "uint256"
        },
        {
            "indexed": false,
            "name": "_expiryTime",
            "type": "uint256"
        },
        {
            "indexed": false,
            "name": "_canBuyFromSTO",
            "type": "bool"
        }
    ];
    let event = getEventFromLog(inputs, log);
    await insertEventIntoMySQL(event);
})
.on('changed', function (log) {
})
.on('error', console.error);

function getEventFromLog (inputs, log) {
    let decodedLog = web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1))
    decodedLog.log = log;
    return decodedLog
}

async function insertEventIntoMySQL (event) {
    let eventToInsert = 
        [
            event.log.id,
            event._investor, 
            event._dateAdded, 
            event._addedBy, 
            event._fromTime, 
            event._toTime, 
            event._expiryTime, 
            event._canBuyFromSTO !== null, 
            JSON.stringify(event.log) 
        ];
    let query = `INSERT INTO kovan.LogModifyWhitelist (id, investor, dateAdded, addedBy, fromTime, toTime, expiryTime, canBuyFromSTO, raw) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY
    UPDATE investor = VALUES(investor), dateAdded = VALUES(dateAdded), addedBy = VALUES(addedBy), fromTime = VALUES(fromTime), toTime = VALUES(toTime), expiryTime = VALUES(expiryTime), canBuyFromSTO = VALUES(canBuyFromSTO), raw = VALUES(raw)`;
    let result = await database.query(query, eventToInsert);
    console.log(result);
}