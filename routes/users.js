var express = require('express');
var router = express.Router();
const { 
    createMongoDBClient
} = require("../config");

/* RÉCUPERATION DE TOUT LES USERS */
router.get('/all', async function(req, res, next) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('user');

    let results = await col.find({}).project({ password: 0 }).toArray();

    await client.close();
    res.send({
        results,
        error: null
    });
});

module.exports = router;