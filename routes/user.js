var express = require('express');
var router = express.Router();
const validator = require('validator');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const {
    client,
    JWT_KEY,
    jwt,
    transporter,
    ObjectId,
    connectMongoClient
} = require("../config");

const { verifyHeaders } = require('../middleware/token_verification');

/* RÉCUPERATION DE TOUT LES USERS */
router.get('/all', verifyHeaders, async function (req, res, next) {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection('user');
    
        let results = await col.find({}).project({ password: 0 }).toArray();
        
        res.send({
            results,
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.post('/signup', async (req, res, next) => {

    try {
        await connectMongoClient();
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
    
            var result = await col.insertOne({
                email: req.body.email,
                password: bcrypt.hashSync(req.body.password, saltRounds),
                is_verified: false
            });
    
            jwt.sign({
                _id: result.ops[0]._id,
                email: result.ops[0].email,
                is_verified: result.ops[0].is_verified
            }, JWT_KEY, { expiresIn: '1h' }, (err, token) => {
                if (err) {
                    res.send({ error: 'error' });
                } else {
                    var html = '<h1>Orchestra validation</h1> To verify your account, <a href="http://orchestra.local:3000/user/redirect?to=verify&token=' + token + '&id='+ result.ops[0]._id + '">click here</a><br><i>Attention ce lien n\'est disponible qu\'une heure</i>';
                    
                    var mailOptions = {
                        from: 'orchestra.nrv.dev@gmail.com',
                        to: req.body.email,
                        subject: '[Orchestra] Verify your email',
                        html
                      };
                      
                      transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                            res.status(200).send({
                                error
                            });
                        } else {
                            res.status(200).send({
                                error: null
                            });
                        }
                      });
                }
            });
        }
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});


router.post('/login', async (req, res, next) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection("user");

        var result = await col.find({ email: req.body.email, is_verified: true }).toArray();
        if (result.length && result.length !== 0 && bcrypt.compareSync(req.body.password, result[0].password)) {
            jwt.sign({
                _id: result[0]._id,
                email: result[0].email,
                is_verified: result[0].is_verified
            }, JWT_KEY, { expiresIn: '15d' }, (err, token) => {
                if (err) {
                    res.send({ error: 'error' });
                } else {
                    res.send({
                        token,
                        email: result[0].email,
                        error: null
                    });
                }
            });
        } else {
            res.status(403).send({
                error: 'Cet identifiant ou mot de passe est inconnu'
            });
        }
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.get('/verify', async (req, res, next) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection("user");

        if (req.query.token && req.query.id) {
            jwt.verify(req.query.token, JWT_KEY, async (err, data) => {
                if (err) {
                    await col.deleteOne(
                        { _id: ObjectId(req.query.id) }
                    );
                    res.render('verify', { title: 'Verify', validate: 'Le lien a expiré ! Merci de vous réinscrire !', status: false});
                } else {
                    await col.updateOne(
                        { _id: ObjectId(data._id) },
                        {
                            $set: {
                                is_verified: true
                            }
                        }
                    );
                    res.render('verify', { title: 'Verify', validate: 'Votre compte a été validé', status: true});
                }
            });
        } else {
            res.render('verify', { title: 'Verify', validate: 'Aucun token d\'authentification n\'a été fourni', status: false});
        }
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.delete('/', async (req, res, next) => {

    try {
        await connectMongoClient();
        const col = client.db("orchestra").collection("user");
        const fcmCol = client.db("orchestra").collection("fcm");
        var user = await col.find({ email: req.body.email }).toArray();
        if (user.length !== 0) {
            await fcmCol.deleteMany({ user_id: user[0]._id });
        }
        await col.deleteOne({ email: req.body.email });

        res.status(200).send({
            error: null
        });
    } catch (error) {
        res.status(500).send({
            error
        });
    }
});

router.get('/redirect', async (req, res, next) => {
    res.redirect('/user/'+ req.query.to + '?token=' + req.query.token + '&id=' + req.query.id);
});

module.exports = router;