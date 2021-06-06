const fs = require('fs');
const yaml = require('yaml');
var express = require('express');
var router = express.Router();

const {
    createMqttClient,
    convertXyColorToHex,
    createTimer,
    mqttFactoryReset,
    sleep
} = require('../config');

router.get('/all', async function(req, res, next) {

    let client = await createMqttClient();

    let rawDevices = fs.readFileSync('mockDevice.json');
    let rawActionConf = fs.readFileSync('devices.json');
    let actionConf = JSON.parse(rawActionConf);
    var mockDevices = JSON.parse(rawDevices);
    for (let i in mockDevices) {
        let action = actionConf.lightbulb[mockDevices[i].manufacturer];
        mockDevices[i]["is_complete"] = false;
        mockDevices[i]["actions"] = action.actions;
        await client.subscribe("zigbee2mqtt/" + mockDevices[i].friendly_name);
        await client.publish("zigbee2mqtt/" + mockDevices[i].friendly_name + "/get", JSON.stringify({ "state": "", "color": { "hex": "" } }));
    }

    var timer = createTimer(mockDevices, res, client);

    //Called twice dunno why ???????
    client.on('message', async (topic, message) => {
        clearTimeout(timer);
        let parsedMessage = JSON.parse(message.toString());
        let friendlyName = topic.split('/')[1];
        let index = mockDevices.findIndex(device => device.friendly_name === friendlyName);
        if (mockDevices[index]["is_complete"] === false) {
            switch(mockDevices[index].type) {
                case 'lightbulb': 
                    mockDevices[index].actions.state = parsedMessage.state;
                    mockDevices[index].actions.brightness["current_state"] = parsedMessage.brightness;
                    mockDevices[index].actions.color.hex = convertXyColorToHex(parsedMessage.color.x, parsedMessage.color.y, parsedMessage.brightness);
                    mockDevices[index].actions.color_temp["current_state"] = parsedMessage.color_temp;
                    break;
            }
        }

        mockDevices[index].is_complete = true;
        timer = createTimer(mockDevices, res, client);
    });
});

router.get('/supported', async function(req, res, next) {

    let rawdata = fs.readFileSync('supported_device.json');
    let supportedDevices = JSON.parse(rawdata);

    res.send(supportedDevices);
});

router.post('/add', async function(req, res, next) {

    let client = await createMqttClient();
    var count = 0;

    const file = fs.readFileSync('../opt/zigbee2mqtt/data/configuration.yaml', 'utf8')
    let parsedFile = yaml.parse(file);
    let oldFriendlyNames = Object.keys(parsedFile.devices);

    if (req.body.reset) {
        await mqttFactoryReset(client);
        await sleep(3000);
    }

    let newFile = fs.readFileSync('../opt/zigbee2mqtt/data/configuration.yaml', 'utf8');
    let newParsedFile = yaml.parse(newFile);
    let newFriendlyNames = Object.keys(newParsedFile.devices);

    while(oldFriendlyNames.length === newFriendlyNames.length && count <= 5) {
        let newFile = fs.readFileSync('../opt/zigbee2mqtt/data/configuration.yaml', 'utf8');
        let newParsedFile = yaml.parse(newFile);
        newFriendlyNames = Object.keys(newParsedFile.devices);
        count += 1
        await sleep(2000);
    }

    if (count >= 5) {
        res.send({
            error: "Timed out, searching exceeded limit"
        });
        return;
    }

    var friendlyName = ""

    for (let i in newFriendlyNames) {
        if(!oldFriendlyNames.includes(newFriendlyNames[i])) {
            friendlyName = newFriendlyNames[i];
        }
    }

    let objectConf = {
        friendly_name: friendlyName,
        ...req.body
    }

    const rawConf = fs.readFileSync('mockDevice.json');
    var conf = JSON.parse(rawConf);

    conf.push(objectConf);

    fs.writeFileSync('mockDevice.json', JSON.stringify(conf));

    await client.end();

    res.send({
        error: null
    });
});

router.post('/action', async function(req, res, next) {

    let client = await createMqttClient();

    //await client.subscribe("zigbee2mqtt/" + req.body.friendly_name);
    await client.publish("zigbee2mqtt/" + req.body.friendly_name + "/set", JSON.stringify(req.body.actions));

    await client.end();
    res.send({
        error: null
    });
});

module.exports = router;