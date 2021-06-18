const BROKERURL = process.env.BROKERURL || "mqtt://192.168.1.33:1883";
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const MONGODBURL = process.env.MONGODBURL || "mongodb://localhost:27017";
const mqtt = require('async-mqtt');
const clientOpts = {
    username: "pi",
    password: "nassimpi",
    clientId: "API"
}
const fs = require('fs');

async function createMqttClient() {
    return await mqtt.connect(BROKERURL, clientOpts);
}

async function createMongoDBClient() {
    const client = new MongoClient(MONGODBURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    return client;
}

function createTimer(devices, res, client) {
    return setTimeout(async () => {
        for (let i in devices) {
            devices[i]["is_reachable"] = devices[i]['is_complete'];
            delete devices[i]['is_complete'];
        }
        await client.end()
        
        res.send({
            devices: devices,
            error: null
        });
        return;
    }, 3000);
}

function getType(json) {
    var type = "unkown";
    if (json.definition) {
        const rawActionConf = fs.readFileSync('./configuration/supported_device.json');
        const actionConf = JSON.parse(rawActionConf);
        for (let i in actionConf) {
            if (actionConf[i].brand === json.definition.vendor) {
                for (let j in actionConf[i].devices) {
                    if (actionConf[i].devices[j].model === json.definition.model) {
                        type = actionConf[i].devices[j].type
                    }
                }
            }
        }
    }
    return type;
}

module.exports = {
    ObjectId,
    fs,
    getType,
    createMongoDBClient,
    createMqttClient,
    createTimer
};
