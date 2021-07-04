var express = require('express');
var router = express.Router();

const {
    createMongoDBClient,
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {
    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('fcm');
    
        let fcm_tokens = await col.find({}).toArray();
        
        res.status(200).send({
            fcm_tokens,
            error: null
        })
    } catch (err) {
        res.status(500).send({
            error: err
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const client = await createMongoDBClient();
        const col = client.db("orchestra").collection('fcm');

        const result = await col.find({ token: req.body.token }).toArray();
        if (result.length == 0) {
            await col.insertOne(req.body);
        }

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