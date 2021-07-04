var express = require('express');
var router = express.Router();

const {
    ObjectId,
    client,
    mqttClient,
    createMqttClient,
    createTimer,
    fs,
    connectMongoClient,
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {

    try {
        const newMqttClient = createMqttClient();
        console.log("Orchestra - Getting all devices...");
        await connectMongoClient();
        const col = client.db("orchestra").collection('device');
    
        var devices = await col.find().toArray();
        let rawActionConf = fs.readFileSync('./configuration/device_configuration.json');
        let actionConf = JSON.parse(rawActionConf);
        console.log("Action conf");
        console.log(actionConf);
    
        for (let i in devices) {
            if (devices[i].type !== "unknown") {
                const roomCol = client.db("orchestra").collection('room');
                let room = await roomCol.find({ _id: ObjectId(devices[i].room_id) }).toArray();
                if (room.length !== 0) {
                    devices[i]["room"] = room[0];
                }
                let action = actionConf[devices[i].type][devices[i].manufacturer];
                devices[i]["is_complete"] = false;
                let deviceActions = devices[i].color ? action.color.actions : action.actions
                devices[i]["actions"] = deviceActions;
                if (devices[i].type !== "occupancy" || devices[i].type !== "contact" ||
                    devices[i].type !== "programmableswitch" || devices[i].type !== "temperatureandhumidity" ||
                    devices[i].type !== "temperature" || devices[i].type !== "humidity") {
                        await newMqttClient.subscribe("zigbee2mqtt/" + devices[i].friendly_name);
                        await newMqttClient.publish("zigbee2mqtt/" + devices[i].friendly_name + "/get", JSON.stringify({ "state": ""}));
                    }
            }
        }
    
        var timer = await createTimer(devices, res, newMqttClient);

        newMqttClient.on('message', async (topic, message) => {
            for (let i in devices) {
                if (topic === 'zigbee2mqtt/' + devices[i].friendly_name) {
                    if (!devices[i].is_complete) {
                        console.log(devices[i].friendly_name);
                        clearTimeout(timer);
                        let parsedMessage = JSON.parse(message.toString());
                        if (devices[i]["is_complete"] === false) {
                            switch(devices[i].type) {
                                case 'lightbulb':
                                    devices[i].actions.state = parsedMessage.state.toLowerCase();
                                    devices[i].actions.brightness["current_state"] = parsedMessage.brightness;
                                    if (devices[i].color) {
                                        devices[i].actions.color.hex = "#FF0000";
                                        devices[i].actions.color_temp["current_state"] = parsedMessage.color_temp;
                                    }
                                    break;
                                case 'switch':
                                    devices[i].actions.state = parsedMessage.state.toLowerCase();
                                    break;
                            }
                        }
    
                        devices[i].is_complete = true;
                        timer = await createTimer(devices, res, newMqttClient);
                    }
                }
            }
        });
    } catch (error) {
        console.log("ERROR 500 - CATCHED");
        console.log(error)
        res.status(500).send({
            error
        });
    }
});

router.get('/supported', async (req, res) => {
    try {
        let rawdata = fs.readFileSync('./configuration/supported_device.json');
        let supportedDevices = JSON.parse(rawdata);
    
        res.status(200).send(supportedDevices);
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.patch('/', verifyHeaders, async (req, res) => {
    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('device');
    
        await col.updateOne(
            { friendly_name: req.body.friendly_name },
            {
                $set: { 
                    name: req.body.name,
                    room_id: req.body.room._id,
                    background_color: req.body.background_color
                }
            }
        );

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.post('/reset', verifyHeaders, async (req, res) => {
    
    try {
        await mqttClient.publish('zigbee2mqtt/bridge/request/touchlink/factory_reset', '');

        res.send({
            error: null
        })
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.post('/action', verifyHeaders, async (req, res) => {

    try {
        await mqttClient.publish("zigbee2mqtt/" + req.body.friendly_name + "/set", JSON.stringify(req.body.actions));

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.delete('/', verifyHeaders, async (req, res) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('device');
        const sceneCol = client.db("orchestra").collection('scene');
    
        for (let i in req.body.friendly_names) {
            let removePayload = {
                id: req.body.friendly_names[i],
                force: true
            }
    
            await mqttClient.publish("zigbee2mqtt/bridge/request/device/remove", JSON.stringify(removePayload));
        }
    
        await sceneCol.updateMany({},
            { 
                $pull: { 
                    "devices": { 
                        friendly_name: { 
                            $in: req.body.friendly_names 
                        }
                    }
                }
            }
        );
    
        await col.deleteMany({ friendly_name: { $in: req.body.friendly_names } });

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

module.exports = router;