const fs = require('fs');
const yaml = require('yaml');
var express = require('express');
var router = express.Router();
const { execSync } = require('child_process');

const {
    createMongoDBClient,
    createMqttClient,
    convertXyColorToHex,
    createTimer,
    mqttFactoryReset,
    sleep
} = require('../config');

router.get('/all', async function(req, res, next) {
    const client = await createMongoDBClient();
    const mqttClient = await createMqttClient();

    const col = client.db("orchestra").collection('device');

    var devices = await col.find().toArray();
    let rawActionConf = fs.readFileSync('./configuration/device_configuration.json');
    let actionConf = JSON.parse(rawActionConf);

    for (let i in devices) {
        if (devices[i].type !== "unknown") {
            let action = actionConf.lightbulb[devices[i].manufacturer];
            devices[i]["is_complete"] = false;
            devices[i]["actions"] = action.actions;
            await mqttClient.subscribe("zigbee2mqtt/" + devices[i].friendly_name);
            await mqttClient.publish("zigbee2mqtt/" + devices[i].friendly_name + "/get", JSON.stringify({ "state": "", "color": { "hex": "" } }));
        }
    }

    var timer = createTimer(devices, res, mqttClient);

    //Called twice dunno why ???????
    mqttClient.on('message', async (topic, message) => {
        clearTimeout(timer);
        let parsedMessage = JSON.parse(message.toString());
        let friendlyName = topic.split('/')[1];
        let index = devices.findIndex(device => device.friendly_name === friendlyName);
        if (devices[index]["is_complete"] === false) {
            switch(devices[index].type) {
                case 'lightbulb':
                    devices[index].actions.state = parsedMessage.state;
                    devices[index].actions.brightness["current_state"] = parsedMessage.brightness;
                    if (parsedMessage.color) {
                        devices[index].actions.color.hex = convertXyColorToHex(parsedMessage.color.x, parsedMessage.color.y, parsedMessage.brightness);
                    } else {
                        devices[index].actions.color.hex = ""
                    }
                    devices[index].actions.color_temp["current_state"] = parsedMessage.color_temp;
                    break;
            }
        }

        devices[index].is_complete = true;
        timer = createTimer(devices, res, mqttClient);
    });
});

router.get('/supported', async function(req, res, next) {

    let rawdata = fs.readFileSync('./configuration/supported_device.json');
    let supportedDevices = JSON.parse(rawdata);

    res.send(supportedDevices);
});

router.post('/add', async function(req, res) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('device');

    await col.updateOne(
        { friendly_name: req.body.friendly_name },
        { 
            $set: { 
                name: req.body.name,
                room_name: req.body.room_name,
                background_color: req.body.background_color,
                type: req.body.type
            } 
        }
    );

    res.send({
        error: null
    });
});

router.post('/reset', async function(req, res, next) {
    const mqttClient = await createMqttClient();
    await mqttClient.publish('zigbee2mqtt/bridge/request/touchlink/factory_reset', '');
    await mqttClient.end()

    res.send({
        error: null
    })
});

router.post('/action', async function(req, res) {

    const mqttClient = await createMqttClient();
    await mqttClient.publish("zigbee2mqtt/" + req.body.friendly_name + "/set", JSON.stringify(req.body.actions));
    await mqttClient.end();

    res.send({
        error: null
    });
});

router.delete('/:id', async function(req, res) {
    const client = await createMongoDBClient();
    const mqttClient = await createMqttClient();

    const col = client.db("orchestra").collection('device');

    let removePayload = {
        id: req.params.id,
        force: true
    }
    await mqttClient.publish("zigbee2mqtt/bridge/request/device/remove", JSON.stringify(removePayload));
    await mqttClient.end();
    
    const file = fs.readFileSync('/opt/zigbee2mqtt/data/configuration.yaml', 'utf8')
    let parsedFile = yaml.parse(file);
    delete parsedFile.devices[req.params.id];
    fs.writeFileSync('/opt/zigbee2mqtt/data/configuration.yaml', yaml.stringify(parsedFile));
    console.log("Written")


    execSync('python /orchestra-api/delete.py ' + req.params.id);
    console.log("Executed python func")
    await col.deleteOne({ friendly_name: req.params.id });
    console.log("delete from db")

    res.send({
        error: null
    });
});

module.exports = router;