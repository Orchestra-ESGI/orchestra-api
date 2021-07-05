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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

router.get('/all', verifyHeaders, async (req, res) => {

    try {
        var newMqttClient = createMqttClient();
        console.log("Orchestra - Getting all devices...");
        await connectMongoClient();
        const col = client.db("orchestra").collection('device');
    
        var devices = await col.find().toArray();
        let rawActionConf = fs.readFileSync('./configuration/device_configuration.json');
        let actionConf = JSON.parse(rawActionConf);
        console.log("Action conf");
        console.log(actionConf);

        var count = 0;
        var interval = setInterval(async () => {
            if(count > devices.length - 1){
                clearInterval(interval);
                return;
            }
            console.log("INTERVAL");
            if (devices[count].type !== "occupancy" && devices[count].type !== "contact" &&
            devices[count].type !== "programmableswitch" && devices[count].type !== "temperatureandhumidity" &&
            devices[count].type !== "temperature" && devices[count].type !== "humidity") {
                console.log("SUBSCRIBING TOPIC");
                console.log(devices[count].friendly_name);
                await newMqttClient.subscribe("zigbee2mqtt/" + devices[count].friendly_name);
                await newMqttClient.publish("zigbee2mqtt/" + devices[count].friendly_name + "/get", JSON.stringify({ "state": ""}));
            }
            
            count += 1;
        }, 100);
    
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
            }
        }

        var timer = await createTimer(devices, res, newMqttClient);

        newMqttClient.on('message', async (topic, message) => {
            const friendlyName = topic.split('/');
            const index = devices.findIndex(elem => elem.friendly_name === friendlyName[1]);
            if (index !== -1) {
                if (topic === 'zigbee2mqtt/' + devices[index].friendly_name) {
                    if (!devices[index].is_complete) {
                        console.log(devices[index].friendly_name);
                        clearTimeout(timer);
                        let parsedMessage = JSON.parse(message.toString());
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
                        console.log("UNSUBSCRIBING TOPIC");
                        console.log(devices[index].friendly_name);
                        await newMqttClient.unsubscribe(topic);
                        devices[index].is_complete = true;
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
                    room_id: req.body.room._id
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