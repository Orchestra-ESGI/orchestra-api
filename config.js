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
    password: "orchestra",
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
    return mqtt.connect(BROKERURL, clientOpts);
}

async function connectMongoClient() {
    if (!client.isConnected()) {
        await client.connect();
    }
};

async function sendNotification(title, message) {
    await connectMongoClient();
    const tokens = await client.db("orchestra").collection("fcm").find().toArray();
    const notification = {
        notification: {
            title: title,
            body: message
        }
    };
    var tokensArray = tokens.map(elem => elem.token);
    pushNotification(tokensArray, notification);
    /*
    let fcmPromisesArray = tokens.map(elem => {

        var token = elem.token;

        return admin.messaging().sendToDevice(token, notification)
            .then(function (response) {
              return true;
            })
            .catch(function (error) {
                console.log("Error sending message to ", token);
                return false;
            });
    });
    
    let results = await Promise.all(fcmPromisesArray);
    let successCount = results.reduce((acc, v) => v ? acc + 1 : acc, 0);
    console.log(`Orchestra - Push notification`);
    console.log(`Successfully sent messages to ${successCount}/${results.length} devices.`);
    return;
    */
}

function pushNotification(tokens, payload) {
    return admin.messaging().sendToDevice(tokens, payload);
}

async function createTimer(devices, res, mqttClient) {
    return setTimeout(async () => {
        try {
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
