const {
    createMongoDBClient,
    createMqttClient,
    getType,
    getHasColor,
    getOnAndOffValues
} = require('./config');

(async function newDeviceListener() {
    try {
        const client = await createMongoDBClient();
        const mqttClient = await createMqttClient();
        const col = client.db("orchestra").collection('device');
        const automationCol = client.db('orchestra').collection('automation');
        await col.createIndex({ friendly_name: 1 }, { unique: true } );

        const mqttTopic = "zigbee2mqtt/bridge/devices";
        await mqttClient.subscribe(mqttTopic);

        var subbedTopic = await automationCol.find().toArray();
        subbedTopic.forEach(async (element) => {
            await mqttClient.subscribe('zigbee2mqtt/' + element.trigger.friendly_name);
        });

        //Called twice dunno why ???????
        mqttClient.on('message', async (topic, message) => {
            var parsedMessage = JSON.parse(message.toString());
            if (topic === mqttTopic) {
                for(let i in parsedMessage) {
                    if (parsedMessage[i].friendly_name !== "Coordinator") {
                        var device = await col.find({ friendly_name: parsedMessage[i].friendly_name }).toArray();
                        if (device.length === 0) {
                            if (parsedMessage[i].definition) {
                                console.log("Orchestra - Adding a new device to db");
                                var type = getType(parsedMessage[i]);
                                var color = getHasColor(parsedMessage[i]);
                                var values = (type === "occupancy") ? getOnAndOffValues(parsedMessage[i]) : [];
                                var room = await client.db("orchestra").collection('room').find({ name: "Living room" }).toArray();
                                var insertDevice = {
                                    "type": type,
                                    "name": parsedMessage[i].definition.description,
                                    "friendly_name": parsedMessage[i].friendly_name,
                                    "room_id": room[0]._id,
                                    "manufacturer": parsedMessage[i].definition.vendor,
                                    "model": parsedMessage[i].definition.model,
                                    "background_color": type === "unknown" ? "#FF0000" : "#00FF00"
                                }
                                if (type === "lightbulb") {
                                    insertDevice["color"] = color
                                }

                                if (type === "occupancy") {
                                    insertDevice["onValue"] = values[0];
                                    insertDevice["offValue"] = values[1];
                                }
                                console.log("Orchestra - Inserting this payload in db");
                                console.log(insertDevice);
                                await col.insertOne(insertDevice);
                            }
                        }
                    }
                }
            } else {
                const automations = await automationCol.find().toArray();
                automations.forEach(async (element) => {
                    if(topic === 'zigbee2mqtt/' + element.trigger.friendly_name) {
                        switch (element.trigger.type) {
                            case "occupancy":
                                console.log("Orchestra - Occupancy automation");
                                console.log(element);
                                var val = element.trigger.onValue;
                                if (element.trigger.actions.state == "on") {
                                    val = element.trigger.onValue;
                                } else {
                                    val = element.trigger.offValue;
                                }
                                console.log("Orchestra - sensor val");
                                console.log(val);
                                if (parsedMessage.occupancy === val) {
                                    for (let i in element.targets) {
                                        await mqttClient.publish('zigbee2mqtt/' + element.targets[i].friendly_name + '/set', JSON.stringify(element.targets[i].actions));
                                    }
                                }
                                break;
                        }
                    }
                });
            }
        });
    } catch (error) {
        console.error(error);
    }
})();