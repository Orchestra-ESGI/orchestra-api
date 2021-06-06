var express = require('express');
var router = express.Router();

const { createMqttClient } = require('../config');

router.post('/', async function(req, res, next) {

    let client = await createMqttClient();

    if (req.body.friendly_name || req.body.friendly_name != "" || req.body.actions) {
        client.publish('zigbee2mqtt/' + req.body.friendly_name + '/set', JSON.stringify(req.body.scene.actions));
    }

    await client.end()
    res.send({
        error: null
    });
});

module.exports = router;