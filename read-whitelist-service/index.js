const database = require('../aws-services/mySqlService.js');
const dynamoDB = require('../aws-services/dynamoDBService.js');
const Web3 = require('web3');

///////////////////////
///// Global variables
///////////////////////
let web3;

// Selected network of blockchain
const selected_network = "mainnet";

// set the provider you want from Web3.providers
if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    // set the provider you want from Web3.providers
    if (selected_network === "ganache") {
        web3 = new Web3(new Web3.providers.WebsocketProvider('wss://localhost:8545'));
    }
    else if (selected_network === "ropsten") {
        web3 = new Web3(new Web3.providers.WebsocketProvider('wss://ropsten.infura.io/ws'));
    }
    else if (selected_network === "kovan") {
        //web3 = new Web3(new Web3.providers.WebsocketProvider('wss://kovan.infura.io/ws'));
        web3 = new Web3(new Web3.providers.HttpProvider(`https://kovan.infura.io/`));
    }
    else if (selected_network === "mainnet") {
        web3 = new Web3(new Web3.providers.WebsocketProvider('wss://humbly-learning-spaniel.quiknode.io/de6d5d0a-acdb-43c4-9ff3-a94bc3599135/qNEkiNnOzjxwRd8HTXReSQ==/'));
    }
}

readData();

async function readData() {
    console.log(`Choosen network is ${selected_network.toUpperCase()}`);
    let scriptData = await dynamoDB.getItem('testFunction');
    console.log(scriptData);

    let fromBlock = parseInt(scriptData.lastBlock) + 1;
    let toBlock = (await web3.eth.getBlock('latest')).number;
    console.log(`Last block No. used to get events: ${toBlock.toString()}`);

    let eventSignature = web3.eth.abi.encodeEventSignature('LogModifyWhitelist(address,uint256,address,uint256,uint256,uint256,bool)');

    let options = {
        fromBlock: web3.utils.toHex(fromBlock),
        toBlock: web3.utils.toHex(toBlock),
        topics: [eventSignature]
    };

    let logs = await web3.eth.getPastLogs(options);
    if (logs.length == 0) {
        console.log("No logs were found.");
    } else {
        let inputs = [
            {
                "indexed": false,
                "name": "_investor",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "_dateAdded",
                "type": "uint256"
            },
            {
                "indexed": false,
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
        let events = getEventsFromLogs(inputs, logs, eventSignature);
        await insertEventsIntoMySQL(events);
    }

    scriptData.lastBlock = toBlock;
    await dynamoDB.putItem('testFunction', scriptData);
}

function getEventsFromLogs (inputs, logs, eventSignature) {
    let filteredLogs = logs.filter(l => l.topics.includes(eventSignature));
    return filteredLogs.map(function(log) {
        let decodedLog = web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1))
        decodedLog.log = log;
        return decodedLog
    });
}

async function insertEventsIntoMySQL (events) {
    let eventsToInsert = events.map(e => (
        [
            e.log.id,
            e._investor, 
            e._dateAdded, 
            e._addedBy, 
            e._fromTime, 
            e._toTime, 
            e._expiryTime, 
            e._canBuyFromSTO !== null, 
            JSON.stringify(e.log) 
        ]
    ));
    let query = `INSERT INTO ${process.env.network}.LogModifyWhitelist (id, investor, dateAdded, addedBy, fromTime, toTime, expiryTime, canBuyFromSTO, raw) 
    VALUES ?
    ON DUPLICATE KEY
    UPDATE investor = VALUES(investor), dateAdded = VALUES(dateAdded), addedBy = VALUES(addedBy), fromTime = VALUES(fromTime), toTime = VALUES(toTime), expiryTime = VALUES(expiryTime), canBuyFromSTO = VALUES(canBuyFromSTO), raw = VALUES(raw)`;
    let result = await database.query(query, [eventsToInsert]);
    console.log(result);
}