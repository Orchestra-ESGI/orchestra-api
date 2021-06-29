var express = require('express');
var router = express.Router();

const {
    createMongoDBClient,
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {
    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('room');
    
        let rooms = await col.find({}).toArray();
        res.status(200).send({
            rooms,
            error: null
        })
    } catch (err) {
        res.status(500).send({
            error: err
        });
    }

    await client.close();
});

router.post('/', verifyHeaders, async (req, res) => {
    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('room');

        await col.insertOne(req.body);

        res.status(200).send({
            error: null
        })
    } catch (err) {
        res.status(500).send({
            error: err
        });
    }

    await client.close();
});

module.exports = router;