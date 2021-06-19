var express = require('express');
var router = express.Router();
const validator = require('validator');
const {
    createMongoDBClient,
    JWT_KEY,
    jwt
} = require("../config");

/* RÉCUPERATION DE TOUT LES USERS */
router.get('/all', async function (req, res, next) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('user');

    let results = await col.find({}).project({ password: 0 }).toArray();

    await client.close();
    res.send({
        results,
        error: null
    });
});

router.post('/signup', async (req, res, next) => {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection("user");

    //INSERT ONE DOCUMENT
    let data = await col.find({}).toArray();
    if (!validator.isEmail(req.body.email)) {
        res.status(400).send({error: 'Email invalide'});
    } else if (req.body.password.length < 5) {
        res.status(400).send({error: 'Le mot de passe doit contenir au moins 5 caractères'});
    } else if (data.some(data => data.email === req.body.email)) {
        res.status(400).send({error: 'Cet email est déjà associé à un compte'});
    } else {
        await col.insertOne({
            email: req.body.email,
            password: req.body.password,
            is_verified: true
        });

        res.status(200).send({
            error: null
        })
    }
    await client.close();
});


router.post('/login', async (req, res, next) => {

    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection("user");

    var result = await col.find({ email: req.body.email, password: req.body.password, is_verified: true }).toArray();
    if (result.length) {
        jwt.sign({
            _id: result[0]._id,
            email: result[0].email
        }, JWT_KEY, { expiresIn: '15d' }, (err, token) => {
            if (err) {
                res.send({ error: 'error' });
            } else {
                res.send({
                    token,
                    error: null
                });
            }
        });
    } else {
        res.status(403).send({
            error: 'Cet identifiant ou mot de passe est inconnu'
        });
    }

    await client.close();
});

module.exports = router;