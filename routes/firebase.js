var express = require('express');
var router = express.Router();

const {
    client,
    connectMongoClient
} = require('../config');

const { verifyHeaders } = require('../middleware/token_verification');

router.get('/all', verifyHeaders, async (req, res) => {
    try {
        await connectMongoClient();
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

router.post('/', verifyHeaders, async (req, res) => {
    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('fcm');

        const result = await col.find({ user_id: req.token._id }).toArray();
        if (result.length == 0) {
            await col.insertOne(req.body);
        } else {
            await col.updateOne({ user_id: req.token._id }, req.body);
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

router.delete('/clear', verifyHeaders, async (req, res) => {
    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('fcm');
        await col.deleteMany({});

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