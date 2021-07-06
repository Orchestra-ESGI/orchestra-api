const {
    client,
    getType,
    getHasColor,
    getOnAndOffValues,
    getProgrammableSwitchValues,
    sendNotification,
    connectMongoClient,
    createMqttClient
} = require('./config');

async function createRoomIfNeeded(roomCol) {
    let rooms = await roomCol.find().toArray();
    if (rooms.length === 0) {
        let insertRooms = [
            {
                name: "Living room"
            },
            {
                name: "Kitchen"
            },
            {
                name: "Bedroom"
            },
            {
                name: "Bathroom"
            },
            {
                name: "Garage"
            }
        ]
        for (let i in insertRooms) {
            console.log("Orchestra - Instering rooms");
            console.log(insertRooms[i])
            await roomCol.insertOne(insertRooms[i]);
        }
    }
}

(async function newDeviceListener() {
    try {
        var newMqttClient = createMqttClient();
        await connectMongoClient();
        const col = client.db("orchestra").collection('device');
        const automationCol = client.db('orchestra').collection('automation');
        await col.createIndex({ friendly_name: 1 }, { unique: true } );

        const mqttTopic = "zigbee2mqtt/bridge/devices";
        await newMqttClient.subscribe(mqttTopic);

        const roomCol = client.db('orchestra').collection('room');
        await roomCol.createIndex({ name: 1 }, { unique: true } );
        await createRoomIfNeeded(roomCol);

        var subbedTopic = await automationCol.find().toArray();
        for (let i in subbedTopic) {
            await newMqttClient.subscribe('zigbee2mqtt/' + subbedTopic[i].trigger.friendly_name);
        }

        //Called twice dunno why ???????
        newMqttClient.on('message', async (topic, message) => {

            var subbedTopic = await automationCol.find().toArray();
            for (let i in subbedTopic) {
                await newMqttClient.subscribe('zigbee2mqtt/' + subbedTopic[i].trigger.friendly_name);
            }
            
            console.log("Orchestra - NEW MESSAGE LISTENER");
            console.log(topic);

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
                                var values = [];
                                if (type === "occupancy" || type === "contact") {
                                    values = getOnAndOffValues(parsedMessage[i]);
                                } else if (type === "programmableswitch") {
                                    values = getProgrammableSwitchValues(parsedMessage[i]);
                                }
                                var room = await client.db("orchestra").collection('room').find({ name: "Living room" }).toArray();
                                var insertDevice = {
                                    "type": type,
                                    "name": parsedMessage[i].definition.description,
                                    "friendly_name": parsedMessage[i].friendly_name,
                                    "room_id": String(room[0]._id),
                                    "manufacturer": parsedMessage[i].definition.vendor,
                                    "model": parsedMessage[i].definition.model,
                                    "background_color": type === "unknown" ? "#D12B31" : "#41464D"
                                }
                                if (type === "lightbulb") {
                                    insertDevice["color"] = color
                                }

                                if (type === "occupancy" || type === "contact") {
                                    insertDevice["onValue"] = values[0];
                                    insertDevice["offValue"] = values[1];
                                }

                                if (type === "programmableswitch") {
                                    insertDevice["switch_values"] = values
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
                        if (element.trigger.type === "contact" ||
                            element.trigger.type === "occupancy") {
                                console.log("Orchestra - Occupancy automation");
                                const triggerDevice = await col.find({ friendly_name: element.trigger.friendly_name }).toArray();
                                if (triggerDevice.length != 0) {
                                    var val = triggerDevice[0].onValue;
                                    if (element.trigger.actions.state == "on") {
                                        val = triggerDevice[0].onValue;
                                    } else {
                                        val = triggerDevice[0].offValue;
                                    }
                                    console.log("Orchestra - sensor val");
                                    console.log(element);
                                    console.log(val);
                                    console.log(parsedMessage);
                                    if (parsedMessage[element.trigger.type] === val) {
                                        for (let i in element.targets) {
                                            await newMqttClient.publish('zigbee2mqtt/' + element.targets[i].friendly_name + '/set', JSON.stringify(element.targets[i].actions));
                                        }
                                        if (element.notify) {
                                            await sendNotification("Uh oh", element.name + " has been launched");
                                        }
                                    }
                                }
                            } else if (element.trigger.type === "temperature" || element.trigger.type === "humidity") {
                                console.log("Orchestra - Temperature or Humidity automation");
                                var val = parseFloat(element.trigger.actions.state);
                                console.log("Orchestra - sensor val");
                                console.log(element);
                                console.log(val);
                                console.log(parsedMessage);
                                if (element.trigger.actions.operator === "gt") {
                                    if (parsedMessage[element.trigger.type] >= val) {
                                        for (let i in element.targets) {
                                            await newMqttClient.publish('zigbee2mqtt/' + element.targets[i].friendly_name + '/set', JSON.stringify(element.targets[i].actions));
                                        }
                                        if (element.notify) {
                                            await sendNotification("Uh oh", element.name + " has been launched");
                                        }
                                    }
                                } else if (element.trigger.actions.operator === "lt") {
                                    if (parsedMessage[element.trigger.type] <= val) {
                                        for (let i in element.targets) {
                                            await newMqttClient.publish('zigbee2mqtt/' + element.targets[i].friendly_name + '/set', JSON.stringify(element.targets[i].actions));
                                        }
                                        if (element.notify) {
                                            await sendNotification("Uh oh", element.name + " has been launched");
                                        }
                                    }
                                }
                            } else if (element.trigger.type === "programmableswitch") {
                                console.log("Orchestra - Programmable Switch automation");
                                const triggerDevice = await col.find({ friendly_name: element.trigger.friendly_name }).toArray();
                                if (triggerDevice.length != 0) {
                                    const switchValues = triggerDevice[0].switch_values;
                                    console.log("Orchestra - Programmable Switch element");
                                    var filteredResult = switchValues.filter(value => value.orchestra_key === element.trigger.actions.state);
                                    if (filteredResult.length !== 0) {
                                        var val = filteredResult[0].zigbee_key;
                                        console.log("Orchestra - Programmable Switch val");
                                        console.log(element);
                                        console.log(val);
                                        console.log(parsedMessage);
                                        if (parsedMessage["action"] === val) {
                                            for (let i in element.targets) {
                                                await newMqttClient.publish('zigbee2mqtt/' + element.targets[i].friendly_name + '/set', JSON.stringify(element.targets[i].actions));
                                            }
                                            if (element.notify) {
                                                await sendNotification("Uh oh", element.name + " has been launched");
                                            }
                                        }
                                    }
                                }
                            }
                    }
                });
            }
        });
    } catch (error) {
        console.error(error);
    }
})();