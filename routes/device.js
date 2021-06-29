var express = require('express');
var router = express.Router();

const {
    ObjectId,
    createMongoDBClient,
    createMqttClient,
    createTimer,
    fs
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {

    try {
        const client = await createMongoDBClient();
        const mqttClient = await createMqttClient();
    
        const col = client.db("orchestra").collection('device');
    
        var devices = await col.find().toArray();
        let rawActionConf = fs.readFileSync('./configuration/device_configuration.json');
        let actionConf = JSON.parse(rawActionConf);
    
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
                await mqttClient.subscribe("zigbee2mqtt/" + devices[i].friendly_name);
                await mqttClient.publish("zigbee2mqtt/" + devices[i].friendly_name + "/get", JSON.stringify({ "state": ""}));
            }
        }
    
        var timer = createTimer(devices, res, mqttClient);
        await client.close();

        mqttClient.on('message', async (topic, message) => {
            clearTimeout(timer);
            let parsedMessage = JSON.parse(message.toString());
            let friendlyName = topic.split('/')[1];
            let index = devices.findIndex(device => device.friendly_name === friendlyName);
            if (devices[index]["is_complete"] === false) {
                switch(devices[index].type) {
                    case 'lightbulb':
                        devices[index].actions.state = parsedMessage.state.toLowerCase();
                        devices[index].actions.brightness["current_state"] = parsedMessage.brightness;
                        if (devices[index].color) {
                            devices[index].actions.color.hex = "#FF0000";
                            devices[index].actions.color_temp["current_state"] = parsedMessage.color_temp;
                        }
                        
                        break;
                    case 'switch':
                        devices[index].actions.state = parsedMessage.state.toLowerCase();
                        break;
                }
            }

            devices[index].is_complete = true;
            timer = createTimer(devices, res, mqttClient);
        });
    } catch (error) {
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
        const client = await createMongoDBClient();
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

        await client.close();
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
        const mqttClient = await createMqttClient();
        await mqttClient.publish('zigbee2mqtt/bridge/request/touchlink/factory_reset', '');
        await mqttClient.end();

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
        const mqttClient = await createMqttClient();
        await mqttClient.publish("zigbee2mqtt/" + req.body.friendly_name + "/set", JSON.stringify(req.body.actions));
        await mqttClient.end();

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
        const client = await createMongoDBClient();
        const mqttClient = await createMqttClient();
    
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

        await mqttClient.end();
        await client.close();
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