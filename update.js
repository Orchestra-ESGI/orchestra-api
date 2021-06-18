const AutoGitUpdate = require('auto-git-update');

const config = {
    repository: 'https://github.com/Orchestra-ESGI/orchestra-api',
    tempLocation: '/tmp/',
    branch: 'develop',
    token: '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',
    executeOnComplete: 'cd /orchestra-api && sudo npm start',
    exitOnComplete: true
}

const updater = new AutoGitUpdate(config);

updater.autoUpdate();