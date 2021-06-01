var express = require('express');
var router = express.Router();

const { BROKERURL, mqtt, clientOpts } = require('../config');
const client = mqtt.connect(BROKERURL, clientOpts);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

router.get('/', function(req, res, next) {

    let deviceNeedsToBeReset = true

    if (deviceNeedsToBeReset) {
        client.publish('zigbee2mqtt/bridge/request/touchlink/factory_reset', '')
    }

    res.send({
        error: null
    });
});

router.post('/toggle', async function(req, res, next) {

    if (req.body.friendly_name || req.body.friendly_name != "" || req.body.action) {
        client.publish('zigbee2mqtt/' + req.body.friendly_name + '/set', JSON.stringify({ state: req.body.action.state }));
    }

    res.send({
        error: null
    });
});

module.exports = router;
