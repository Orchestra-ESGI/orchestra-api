var express = require('express');
var router = express.Router();
const { createMqttClient } = require('../config');

router.post('/', async function(req, res, next) {

    const mqttClient = await createMqttClient();
    if (!req.body.friendly_name || req.body.friendly_name == "" || !req.body.actions) {
        res.send({
            error: "error"
        })
    }

    await mqttClient.publish('zigbee2mqtt/' + req.body.friendly_name + '/set', JSON.stringify(req.body.actions));

    await mqttClient.end();
    res.send({
        error: null
    });
});

module.exports = router;