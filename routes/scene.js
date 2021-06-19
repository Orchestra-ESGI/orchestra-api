var express = require('express');
var router = express.Router();

const {
    ObjectId,
    createMqttClient,
    createMongoDBClient,
} = require('../config');

router.get('/all', async function (req, res, next) {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('scene');

    let results = await col.find().toArray();

    res.send({
        scenes: results,
        error: null
    })

});

router.post('/', async function(req, res, next) {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('scene');

    await col.insertOne(req.body);

    res.send({
        error: null
    });
});

router.post('/:id', async function(req, res, next) {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('scene');

    let results = await col.find({ _id: ObjectId(req.params.id)}).toArray();

    if (results.length === 0) {
        res.send({
            error: "No corresponding scenes"
        });
        return;
    }

    const mqttClient = await createMqttClient();
    for (let i in results[0].devices) {
        await mqttClient.publish('zigbee2mqtt/' + results[0].devices[i].friendly_name + '/set', JSON.stringify(results[0].devices[i].actions));
    }

    await mqttClient.end();
    await client.close();
    res.send({
        error: null
    });
});

router.delete('/', async function(req, res) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('scene');

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