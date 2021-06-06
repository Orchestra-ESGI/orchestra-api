const fs = require('fs');
var express = require('express');
var router = express.Router();

const { createMqttClient, convertXyColorToHex, createTimer } = require('../config');

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

    var timer = createTimer(mockDevices, res);

    //Called twice dunno why ???????
    client.on('message', (topic, message) => {
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
        timer = createTimer(mockDevices, res);
    });
});

router.get('/supported', async function(req, res, next) {

    let rawdata = fs.readFileSync('supported_device.json');
    let supportedDevices = JSON.parse(rawdata);

    res.send(supportedDevices);
});

module.exports = router;