var express = require('express');
var router = express.Router();
const { 
    MONGODBURL,
    MongoClient
} = require("../config");

/* RÉCUPERATION DE TOUT LES USERS */
router.get('/all', async function(req, res, next) {
    const client = new MongoClient(MONGODBURL, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db("orchestra");
    const col = db.collection('user');

    let results = await col.find({}).project({ password: 0 }).toArray();

    res.send({
        results,
        error: null
    });
});

module.exports = router;