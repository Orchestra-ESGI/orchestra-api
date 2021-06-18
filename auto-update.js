const { fs } = require('./config');
const shell = require('shelljs');

function launchUpdate(update) {
    shell.exec('sudo sh /orchestra-api/update.sh ' + update);
}

setInterval(
    async function() {
        var needsUpdate = false;
        launchUpdate(needsUpdate);
        const file = fs.readFileSync('/orchestra-api/update.txt', 'utf8');
        var splittedFile = file.split('\n');
        if (!splittedFile[1].includes('is up to date')) {
            needsUpdate = true;
            launchUpdate(needsUpdate);
        }
    }, 60000);