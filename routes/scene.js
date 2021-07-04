var express = require('express');
var router = express.Router();

const {
    ObjectId,
    mqttClient,
    client,
    sendNotification,
    connectMongoClient
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {

    try {
        await connectMongoClient();
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
});

router.post('/', verifyHeaders, async (req, res) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('scene');
    
        var body = req.body;
        body.background_color = "#41464D";
        await col.insertOne(body);

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.patch('/', verifyHeaders, async (req, res) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('scene');

        await col.updateOne(
            { _id: ObjectId(req.body._id) },
            {
                $set: {
                    name: req.body.name,
                    description: req.body.description,
                    notify: req.body.notify,
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
});

router.post('/:id', verifyHeaders, async (req, res) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('scene');

        let results = await col.find({ _id: ObjectId(req.params.id)}).toArray();

        if (results.length === 0) {
            res.send({
                error: "No corresponding scenes"
            });
            return;
        }

        for (let i in results[0].devices) {
            await mqttClient.publish('zigbee2mqtt/' + results[0].devices[i].friendly_name + '/set', JSON.stringify(results[0].devices[i].actions));
        }

        if (results[0].notify) {
            await sendNotification("Uh oh", results[0].name + " has been launched");
        }

        res.send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.delete('/', verifyHeaders, async (req, res) => {

    try {
        await connectMongoClient();
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
});

module.exports = router;