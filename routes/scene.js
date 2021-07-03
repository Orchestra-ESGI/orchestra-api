var express = require('express');
var router = express.Router();

const {
    ObjectId,
    createMqttClient,
    createMongoDBClient,
    admin
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {

    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');
    
        let results = await col.find().toArray();
        await client.close();
        
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
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');
    
        await col.insertOne(req.body);
        await client.close();

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
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('scene');

        await col.updateOne(
            { _id: ObjectId(req.body._id) },
            {
                $set: {
                    name: req.body.name,
                    color: req.body.color,
                    description: req.body.description,
                    notify: req.body.notify,
                    devices: req.body.devices
                }
            }
        );

        await client.close();
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

        if (results[0].notify) {
            const tokens = await client.db("orchestra").collection("fcm").find().toArray();
            const registratedTokens = tokens.map(elem => elem.token);
            const message = {
                notification: {
                    title: "Uh oh",
                    body: results[0].name + " has been launched"
                }
            };
            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24
              };

            admin.messaging().sendToDevice(registratedTokens, message, options).then( response => {
                console.log("Notification sent successfully");
            }).catch( error => {
                console.log(error);
            });
        }

        await mqttClient.end();
        await client.close();

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
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

module.exports = router;