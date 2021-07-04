const BROKERURL = process.env.BROKERURL || "mqtt://orchestra.local:1883";
const MONGODBURL = process.env.MONGODBURL || "mongodb://localhost:27017";
const JWT_KEY = process.env.JWT_KEY || "orchestra";
const APP_KEY = process.env.APP_KEY || "orchestra";
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const jwt = require('jsonwebtoken');
const mqtt = require('async-mqtt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const clientOpts = {
    username: "pi",
    password: "orchestrapi",
    clientId: "API"
}
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'orchestra.nrv.dev@gmail.com',
        pass: 'GSr6Dw&6$Qj7#2'
    }
});
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-credentials.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const mqttClient = mqtt.connect(BROKERURL, clientOpts);
const client = new MongoClient(MONGODBURL, { useNewUrlParser: true, useUnifiedTopology: true });

function createMqttClient() {
    const mqttClient = mqtt.connect(BROKERURL, clientOpts);
    return mqttClient;
}

async function connectMongoClient() {
    await client.connect();
};

async function sendNotification(title, message) {
    await connectMongoClient();
    const tokens = await client.db("orchestra").collection("fcm").find().toArray();
    const registratedTokens = tokens.map(elem => elem.token);
    const notification = {
        notification: {
            title: title,
            body: message
        }
    };
    const options = {
        priority: "high",
        timeToLive: 60 * 60 * 24
      };

    admin.messaging().sendToDevice(registratedTokens, notification, options).then( response => {
        console.log("Notification sent successfully");
    }).catch( error => {
        console.log(error);
    });
}

async function createTimer(devices, res, mqttClient) {
    return setTimeout(async () => {
        try {
            console.log("Orchestra - TIMER");
            for (let i in devices) {
                devices[i]["is_reachable"] = devices[i]['is_complete'];
                delete devices[i]['is_complete'];
            }
            
            console.log("Sending response :");
            console.log(devices);
            await mqttClient.end();
            res.send({
                devices,
                error: null
            });
        } catch (error) {
            console.log("TIMER ERROR");
            console.log(error);
            res.status(500).send({
                error
            });
        }
        
        return;
    }, 3000);
}

function getType(json) {
    var type = "unknown";
    try {
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
    } catch (error) {
        console.error(error);
    }

    return type;
}

function getHasColor(json) {
    var color = false;
    try {
        if (json.definition) {
            const rawActionConf = fs.readFileSync('./configuration/supported_device.json');
            const actionConf = JSON.parse(rawActionConf);
            for (let i in actionConf) {
                if (actionConf[i].brand === json.definition.vendor) {
                    for (let j in actionConf[i].devices) {
                        if (actionConf[i].devices[j].model === json.definition.model) {
                            color = actionConf[i].devices[j].color
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(error);
    }

    return color;
}

function getOnAndOffValues(json) {
    var values = [];
    try {
        if (json.definition) {
            const rawActionConf = fs.readFileSync('./configuration/supported_device.json');
            const actionConf = JSON.parse(rawActionConf);
            for (let i in actionConf) {
                if (actionConf[i].brand === json.definition.vendor) {
                    for (let j in actionConf[i].devices) {
                        if (actionConf[i].devices[j].model === json.definition.model) {
                            values.push(actionConf[i].devices[j].onValue);
                            values.push(actionConf[i].devices[j].offValue);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(error);
    }

    return values;
}

function getProgrammableSwitchValues(json) {
    var values = [];
    try {
        if (json.definition) {
            const rawActionConf = fs.readFileSync('./configuration/supported_device.json');
            const actionConf = JSON.parse(rawActionConf);
            for (let i in actionConf) {
                if (actionConf[i].brand === json.definition.vendor) {
                    for (let j in actionConf[i].devices) {
                        if (actionConf[i].devices[j].model === json.definition.model) {
                            values = actionConf[i].devices[j].switch_values;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(error);
    }

    return values;
}

module.exports = {
    ObjectId,
    JWT_KEY,
    APP_KEY,
    jwt,
    fs,
    transporter,
    getType,
    getHasColor,
    createTimer,
    getOnAndOffValues,
    getProgrammableSwitchValues,
    sendNotification,
    mqttClient,
    client,
    connectMongoClient,
    createMqttClient
};
