const { 
    JWT_KEY,
    APP_KEY,
    jwt,
    ObjectId,
    createMongoDBClient
} = require('../config');

function verifyHeaders(req, res, next) {
    const client = await createMongoDBClient();
    const col = client.db("orchestra").collection('user');

    var appKey = req.get('App-Key');
    const bearerHeader = req.headers.authorization;

    if (appKey === undefined || appKey !== APP_KEY) {
        res.status(401).send({ error: 'Wrong app key' });
    } else {
        if (bearerHeader !== undefined) {
            const bearer = bearerHeader.split(' ');
            const bearerToken = bearer[1];
            jwt.verify(bearerToken, JWT_KEY, async (err, data) => {
                if (err) {
                    res.status(401).send({ error: 'Utilisateur non connecté' });
                } else {
                    if (data.is_verified) {
                        let res = await col.find({ _id: ObjectId(data._id) }).toArray();
                        if (res.length == 0) {
                            res.status(401).send( { error: 'Le token n\'est plus valable' });
                        } else {
                            req.token = data;
                            next();
                        }
                    } else {
                        res.status(401).send( { error: 'Utilisateur non vérifié' });
                    }
                }
            });
        } else {
            res.status(401).send({ error: 'Utilisateur non connecté' });
        }
    }
}

module.exports = {
    verifyHeaders
};