#!/bin/bash
sudo git reset --hard HEAD
if [ $1 = false ]; then
    sudo git fetch
    sudo git status > 'update.txt'
    exit 1
fi

sudo git pull
sudo npm install
sudo systemctl restart orchestra.service

echo "Update done!"