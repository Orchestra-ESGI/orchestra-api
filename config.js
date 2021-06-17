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

function convertXyColorToHex(x, y, bri) {
    z = 1.0 - x - y;

    Y = bri / 255.0; // Brightness of lamp
    X = (Y / y) * x;
    Z = (Y / y) * z;
    r = X * 1.612 - Y * 0.203 - Z * 0.302;
    g = -X * 0.509 + Y * 1.412 + Z * 0.066;
    b = X * 0.026 - Y * 0.072 + Z * 0.962;
    r = r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, (1.0 / 2.4)) - 0.055;
    g = g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, (1.0 / 2.4)) - 0.055;
    b = b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, (1.0 / 2.4)) - 0.055;
    maxValue = Math.max(r,g,b);
    r /= maxValue;
    g /= maxValue;
    b /= maxValue;
    r = r * 255;   if (r < 0) { r = 255 };
    g = g * 255;   if (g < 0) { g = 255 };
    b = b * 255;   if (b < 0) { b = 255 };

    r = Math.round(r).toString(16);
    g = Math.round(g).toString(16);
    b = Math.round(b).toString(16);

    if (r.length < 2)
        r="0"+r;        
    if (g.length < 2)
        g="0"+g;        
    if (b.length < 2)
        b="0"+r;        
    rgb = "#"+r+g+b;

    return rgb;             
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getType(json) {
    var type = "unkown";
    if (json.definition) {
        const rawActionConf = fs.readFileSync('./configuration/supported_device.json');
        const actionConf = JSON.parse(rawActionConf);
        for (let i in actionConf) {
            console.log("JSON " + JSON.stringify(json));
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
    convertXyColorToHex,
    createTimer,
    sleep
};
