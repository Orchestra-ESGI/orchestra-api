#!/bin/bash
if [ "$1" = false]; then
    sudo git fetch
    sudo git status > 'update.txt'
    exit 1
fi

sudo systemctl stop orchestra
sudo git pull
sudo npm install

sudo systemctl start orchestra

echo "Update done!"