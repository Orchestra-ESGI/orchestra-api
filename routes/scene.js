var express = require('express');
var router = express.Router();

const { BROKERURL, mqtt, clientOpts } = require('../config');
const client = mqtt.connect(BROKERURL, clientOpts);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

router.post('/', async function(req, res, next) {

    if (req.body.friendly_name || req.body.friendly_name != "" || req.body.actions) {
        for (let i in req.body.scene.actions) {
            client.publish('zigbee2mqtt/' + req.body.scene.actions[i].friendly_name + '/set', JSON.stringify({ state: req.body.scene.actions[i].state }));
            await sleep(2000);
        }
    }

    res.send({
        error: null
    });
});

module.exports = router;