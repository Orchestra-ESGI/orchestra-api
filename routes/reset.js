var express = require('express');
var router = express.Router();

const { createMqttClient } = require('../config');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

router.get('/', async function(req, res, next) {

    let client = await createMqttClient();

    let deviceNeedsToBeReset = true

    if (deviceNeedsToBeReset) {
        client.publish('zigbee2mqtt/bridge/request/touchlink/factory_reset', '')
    }

    await client.end()
    res.send({
        error: null
    });
});

router.post('/toggle', async function(req, res, next) {

    let client = await createMqttClient();
    if (req.body.friendly_name || req.body.friendly_name != "" || req.body.action) {
        client.publish('zigbee2mqtt/' + req.body.friendly_name + '/set', JSON.stringify({ state: req.body.action.state }));
    }


    await client.end()
    res.send({
        error: null
    });
});

module.exports = router;
