const {
    createMongoDBClient,
    createMqttClient,
    getType
} = require('./config');

(async () => {
    const client = await createMongoDBClient();
    const mqttClient = await createMqttClient();
    const col = client.db("orchestra").collection('device');

    const mqttTopic = "zigbee2mqtt/bridge/devices";
    await mqttClient.subscribe(mqttTopic);

    //Called twice dunno why ???????
    mqttClient.on('message', async (topic, message) => {
        if (topic === mqttTopic) {
            var parsedMessage = JSON.parse(message.toString());
            for(let i in parsedMessage) {
                if (parsedMessage[i].friendly_name !== "Coordinator") {
                    console.log(parsedMessage[i].friendly_name);
                    var device = await col.find({ friendly_name: parsedMessage[i].friendly_name }).toArray();
                    if (device.length === 0) {
                        if (parsedMessage[i].definition) {
                            var type = getType(parsedMessage[i]);
                            var insertDevice = {
                                "type": type,
                                "name": parsedMessage[i].definition.description,
                                "friendly_name": parsedMessage[i].friendly_name,
                                "manufacturer": parsedMessage[i].definition.vendor,
                                "model": parsedMessage[i].definition.model,
                                "background_color": type === "unkown" ? "#FF0000" : "#00FF00"
                            }
                            await col.insertOne(insertDevice);
                        }
                    }
                }
            }
        }
    });
})();