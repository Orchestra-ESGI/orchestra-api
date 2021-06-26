const {
    createMongoDBClient,
    createMqttClient,
    getType,
    getHasColor
} = require('./config');

(async () => {
    const client = await createMongoDBClient();
    const mqttClient = await createMqttClient();
    const col = client.db("orchestra").collection('device');
    await col.createIndex({ friendly_name: 1 }, { unique: true } );

    const mqttTopic = "zigbee2mqtt/bridge/devices";
    await mqttClient.subscribe(mqttTopic);

    //Called twice dunno why ???????
    mqttClient.on('message', async (topic, message) => {
        if (topic === mqttTopic) {
            var parsedMessage = JSON.parse(message.toString());
            for(let i in parsedMessage) {
                if (parsedMessage[i].friendly_name !== "Coordinator") {
                    var device = await col.find({ friendly_name: parsedMessage[i].friendly_name }).toArray();
                    if (device.length === 0) {
                        if (parsedMessage[i].definition) {
                            var type = getType(parsedMessage[i]);
                            var color = getHasColor(parsedMessage[i]);
                            var insertDevice = {
                                "type": type,
                                "name": parsedMessage[i].definition.description,
                                "friendly_name": parsedMessage[i].friendly_name,
                                "color": color,
                                "manufacturer": parsedMessage[i].definition.vendor,
                                "model": parsedMessage[i].definition.model,
                                "background_color": type === "unknown" ? "#FF0000" : "#00FF00"
                            }
                            await col.insertOne(insertDevice);
                        }
                    }
                }
            }
        }
    });
})();