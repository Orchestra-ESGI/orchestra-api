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
        const col = client.db("orchestra").collection('automation');
    
        let results = await col.find().toArray();

        await client.close();
        res.status(200).send({
            automations: results,
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
        const mqttClient = await createMqttClient();
        const col = client.db("orchestra").collection('automation');
    
        await col.insertOne(req.body);
    
        await mqttClient.subscribe('zigbee2mqtt/' + req.body.trigger.friendly_name);

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

router.patch('/', verifyHeaders, async (req, res) => {

    try {
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
        const col = client.db("orchestra").collection('automation');
    
        let results = await col.find({ _id: ObjectId(req.params.id) }).toArray();
    
        if (results.length === 0) {
            res.send({
                error: "No corresponding automations"
            });
            return;
        }
    
        const mqttClient = await createMqttClient();
        for (let i in results[0].targets) {
            await mqttClient.publish('zigbee2mqtt/' + results[0].targets[i].friendly_name + '/set', JSON.stringify(results[0].targets[i].actions));
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
        const mqttClient = await createMqttClient();
        const col = client.db("orchestra").collection('automation');
    
        var objectIds = [];
        for (let i in req.body.ids) {
            var newObjectId = ObjectId(req.body.ids[i]);
            objectIds.push(newObjectId);
            let res = await col.find({ _id: newObjectId }).toArray();
            if (res.length != 0) {
                await mqttClient.unsubscribe('zigbee2mqtt/' + res[0].trigger.friendly_name);
            }
        }
    
        await col.deleteMany({ _id: { $in: objectIds} });
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

module.exports = router;