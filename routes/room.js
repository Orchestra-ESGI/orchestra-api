var express = require('express');
var router = express.Router();

const {
    createMongoDBClient,
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async function(req, res, next) {
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
});

router.post('/', verifyHeaders, async function(req, res, next) {
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
});

module.exports = router;