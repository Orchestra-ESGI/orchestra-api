var express = require('express');
var router = express.Router();
const shell = require('shelljs');

router.post('/shutdown', async (res) => {
    shell.exec('sudo shutdown -h now');
    res.send({
        error: null
    });
});

router.post('/reboot', async (res) => {
    shell.exec('sudo reboot');
    res.send({
        error: null
    });
});

router.post('/factory-reset', async (res) => {
    shell.exec('sudo docker container stop mongod');
    shell.exec('sudo docker container rm mongod');
    shell.exec('sudo rm -rf /data');
    shell.exec('sudo docker run --name mongod -d -v /data/mongo:/data/db -p 27017:27017 arm7/mongo mongod');
    shell.exec('sudo reboot');
    res.send({
        error: null
    });
});

module.exports = router;