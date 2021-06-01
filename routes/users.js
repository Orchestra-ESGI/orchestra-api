var express = require('express');
var router = express.Router();

/* RÉCUPERATION DE TOUT LES USERS */
router.get('/all', function(req, res, next) {
    let users = [
        {
            "email": "nassim@gmail.com",
            "name": "Nassim"
        },
        {
            "email": "vithu@gmail.com",
            "name": "Vithursan"
        },
        {
            "email": "ramzy@gmail.com",
            "name": "Ramzy"
        },
    ]
    res.send({
        users,
        error: null
    });
});

module.exports = router;
