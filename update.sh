#!/bin/bash
sudo git reset --hard HEAD
if [ $1 = false ]; then
    sudo git fetch
    sudo git status > 'update.txt'
    exit 1
fi

sudo chmod 777 /orchestra-api/pull.sh
sudo sh /orchestra-api/pull.sh
