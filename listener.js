const {
    createMongoDBClient,
    createMqttClient,
} = require('./config');

(async () => {
    const client = await createMongoDBClient();
    const mqttClient = await createMqttClient();
    const col = client.db("orchestra").collection('device');

    const mqttTopic = "zigbee2mqtt/bridge/devices";
    await mqttClient.subscribe(mqttTopic);

    //Called twice dunno why ???????
    mqttClient.on('message', async (topic, message) => {
        if (topic !== mqttTopic) {
            return;
        }

        let parsedMessage = JSON.parse(message.toString());
        for(let i in parsedMessage) {
            if (parsedMessage[i].friendly_name !== "Coordinator") {
                var device = await col.find({ friendly_name: parsedMessage[i].friendly_name }).toArray();
                if (device.length === 0) {
                    var insertDevice = {
                        "type": "unknown",
                        "name": parsedMessage[i].definition.description,
                        "friendly_name": parsedMessage[i].friendly_name,
                        "manufacturer": parsedMessage[i].definition.vendor,
                        "model": parsedMessage[i].definition.model,
                        "background_color": "#FF0000"
                    }

                    await col.insertOne(insertDevice);
                }
            }
        }
    });
})();