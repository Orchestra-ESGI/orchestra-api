const { ObjectID } = require('bson');
var express = require('express');
var router = express.Router();
const { 
    MONGODBURL,
    MongoClient
} = require("../config");

const { createMqttClient } = require('../config');

router.get('/all', async function (req, res, next) {

    const client = new MongoClient(MONGODBURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db("orchestra");
    const col = db.collection('scene');

    let results = await col.find().toArray();

    res.send({
        scenes: results,
        error: null
    })

});

router.post('/', async function(req, res, next) {

    const client = new MongoClient(MONGODBURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db("orchestra");
    const col = db.collection('scene');

    await col.insertOne(req.body);

    res.send({
        error: null
    });
});

router.post('/:id', async function(req, res, next) {

    const client = new MongoClient(MONGODBURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db("orchestra");
    const col = db.collection('scene');

    let results = await col.find({ _id: ObjectID(req.params.id)}).toArray();

    if (results.length === 0) {
        res.send({
            error: "No corresponding scenes"
        });
        return;
    }

    let mqttClient = await createMqttClient();
    for (let i in results[0].devices) {
        await mqttClient.publish('zigbee2mqtt/' + results[0].devices[i].friendly_name + '/set', JSON.stringify(results[0].devices[i].actions));
    }

    mqttClient.end();
    client.close();
    res.send({
        error: null
    });
});

module.exports = router;