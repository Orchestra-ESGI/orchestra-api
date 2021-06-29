var express = require('express');
var router = express.Router();

const {
    ObjectId,
    createMqttClient,
    createMongoDBClient,
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {

    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');
    
        let results = await col.find().toArray();
    
        res.send({
            scenes: results,
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }

    await client.close();
});

router.post('/', verifyHeaders, async (req, res) => {

    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');
    
        await col.insertOne(req.body);
    
        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }

    await client.close();
});

router.patch('/', verifyHeaders, async (req, res) => {

    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');

        await col.updateOne(
            { _id: ObjectId(req.body._id) },
            {
                $set: {
                    name: req.body.name,
                    color: req.body.color,
                    description: req.body.description,
                    devices: req.body.devices
                }
            }
        );

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }

    await client.close();
});

router.post('/:id', verifyHeaders, async (req, res) => {

    try {
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

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }

    await mqttClient.end();
    await client.close();
});

router.delete('/', verifyHeaders, async (req, res) => {

    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');
    
        var objectIds = [];
        for (let i in req.body.ids) {
            objectIds.push(ObjectId(req.body.ids[i]));
        }
    
        await col.deleteMany({ _id: { $in: objectIds} });
    
        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }

    await client.close();
});

module.exports = router;