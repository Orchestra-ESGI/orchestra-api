const {
    createMongoDBClient,
    createMqttClient,
    getType,
    getHasColor
} = require('./config');

(async function newDeviceListener() {
    const client = await createMongoDBClient();
    const mqttClient = await createMqttClient();
    const col = client.db("orchestra").collection('device');
    const automationCol = client.db('orchestra').collection('automation');
    await col.createIndex({ friendly_name: 1 }, { unique: true } );

    const mqttTopic = "zigbee2mqtt/bridge/devices";
    await mqttClient.subscribe(mqttTopic);

    var subbedTopic = await automationCol.find().toArray();
    subbedTopic.forEach(async (element) => {
        await mqttClient.subscribe('zigbee2mqtt/' + element.target.friendly_name);
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
                            var type = getType(parsedMessage[i]);
                            var color = getHasColor(parsedMessage[i]);
                            var room = await client.db("orchestra").collection('room').find({ name: "Living room" }).toArray();
                            var insertDevice = {
                                "type": type,
                                "name": parsedMessage[i].definition.description,
                                "friendly_name": parsedMessage[i].friendly_name,
                                "color": color,
                                "room_id": room[0]._id,
                                "manufacturer": parsedMessage[i].definition.vendor,
                                "model": parsedMessage[i].definition.model,
                                "background_color": type === "unknown" ? "#FF0000" : "#00FF00"
                            }
                            await col.insertOne(insertDevice);
                        }
                    }
                }
            }
        } else {
            const automations = await automationCol.find().toArray();
            automations.forEach(async (element) => {
                console.log("ORCHESTRA - AUTOMATIONS - ");
                console.log(element.trigger);
                console.log(element.trigger.friendly_name);
                if(topic === 'zigbee2mqtt/' + element.trigger.friendly_name) {
                    switch (element.trigger.type) {
                        case "occupancy":
                            if (parsedMessage.occupancy === element.trigger.state) {
                                for (let i in element.targets) {
                                    await mqttClient.publish('zigbee2mqtt/' + element.targets[i].friendly_name + '/set', JSON.stringify(element.targets.actions));
                                }
                            }
                            break;
                    }
                }
            });
        }
    });
})();