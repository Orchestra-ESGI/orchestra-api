const { JWT_KEY } = require('../config');
const { APP_KEY } = require('../config');
const { jwt } = require('../config');

function verifyHeaders(req, res, next) {
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
                        req.token = data;
                        next();
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