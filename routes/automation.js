var express = require('express');
var router = express.Router();

const {
    ObjectId,
    createMqttClient,
    createMongoDBClient,
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async function (req, res, next) {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('automation');

    let results = await col.find().toArray();

    res.status(200).send({
        scenes: results,
        error: null
    })

});

router.post('/', verifyHeaders, async function(req, res, next) {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('automation');

    await col.insertOne(req.body);

    res.send({
        error: null
    });
});

router.patch('/', verifyHeaders, async function(req, res, next) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('automation');

    await col.updateOne(
        { _id: ObjectId(req.body._id) },
        {
            $set: {
                name: req.body.name,
                color: req.body.color,
                description: req.body.description,
                trigger: req.body.trigger,
                targets: req.body.targets
            }
        }
    );

    res.send({
        error: null
    });
});

router.post('/:id', verifyHeaders, async function(req, res, next) {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('automation');

    let results = await col.find({ _id: ObjectId(req.params.id)}).toArray();

    if (results.length === 0) {
        res.send({
            error: "No corresponding automations"
        });
        return;
    }

    const mqttClient = await createMqttClient();
    for (let i in results[0].targets) {
        await mqttClient.publish('zigbee2mqtt/' + results[0].devices[i].friendly_name + '/set', JSON.stringify(results[0].targets[i].actions));
    }

    await mqttClient.end();
    await client.close();
    res.send({
        error: null
    });
});

router.delete('/', verifyHeaders, async function(req, res) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('automation');

    var objectIds = [];
    for (let i in req.body.ids) {
        objectIds.push(ObjectId(req.body.ids[i]));
    }

    await col.deleteMany({ _id: { $in: objectIds} });
    await client.close();

    res.send({
        error: null
    });
});

module.exports = router;