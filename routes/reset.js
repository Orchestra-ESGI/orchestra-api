var express = require('express');
var router = express.Router();

const { BROKERURL, mqtt, clientOpts } = require('../config');
const client = mqtt.connect(BROKERURL, clientOpts);

router.get('/', function(req, res, next) {

    let deviceNeedsToBeReset = true

    if (deviceNeedsToBeReset) {
        client.publish('zigbee2mqtt/bridge/request/touchlink/factory_reset', '')
    }

    res.send({
        error: null
    });
});

module.exports = router;
